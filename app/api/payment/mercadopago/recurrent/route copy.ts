"use server";

import { prisma } from "@/lib/db/index";
import {
  recurrentPaymentSchema,
  type RecurrentPaymentInput,
} from "@/validations/paymentSchema";
import { randomUUID } from "crypto";
import {
  Customer,
  CustomerCard,
  MercadoPagoConfig,
  PreApproval,
} from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

const mpConfig = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 },
});

/**
 * POST - Create recurring payment / subscription
 * POST /api/payment/mercadopago/recurrent
 */
export async function POST(request: Request) {
  try {
    // 1. Parse and validate body
    const body = (await request.json()) as RecurrentPaymentInput;
    const validation = recurrentPaymentSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation failed:", validation.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Datos inválidos",
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // 2. Find prospect by phone
    const phone = data.prospect_phone
      ? data.prospect_phone.replace(/\D/g, "")
      : data.payer_email.split("@")[0];

    const prospect = await prisma.prospects.findFirst({
      where: { phone: { endsWith: phone.slice(2) } },
      take: 1,
    });

    if (!prospect) {
      return NextResponse.json(
        { success: false, error: "Prospecto no encontrado" },
        { status: 400 },
      );
    }

    const prospectId = prospect.id;

    // 3. Find or create customer in MercadoPago
    const customerClient = new Customer(mpConfig);
    let mpCustomerId: string | null = null;

    try {
      const existingCustomers = await customerClient.search({
        options: { email: data.payer_email },
      });

      if (existingCustomers.results && existingCustomers.results.length > 0) {
        mpCustomerId = existingCustomers.results[0].id ?? null;
      }
    } catch {
      // Customer not found, will create new one
    }

    if (!mpCustomerId) {
      const idempotencyKey = randomUUID();
      try {
        const newCustomer = await customerClient.create({
          body: {
            email: data.payer_email,
            first_name: data.payer_first_name,
            last_name: data.payer_last_name,
            identification: {
              type: "CURP",
              number: data.identification_number || prospect.curp,
            },
          },
          requestOptions: { idempotencyKey },
        });
        mpCustomerId = newCustomer.id ?? null;
      } catch (createError) {
        console.error("Error creating MP customer:", createError);
        // Continue without customer ID
      }
    }

    // 4. Save card to customer (optional)
    let mpCardId: string | null = null;
    if (mpCustomerId) {
      try {
        const cardClient = new CustomerCard(mpConfig);
        const cardIdempotencyKey = randomUUID();

        const card = await cardClient.create({
          customerId: mpCustomerId,
          body: { token: data.token },
          requestOptions: { idempotencyKey: cardIdempotencyKey },
        });
        mpCardId = card.id ?? null;
      } catch {
        // Non-blocking
      }
    }

    // 5. Create subscription (Preapproval)
    const preapprovalClient = new PreApproval(mpConfig);
    const preapprovalIdempotencyKey = randomUUID();

    const startDate = new Date();
    const nextBillingDate = calculateNextBillingDate(
      startDate,
      data.recurrence_interval,
    );
    const frequencyType = mapRecurrenceToMP(data.recurrence_interval);
    const usePlanAssociation = !!data.mp_preapproval_plan_id;

    let preapprovalData: {
      body: Record<string, unknown>;
      requestOptions: { idempotencyKey: string };
    };

    if (usePlanAssociation) {
      // Subscription with plan
      preapprovalData = {
        body: {
          preapproval_plan_id: data.mp_preapproval_plan_id,
          reason: `Suscripción Station 24 - ${data.description}`,
          external_reference: prospectId,
          payer_email: data.payer_email,
          card_token_id: data.token,
          status: "authorized",
        },
        requestOptions: { idempotencyKey: preapprovalIdempotencyKey },
      };
    } else {
      // Subscription without plan
      preapprovalData = {
        body: {
          reason: `Suscripción Station 24 - ${data.description}`,
          external_reference: data.prospect_phone,
          payer_email: data.payer_email,
          card_token_id: data.token,
          auto_recurring: {
            frequency: 1,
            frequency_type: frequencyType,
            start_date: startDate.toISOString(),
            end_date: new Date(
              startDate.getTime() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transaction_amount: Number(data.amount),
            currency_id: data.currency,
          },
          back_url: "https://station24.com.mx/unete",
          status: "authorized",
        },
        requestOptions: { idempotencyKey: preapprovalIdempotencyKey },
      };
    }

    const preapproval = await preapprovalClient.create(preapprovalData);

    // 6. Save subscription to database
    const subscriptionId = randomUUID();
    const now = new Date();

    await prisma.subscriptions.create({
      data: {
        id: subscriptionId,
        prospectId: prospectId,
        planId: data.plan_id,
        planDescription: data.description,
        mpCustomerId: mpCustomerId,
        mpCardId: mpCardId,
        mpPreapprovalId: preapproval.id ?? null,
        mpPreapprovalPlanId: data.mp_preapproval_plan_id ?? null,
        recurrenceInterval: data.recurrence_interval,
        transactionAmount: Math.round(Number(data.amount) * 100),
        currencyId: data.currency,
        startDate: now,
        nextBillingDate: nextBillingDate,
        status: mapPreapprovalStatus(preapproval.status),
        payerEmail: data.payer_email,
        payerFirstName: data.payer_first_name,
        payerLastName: data.payer_last_name,
        externalReference: prospectId,
        description: data.description,
      },
    });

    // 7. Update prospect if subscription is authorized
    if (
      preapproval.status === "authorized" ||
      preapproval.status === "active"
    ) {
      await prisma.prospects.update({
        where: { id: prospectId },
        data: { paymentPending: false },
      });
    }

    // 8. Response
    const isPending =
      preapproval.status === "pending" || preapproval.status === "paused";
    const isRejected =
      preapproval.status === "cancelled" ||
      preapproval.status === "expired" ||
      preapproval.status === "rejected";

    if (isPending) {
      return NextResponse.json({
        success: true,
        pending: true,
        preapproval_id: preapproval.id,
        status: preapproval.status,
        next_billing_date: preapproval.next_payment_date,
        subscription_id: subscriptionId,
        status_detail: "Suscripción pendiente de activación",
      });
    }

    if (isRejected) {
      return NextResponse.json({
        success: false,
        rejected: true,
        error: getPreapprovalErrorMessage(preapproval.status),
        status: preapproval.status,
        subscription_id: subscriptionId,
      });
    }

    // Success
    return NextResponse.json({
      success: true,
      preapproval_id: preapproval.id,
      status: preapproval.status,
      next_billing_date: preapproval.next_payment_date,
      subscription_id: subscriptionId,
    });
  } catch (error) {
    console.error("=== ERROR IN RECURRENT PAYMENT ===");
    console.error(error);

    const mpError = parseMPError(error);
    return NextResponse.json(
      { success: false, error: mpError },
      { status: 400 },
    );
  }
}

/**
 * GET - Get subscription status
 * GET /api/payment/mercadopago/recurrent?preapproval_id=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preapprovalId = searchParams.get("preapproval_id");

    if (!preapprovalId) {
      return NextResponse.json(
        { error: "Se requiere preapproval_id" },
        { status: 400 },
      );
    }

    const preapprovalClient = new PreApproval(mpConfig);
    const preapproval = await preapprovalClient.get({ id: preapprovalId });

    return NextResponse.json({
      preapproval_id: preapproval.id,
      status: preapproval.status,
      next_payment_date: preapproval.next_payment_date,
      transaction_amount: preapproval.auto_recurring?.transaction_amount,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Error consultando suscripción" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Cancel subscription
 * DELETE /api/payment/mercadopago/recurrent?preapproval_id=xxx&subscription_id=xxx
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preapprovalId = searchParams.get("preapproval_id");
    const subscriptionId = searchParams.get("subscription_id");

    if (!preapprovalId) {
      return NextResponse.json(
        { error: "Se requiere preapproval_id" },
        { status: 400 },
      );
    }

    // Cancel in MercadoPago
    const preapprovalClient = new PreApproval(mpConfig);
    await preapprovalClient.update({
      id: preapprovalId,
      body: { status: "cancelled" },
    });

    // Update in database
    if (subscriptionId) {
      await prisma.subscriptions.update({
        where: { id: subscriptionId },
        data: { status: "cancelled" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción cancelada",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Error cancelando suscripción" },
      { status: 500 },
    );
  }
}

// ============ HELPERS ============

function calculateNextBillingDate(startDate: Date, interval: string): Date {
  const next = new Date(startDate);

  switch (interval) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "bimonthly":
      next.setMonth(next.getMonth() + 2);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}

function mapRecurrenceToMP(interval: string): string {
  const mapping: Record<string, string> = {
    weekly: "weeks",
    monthly: "months",
    bimonthly: "months",
    yearly: "years",
  };
  return mapping[interval] || "months";
}

function mapPreapprovalStatus(mpStatus: string | undefined): string {
  const mapping: Record<string, string> = {
    authorized: "active",
    active: "active",
    pending: "paused",
    paused: "paused",
    cancelled: "cancelled",
    expired: "expired",
    rejected: "rejected",
  };
  return mapping[mpStatus || ""] || "pending";
}

function getPreapprovalErrorMessage(status: string | undefined): string {
  const messages: Record<string, string> = {
    cancelled: "Suscripción cancelada",
    expired: "Suscripción expirada",
    rejected: "Suscripción rechazada",
  };
  return messages[status || ""] || "Error en la suscripción";
}

function parseMPError(error: unknown): string {
  if (error instanceof Error) {
    // Try to parse MP error response
    const cause = (
      error as unknown as {
        cause?: {
          code?: string;
          description?: string;
          body?: { message?: string };
        };
      }
    ).cause;

    if (cause?.code === "invalid_token") {
      return "Token de tarjeta inválido o expirado";
    }
    if (cause?.description?.includes("insufficient_funds")) {
      return "Fondos insuficientes en la tarjeta";
    }
    if (cause?.description?.includes("card_rejected")) {
      return "Tarjeta rechazada por el banco";
    }
    return cause?.body?.message || error.message;
  }

  return "Error al procesar la suscripción";
}

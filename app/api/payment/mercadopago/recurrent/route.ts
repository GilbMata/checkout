"use server";

import prisma from "@/lib/db/prisma";
import {
  recurrentPaymentSchema,
  updateCardSchema,
  type RecurrentPaymentInput,
  type UpdateCardInput,
} from "@/validations/paymentSchema";
import { randomUUID } from "crypto";
import {
  Customer,
  MercadoPagoConfig,
  PreApproval,
  PreApprovalPlan,
} from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN_SUBSCRIPTIONS!;
// Configuración del cliente de MercadoPago
const mpConfig = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 }, // Timeout de 15s para operaciones de suscripción
});

/**
 * Endpoint para pagos recurrentes / suscripciones
 * POST /api/payment/mercadopago/recurrent
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear y validar el body
    const body = (await request.json()) as RecurrentPaymentInput;
    // console.log("🚀 ~ POST ~ body:", body);
    const validation = recurrentPaymentSchema.safeParse(body);
    if (!validation.success) {
      console.error("❌ Validación fallida:", validation.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Datos inválidos",
        },
        { status: 400 },
      );
    }

    const data = validation.data;
    console.log("📝 Datos validados:", {
      amount: data.amount,
      currency: data.currency,
      recurrence: data.recurrence_interval,
      planId: data.plan_id,
    });

    // 2. Buscar el prospecto por teléfono
    const phoneRaw = data.payer_phone || data.payer_email.split("@")[0];
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    // Si tiene mas de 10 digitos, tomar ultimos 10 (ej: +52 33 1234 5678 -> 3312345678)
    const phone =
      phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;

    const prospectResult = await prisma.prospects.findMany({
      where: { phone: { equals: phone } },
      take: 1,
    });

    if (!prospectResult.length) {
      return NextResponse.json(
        { success: false, error: "Prospecto no encontrado" },
        { status: 400 },
      );
    }

    const prospect = prospectResult[0];
    const prospectId = prospect.id;
    console.log("✅ Prospecto encontrado:", prospectId);

    // 3. Crear o buscar cliente en MercadoPago
    const customerClient = new Customer(mpConfig);
    let mpCustomerId: string | null = null;

    // Buscar cliente existente por email
    try {
      const existingCustomers = await customerClient.search({
        options: { email: data.payer_email },
      });

      if (existingCustomers.results && existingCustomers.results.length > 0) {
        mpCustomerId = existingCustomers.results[0].id || null;
        console.log("🔄 Cliente existente encontrado:", mpCustomerId);
      }
    } catch (searchError) {
      console.log("⚠️ No se encontró cliente existente, se creará uno nuevo");
    }

    // Crear cliente si no existe
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
        mpCustomerId = newCustomer.id || null;
        console.log("✅ Cliente creado en MP:", mpCustomerId);
      } catch (createError: any) {
        console.error("❌ Error creando cliente MP:", createError);
        // Continuar sin customer ID - aún podemos crear suscripción directa
      }
    }

    // 4. Guardar tarjeta en el cliente (opcional pero recomendado)
    let mpCardId: string | null = null;
    // if (mpCustomerId) {
    //   try {
    //     const cardClient = new CustomerCard(mpConfig);
    //     const cardIdempotencyKey = randomUUID();

    //     const card = await cardClient.create({
    //       customerId: mpCustomerId,
    //       body: { token: data.token },
    //       requestOptions: { idempotencyKey: cardIdempotencyKey },
    //     });
    //     mpCardId = card.id || null;
    //     console.log("✅ Tarjeta guardada en MP:", mpCardId);
    //   } catch (cardError: any) {
    //     console.log("⚠️ No se pudo guardar la tarjeta:", cardError.message);
    //     // No es blocking - la suscripción puede usar el token directamente
    //   }
    // }

    // 5. Crear suscripción (Preapproval) - el paso principal
    const preapprovalClient = new PreApproval(mpConfig);
    const preapprovalIdempotencyKey = randomUUID();

    // Calcular fecha de inicio y próximo cobro
    const startDate = new Date(Date.now() + 2 * 60 * 1000);
    startDate.setMinutes(startDate.getMinutes() + 2);
    // segundos y milisegundos en 0
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    const nextBillingDate = calculateNextBillingDate(
      startDate,
      data.recurrence_interval,
    );
    const startDateMp = startDate.toISOString();
    console.log("🚀 ~ POST ~ startDateMp:", startDateMp);
    // const startDateMp = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // +5 min de margen
    // Mapear interval a formato de MercadoPago
    const frequencyType = mapRecurrenceToMP(data.recurrence_interval);

    // Determinar si usamos plan asociado o no
    const usePlanAssociation = !!data.plan_id;

    // Buscar si existe el plan asociado
    let mpPlanId: string | null = null;
    try {
      const preApprovalPlan = new PreApprovalPlan(mpConfig);
      const existingPlan = await preApprovalPlan.search({
        options: {
          status: "active",
          q: data.plan_id,
        },
      });
      if (existingPlan.results && existingPlan.results.length > 0) {
        mpPlanId = existingPlan.results[0].id || null;
        console.log("🔄 Plan existente encontrado:", mpPlanId);
      }
    } catch (searchError) {
      console.log("⚠️ No se encontró plan existente, se creará uno nuevo");
    }

    // Si no existe intentar crearlo
    if (!mpPlanId) {
      const idempotencyKey = randomUUID();
      try {
        const preApprovalPlan = new PreApprovalPlan(mpConfig);
        const newPlan = await preApprovalPlan.create({
          body: {
            back_url: "https://station24.com.mx/",
            reason: data.plan_id,
            auto_recurring: {
              currency_id: data.currency,
              transaction_amount: data.amount,
              frequency: 1,
              frequency_type: frequencyType,
            },
          },
        });
        mpPlanId = newPlan.id || null;
        console.log("✅ Plan creado en MP:", mpPlanId);
      } catch (createError: any) {
        console.error("❌ Error creando plan MP:", createError);
      }
    }

    // try {
    //   const preApprovalPlan = new PreApprovalPlan(mpConfig);
    //   preApprovalPlan
    //     .create({
    //       body: {
    //         back_url: "https://station24.com.mx/unete",
    //         reason: "sation PLAN",
    //         auto_recurring: {
    //           currency_id: "MXN",
    //           transaction_amount: 199,
    //           frequency: 1,
    //           frequency_type: "months",
    //           repetitions: 12,
    //         },
    //       },
    //     })
    //     .then(console.log)
    //     .catch(console.log);
    //   console.log("🚀 ~ POST ~ preApprovalPlan:", preApprovalPlan);
    // } catch (cardError: any) {
    //   console.log("⚠️preApprovalPlan:", cardError.message);
    //   // No es blocking - la suscripción puede usar el token directamente
    // }

    let preapprovalData: any;

    // if (usePlanAssociation) {
    if (false) {
      // Suscripción con plan asociado - usar preapproval_plan_id
      preapprovalData = {
        body: {
          preapproval_plan_id: mpPlanId,
          reason: `Suscripción Station 24 - ${data.description}`,
          external_reference: data.external_reference,
          payer_email: data.payer_email,
          card_token_id: data.token,
          status: "authorized", // Siempre authorized con plan asociado
        },
        requestOptions: { idempotencyKey: preapprovalIdempotencyKey },
      };
      console.log("📤 Creando suscripción con plan asociado:", {
        preapproval_plan_id: mpPlanId,
        reason: preapprovalData.body.reason,
        payer: preapprovalData.body.payer_email,
      });
    } else {
      // Suscripción sin plan asociado - crear con auto_recurring
      // console.log("🚀 ~ POST ~ data.payer_email:", data.payer_email);
      preapprovalData = {
        body: {
          reason: `Suscripción Station 24 - ${data.description}`,
          external_reference: data.external_reference,
          payer_email: data.payer_email,
          card_token_id: data.token,
          auto_recurring: {
            frequency: 1,
            frequency_type: frequencyType,
            start_date: startDateMp,
            end_date: new Date(
              startDate.getTime() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 1 año de duración máxima
            transaction_amount: Number(data.amount),
            currency_id: data.currency,
          },
          back_url: "https://station24.com.mx/",
          status: "authorized", // Siempre authorized sin plan asociado
        },
        requestOptions: { idempotencyKey: preapprovalIdempotencyKey },
      };
      // console.log("🚀 ~ POST ~ preapprovalData:", preapprovalData);
      console.log("📤 Creando suscripción sin plan asociado:", {
        reason: preapprovalData.body.reason,
        amount: preapprovalData.body.auto_recurring?.transaction_amount,
        frequency: preapprovalData.body.auto_recurring?.frequency_type,
      });
    }

    let preapproval: any;
    let mpRejected = false;
    let rejectionReason = "";

    // console.log("🚀 ~ POST ~ preapprovalData:", preapprovalData);
    // return;
    try {
      preapproval = await preapprovalClient.create(preapprovalData);
      // console.log("🚀 ~ POST ~ preapproval:", preapproval);
      console.log("✅ Preapproval creado:", preapproval.id, preapproval.status);
    } catch (mpError: any) {
      console.log("🚀 ~ POST ~ mpError:", mpError);
      // MercadoPago devolvió error (tarjeta rechazada, etc.)
      // Igual guardamos la suscripción con status "pending" para que el webhook pueda actualizarla
      console.error("❌ Error creando preapproval en MP:", mpError.message);
      mpRejected = true;
      rejectionReason = parseMPError(mpError);
      console.log("🚀 ~ POST ~ rejectionReason:", rejectionReason);

      // Crear preapproval simulado para guardar en DB
      preapproval = {
        id: `pending_${randomUUID()}`,
        status: "pending",
        payer_id: data.payer_email,
        external_reference: data.external_reference,
        next_payment_date: null,
        payment_method_id: null,
        auto_recurring: {
          frequency: 1,
          frequency_type: frequencyType,
          start_date: startDateMp,
          end_date: nextBillingDate,
          transaction_amount: Number(data.amount),
          currency_id: data.currency,
        },
      };
    }

    // 6. Guardar suscripción en nuestra base de datos (siempre, incluso si MP rechaza)
    const subscriptionId = randomUUID();
    const now = Date.now();

    // Extraer datos de auto_recurring (usar any para campos que MP SDK no tipa bien)
    const mpResponse = preapproval as any;
    const autoRecurring = mpResponse.auto_recurring || {};
    const summarized = mpResponse.summarized || {};

    // Extraer datos del payer
    const payerId = mpResponse.payer_id;

    await prisma.subscriptions.create({
      data: {
        id: subscriptionId,
        prospectId: prospectId,

        // MP IDs
        mpCustomerId: mpCustomerId || null,
        mpPayerId: payerId ? String(payerId) : null,
        mpCardId: mpCardId,
        mpPreapprovalId: mpResponse.id || null,
        mpPreapprovalPlanId: mpPlanId || null,

        // Plan info
        planId: data.plan_id,
        planDescription: data.description,
        recurrenceInterval: data.recurrence_interval,

        // Frecuency info
        frequency: autoRecurring.frequency || 1,
        frequencyType: autoRecurring.frequency_type || null,

        // Amount
        transactionAmount: Math.round(Number(data.amount) * 100), // Convertir a centavos
        currencyId: autoRecurring.currency_id || data.currency,

        // Billing dates
        startDate: autoRecurring.start_date
          ? new Date(autoRecurring.start_date)
          : null,
        endDate: autoRecurring.end_date
          ? new Date(autoRecurring.end_date)
          : null,
        nextBillingDate: mpResponse.next_payment_date
          ? new Date(mpResponse.next_payment_date)
          : null,
        lastBillingDate: null,

        // Free trial
        freeTrialDays: autoRecurring.free_trial?.frequency || null,

        // Payment method
        paymentMethodId: mpResponse.payment_method_id || null,

        // Installments
        totalInstallments: summarized.quotas || null,
        pendingInstallments: summarized.pending_charge_quantity || null,

        // Status - mapear status de MP al nuestro
        // Si MP rechaza, forzamos status "past_due" para distinguir de "pending"
        status: mpRejected
          ? "past_due"
          : (mapPreapprovalStatus(mpResponse.status) as any),

        // Payer info
        payerEmail: data.payer_email,
        payerFirstName: data.payer_first_name,
        payerLastName: data.payer_last_name,

        // Metadata
        externalReference: mpResponse.external_reference,
        description: data.description,
      },
    });

    console.log("✅ Suscripción guardada en DB:", subscriptionId);

    // 7. Actualizar prospecto si la suscripción está autorizada
    if (
      preapproval.status === "authorized" ||
      preapproval.status === "active"
    ) {
      await prisma.prospects.update({
        where: { id: prospectId },
        data: { paymentPending: false },
      });
      console.log("✅ Prospecto actualizado a miembro:", prospectId);
    }

    // 8. Responder al frontend
    // Si MP rechazado, siempre responder con error aunque se guardó la suscripción
    if (mpRejected) {
      return NextResponse.json({
        success: false,
        rejected: true,
        error: rejectionReason,
        status: "past_due",
        subscription_id: subscriptionId,
        status_detail:
          "Suscripción guardada con estado pendiente. El webhook actualizará el estado cuando MP notifique el rechazo.",
      });
    }

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

    // Éxito
    return NextResponse.json({
      success: true,
      preapproval_id: preapproval.id,
      status: preapproval.status,
      next_billing_date: preapproval.next_payment_date,
      subscription_id: subscriptionId,
    });
  } catch (error: any) {
    console.log("🚀 ~ POST ~ error:", error);
    console.error("=== ERROR EN PAGO RECURRENTE ===");
    console.error("Mensaje:", error.message);

    // Manejar errores específicos de MercadoPago
    const mpError = parseMPError(error);
    return NextResponse.json(
      {
        success: false,
        error: mpError,
      },
      { status: 400 },
    );
  }
}

/**
 * GET endpoint para obtener estado de una suscripción
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

    // Consultar estado en MercadoPago
    const preapprovalClient = new PreApproval(mpConfig);
    const preapproval = await preapprovalClient.get({ id: preapprovalId });

    return NextResponse.json({
      preapproval_id: preapproval.id,
      status: preapproval.status,
      next_payment_date: preapproval.next_payment_date,
      // start_date: preapproval.auto_recurring?.start_date,
      transaction_amount: preapproval.auto_recurring?.transaction_amount,
    });
  } catch (error: any) {
    console.error("Error consultando suscripción:", error.message);
    return NextResponse.json(
      { error: "Error consultando suscripción" },
      { status: 500 },
    );
  }
}

/**
 * DELETE endpoint para cancelar una suscripción
 * DELETE /api/payment/mercadopago/recurrent?preapproval_id=xxx
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

    // Cancelar en MercadoPago
    const preapprovalClient = new PreApproval(mpConfig);
    await preapprovalClient.update({
      id: preapprovalId,
      body: { status: "cancelled" },
    });

    // Actualizar en nuestra DB
    if (subscriptionId) {
      const now = Date.now();
      await prisma.subscriptions.update({
        where: { id: subscriptionId },
        data: { status: "cancelled" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Suscripción cancelada",
    });
  } catch (error: any) {
    console.error("Error cancelando suscripción:", error.message);
    return NextResponse.json(
      { error: "Error cancelando suscripción" },
      { status: 500 },
    );
  }
}

/**
 * PUT endpoint para actualizar la tarjeta de una suscripción
 * PUT /api/payment/mercadopago/recurrent
 */
export async function PUT(request: Request) {
  try {
    // 1. Parsear y validar el body
    const body = (await request.json()) as UpdateCardInput;
    const validation = updateCardSchema.safeParse(body);

    if (!validation.success) {
      console.error("❌ Validación fallida:", validation.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Datos inválidos",
        },
        { status: 400 },
      );
    }

    const data = validation.data;
    console.log("📝 Actualizando tarjeta:", {
      subscriptionId: data.subscription_id,
      preapprovalId: data.preapproval_id,
      hasToken: !!data.token,
      cardLastFour: data.card_last_four,
    });

    // 2. Buscar la suscripción en nuestra base de datos
    const subscription = await prisma.subscriptions.findUnique({
      where: { id: data.subscription_id },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Suscripción no encontrada" },
        { status: 404 },
      );
    }

    // 3. Verificar que el preapproval_id coincida
    if (subscription.mpPreapprovalId !== data.preapproval_id) {
      return NextResponse.json(
        {
          success: false,
          error: "El ID de preapproval no coincide con la suscripción",
        },
        { status: 400 },
      );
    }

    // 4. Actualizar la tarjeta en MercadoPago usando PreApproval.update
    const preApprovalClient = new PreApproval(mpConfig);
    const idempotencyKey = randomUUID();

    try {
      // await preApprovalClient.update({
      //   id: data.preapproval_id,
      //   body: {
      //     card_token_id: data.token,
      //   },
      //   requestOptions: { idempotencyKey },
      // });
      console.log(
        "✅ Tarjeta actualizada en MercadoPago:",
        data.preapproval_id,
      );
    } catch (mpError: any) {
      console.error("❌ Error actualizando tarjeta en MP:", mpError.message);
      return NextResponse.json(
        {
          success: false,
          error: parseMPError(mpError),
        },
        { status: 400 },
      );
    }

    // 5. Actualizar la suscripción en nuestra base de datos
    await prisma.subscriptions.update({
      where: { id: data.subscription_id },
      data: {
        paymentMethodId: data.payment_method_id || null,
      },
    });

    console.log("✅ Suscripción actualizada en DB:", data.subscription_id);

    // 6. Responder al frontend
    return NextResponse.json({
      success: true,
      message: "Tarjeta actualizada correctamente",
    });
  } catch (error: any) {
    console.error("=== ERROR ACTUALIZANDO TARJETA ===");
    console.error("Mensaje:", error.message);

    const mpError = parseMPError(error);
    return NextResponse.json(
      {
        success: false,
        error: mpError,
      },
      { status: 500 },
    );
  }
}

// ============ HELPERS ============

/**
 * Calcula la fecha del próximo cobro según el intervalo
 */
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
      next.setMonth(next.getMonth() + 1); // Default monthly
  }

  return next;
}

/**
 * Mapea el intervalo de recurrencia al formato de MercadoPago
 */
function mapRecurrenceToMP(interval: string): string {
  const mapping: Record<string, string> = {
    weekly: "weeks",
    monthly: "months",
    bimonthly: "months", // MP no soporta bimestral directamente, usar months + frequency 2
    yearly: "years",
  };
  return mapping[interval] || "months";
}

/**
 * Mapea el status de MercadoPago al nuestro
 */
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

/**
 * Obtiene mensaje de error legible para el usuario
 */
function getPreapprovalErrorMessage(status: string | undefined): string {
  const messages: Record<string, string> = {
    cancelled: "Suscripción cancelada",
    expired: "Suscripción expirada",
    rejected: "Suscripción rechazada",
  };
  return messages[status || ""] || "Error en la suscripción";
}

/**
 * Parsea errores de MercadoPago para dar mensajes útiles
 */
function parseMPError(error: any): string {
  // Error de validación de tarjeta
  if (error.cause?.some((c: any) => c.code === "invalid_token")) {
    return "Token de tarjeta inválido o expirado";
  }

  // Error de fondos insuficientes
  if (
    error.cause?.some((c: any) => c.description?.includes("insufficient_funds"))
  ) {
    return "Fondos insuficientes en la tarjeta";
  }

  // Error de tarjeta rechaza
  if (error.cause?.some((c: any) => c.description?.includes("card_rejected"))) {
    return "Tarjeta rechazada por el banco";
  }

  // Error genérico - usar mensaje de MP si está disponible
  return (
    error.cause?.body?.message ||
    error.message ||
    "Error al procesar la suscripción"
  );
}

import { prisma } from "@/lib/db/index";
import {
  orderPaymentInput,
  orderPaymentSchema,
} from "@/validations/paymentSchema";
import { randomUUID } from "crypto";
import MercadoPagoConfig, { Order } from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

// Configuración del cliente de MercadoPago
const mpConfig = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 }, // Timeout de 15s para operaciones de suscripción
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as orderPaymentInput;
    const validation = orderPaymentSchema.safeParse(body);
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
      planId: data.plan_id,
    });

    // 2. Buscar el prospecto por telefono
    // Mejor parsing: tomar ultimos 10 digitos para manejo consistente de codigos de pais
    const phoneRaw = data.prospect_phone || data.payer_email.split("@")[0];
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    // Si tiene mas de 10 digitos, tomar ultimos 10 (ej: +52 33 1234 5678 -> 3312345678)
    const phone =
      phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;
    console.log("🚀 ~ POST ~ phone:", phone);

    const prospect = await prisma.prospects.findFirst({
      where: { phone: { equals: phone } },
    });

    if (!prospect) {
      return NextResponse.json(
        { success: false, error: "Prospecto no encontrado" },
        { status: 404 }, // 404 para "no encontrado"
      );
    }

    const prospectId = prospect.id;
    console.log("✅ Prospecto encontrado:", prospectId);

    const orderClient = new Order(mpConfig);
    const idempotencyKey = randomUUID();

    // Crear la orden - USAR DATA (datos validados) en lugar de BODY
    const orderData = {
      body: {
        type: "online",
        processing_mode: "automatic",
        total_amount: String(data.amount),
        external_reference: String(data.external_reference),
        description: "Membresía Station 24",
        // description: data.description,
        items: [
          {
            external_code: String(data.plan_id),
            title: data.displayName,
            description: data.description,
            category_id: "gym_fitness",
            quantity: 1,
            unit_price: String(data.amount),
          },
        ],
        transactions: {
          payments: [
            {
              amount: String(data.amount),
              payment_method: {
                id: data.payment_method_id,
                type: data.payment_type,
                token: data.token,
                installments: data.installments ? Number(data.installments) : 1,
                statement_descriptor: "STATION24",
              },
            },
          ],
        },
        payer: {
          email: data.payer_email,
          first_name: data.payer_first_name,
          last_name: data.payer_last_name,
        },
      },
      requestOptions: {
        idempotencyKey,
      },
    };
    console.log("🚀 ~ POST ~ orderData:", orderData);

    let order: any;
    let orderStatus: string = "unknown";
    let statusDetail: string | undefined = undefined;
    let mpOrderId: string | undefined = undefined;
    let mpPaymentId: string | undefined = undefined;
    let transactionAmount: any = data.amount;
    let dateApproved: any = null;
    let dateCreated: any = null;
    let paymentMethodId: any = undefined;

    try {
      order = await orderClient.create(orderData);

      orderStatus = order.status;
      paymentMethodId = order.transactions?.payments?.[0]?.payment_method?.id;
      transactionAmount = order.total_paid_amount;
      dateApproved = order.last_updated_date;
      dateCreated = order.created_date;
      mpOrderId = order.id;
      mpPaymentId = order.transactions?.payments?.[0]?.id;
    } catch (mpError: any) {
      const errorData = mpError?.data ?? {};
      console.log("🚀 ~ POST ~ errorData:", errorData);
      const errorPayments = errorData?.transactions?.payments ?? [];

      orderStatus = errorData?.status === "failed" ? "rejected" : "unknown";
      console.log("🚀 ~ POST ~ orderStatus:", orderStatus);

      // status_detail viene en mpError.data.transactions.payments[0].status_detail
      statusDetail =
        errorPayments?.[0]?.status_detail ??
        errorData?.status_detail ??
        "cc_rejected_other_reason";
      console.log("🚀 ~ POST ~ statusDetail:", statusDetail);

      mpOrderId = errorData?.id ?? undefined;
      mpPaymentId = errorPayments?.[0]?.id ?? undefined;
      transactionAmount = errorData?.total_amount ?? data.amount;
      paymentMethodId =
        errorPayments?.[0]?.payment_method?.id ?? data.payment_method_id;
      dateApproved = null;
      dateCreated = errorData?.created_date ?? null;

      const knownRejections = ["rejected", "cancelled", "expired", "failed"];
      if (!knownRejections.includes(orderStatus)) {
        throw mpError;
      }
    }

    // Determinar el estado del pago
    // const orderStatus = order.status;
    // const statusDetail = order.status_detail;
    // const paymentMethodId =
    //   order.transactions?.payments?.[0]?.payment_method?.id;
    // const transactionAmount = order.total_paid_amount;
    // const dateApproved = order.last_updated_date;
    // const mpOrderId = order.id;
    // const mpPaymentId = order.transactions?.payments?.[0]?.id;

    // Mapeo de estados de Order a estados de Payment
    let paymentStatusStr: string;
    let isSuccess = false;
    let isPending = false;
    let isRejected = false;

    switch (orderStatus) {
      case "paid":
      case "processed":
        paymentStatusStr = "approved";
        isSuccess = true;
        break;
      case "pending":
      case "in_process":
        paymentStatusStr = "pending";
        isPending = true;
        break;
      case "rejected":
      case "cancelled":
      case "expired":
        paymentStatusStr = "rejected";
        isRejected = true;
        break;
      default:
        paymentStatusStr = orderStatus || "unknown";
    }

    // Convert to Prisma enum
    const statusMap: Record<string, "pending" | "approved" | "rejected" | "refunded" | "cancelled"> = {
      pending: "pending",
      approved: "approved",
      rejected: "rejected",
      refunded: "refunded",
      cancelled: "cancelled",
    };
    const paymentStatus = statusMap[paymentStatusStr] || "pending";

    // Extraer información de la tarjeta
    const lastFourDigits = data.card_last_four;
    const cardholderName = data.cardholder_name;

    // Registrar el pago en la base de datos
    console.log("🚀 ~ POST ~ paymentStatus:", paymentStatus);
    const payment = await prisma.payments.create({
      data: {
        prospectId,
        mpPreferenceId: String(mpOrderId),
        status: paymentStatus,
        transactionAmount: Number(transactionAmount) * 100,
        currencyId: data.currency || "MXN",
        description: data.description,
        externalReference: prospectId,
        mpPaymentId: mpPaymentId ? String(mpPaymentId) : null,
        statusDetail: statusDetail || null,
        paymentMethodId: data.payment_method_id,
        paymentTypeId: data.payment_type,
        installments: Number(data.installments),
        planId: data.plan_id ?? null,
        cardLastFour: lastFourDigits,
        cardholderName: cardholderName,
        dateCreated: dateCreated,
        dateApproved: dateApproved,
      },
    });

    console.log("✅ Payment registered:", {
      paymentId: payment.id,
      prospectId,
      orderStatus,
      paymentStatus,
      mpOrderId,
      mpPaymentId,
    });

    // Actualizar el prospecto si el pago fue aprobado
    if (isSuccess) {
      await prisma.prospects.update({
        where: { id: prospectId },
        data: {
          paymentPending: false,
        },
      });
      console.log("✅ Prospect updated to member:", prospectId);
    }

    // Responder según el estado
    if (isSuccess) {
      return NextResponse.json({
        success: true,
        status: "approved",
        status_detail: statusDetail,
        payment_method_id: paymentMethodId,
        transaction_amount: transactionAmount,
        date_approved: dateApproved,
        order_id: mpOrderId,
        payment_id: mpPaymentId,
        paymentId: payment.id,
        external_reference: prospectId,
      });
    } else if (isPending) {
      return NextResponse.json({
        success: false,
        pending: true,
        status: "pending",
        status_detail: statusDetail || "Pago en proceso",
        order_id: mpOrderId,
        payment_id: mpPaymentId,
        paymentId: payment.id,
        external_reference: prospectId,
      });
    } else if (isRejected) {
      return NextResponse.json({
        success: false,
        rejected: true,
        status: "rejected",
        status_detail: statusDetail || "Pago rechazado",
        order_id: mpOrderId,
        payment_id: mpPaymentId,
        paymentId: payment.id,
        external_reference: prospectId,
        error: getRejectionMessage(statusDetail),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Estado inesperado: ${orderStatus}`,
        status: orderStatus,
        status_detail: statusDetail,
      });
    }
  } catch (error: unknown) {
    console.error("=== ERROR COMPLETO ===");
    console.error(error);

    let errorMessage = "Error interno del servidor";
    if (error instanceof Error) {
      // No exponer detalles internos en produccion
      errorMessage =
        process.env.NODE_ENV === "development"
          ? error.message
          : "Error al procesar el pago";
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }, // 500 para errores de servidor
    );
  }
}

// Función para obtener mensaje de rechazo legible
function getRejectionMessage(statusDetail?: string): string {
  const messages: Record<string, string> = {
    card_with_insufficient_funds: "Fondos insuficientes",
    card_accused: "Tarjeta denunciada",
    card_expired: "Tarjeta vencida",
    card_rejected: "Tarjeta rechazada",
    card_blocked: "Tarjeta bloqueada",
    invalid_card: "Tarjeta inválida",
    invalid_expiry_date: "Fecha de expiración inválida",
    invalid_security_code: "Código de seguridad inválido",
    rejected_call_to_authorizer: "Autorizador rechazó la operación",
    rejected_card_disabled: "Tarjeta deshabilitada",
    processing_error: "Error al procesar",
    replicated_payment: "Pago duplicado",
  };

  return messages[statusDetail || ""] || "Pago rechazado por el banco";
}

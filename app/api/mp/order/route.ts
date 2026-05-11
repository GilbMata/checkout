import { prisma } from "@/lib/db/index";
import {
  orderPaymentInput,
  orderPaymentSchema,
} from "@/validations/paymentSchema";
import { randomUUID } from "crypto";
import { MercadoPagoConfig, Order } from "mercadopago";
import type { OrderCreateData } from "mercadopago/dist/clients/order/create/types";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN_ORDERS = process.env.MP_ACCESS_TOKEN_ORDERS!;

// Configuración del cliente de MercadoPago
const mpConfig = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN_ORDERS,
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
    const phoneRaw = data.payer_phone || data.payer_email.split("@")[0];
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    // Si tiene mas de 10 digitos, tomar ultimos 10 (ej: +52 33 1234 5678 -> 3312345678)
    const phone =
      phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;

    const prospect = await prisma.prospects.findFirst({
      where: { phone: { equals: data.payer_phone } },
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
    const orderData: OrderCreateData = {
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
          phone: {
            area_code: data.payer_area_code,
            number: data.payer_phone,
          },
          identification: {
            type: data.identification_type,
            number: data.identification_number,
          },
        },
        // config: {
        //   online: {
        //     transaction_security: {
        //       validation: "on_fraud_risk",
        //       liability_shift: "required",
        //     },
        //   },
        // },
      },
      requestOptions: {
        idempotencyKey,
      },
    } as const;

    let order: any;
    let orderStatus: string = "unknown";
    let statusDetail: string | undefined = undefined;
    let mpOrderId: string | undefined = undefined;
    let mpPaymentId: string | undefined = undefined;
    let transactionAmount: any = data.amount;
    let dateApproved: any = null;
    let dateCreated: any = null;
    let paymentMethodId: any = undefined;
    let errorData: any = null; // Para guardar datos de error de MP

    // Extraer información de la tarjeta
    const lastFourDigits = data.card_last_four;
    const cardholderName = data.cardholder_name;

    try {
      order = await orderClient.create(orderData);
      console.log("🚀 ~ POST ~ order:", order);

      orderStatus = order.status;
      statusDetail = order.status_detail;
      paymentMethodId = order.transactions?.payments?.[0]?.payment_method?.id;
      transactionAmount = order.total_paid_amount;
      dateApproved = order.last_updated_date;
      dateCreated = order.created_date;
      mpOrderId = order.id;
      mpPaymentId = order.transactions?.payments?.[0]?.id;

      // ========================================================================
      // 3DS 2.0: Detectar si se requiere Challenge
      // ========================================================================
      const is3DSChallengeRequired =
        orderStatus === "action_required" &&
        statusDetail === "pending_challenge";

      if (is3DSChallengeRequired) {
        // Extraer URL del challenge desde transaction_security
        const challengeUrl =
          order.transactions?.payments?.[0]?.payment_method
            ?.transaction_security?.url;

        console.log("🔐 ~ 3DS Challenge requerido:", {
          orderId: mpOrderId,
          paymentId: mpPaymentId,
          challengeUrl,
        });

        // Guardar registro inicial del pago (pendiente de challenge)
        // 1. Crear la Orden con datos de MP
        const metadata = {
          items: orderData.body.items,
          payer: {
            email: orderData.body.payer?.email,
            first_name: orderData.body.payer?.first_name,
            last_name: orderData.body.payer?.last_name,
          },
        };

        const dbOrder = await prisma.orders.create({
          data: {
            prospectId,
            planId: data.plan_id ?? null,
            status: "processing",
            description: data.description,
            externalReference: String(data.external_reference),
            totalAmount: BigInt(Math.round(Number(transactionAmount))),
            metadata,
            mpOrderId: String(mpOrderId),
            mpUserId: order.payer?.id?.toString() || null,
            mpCreatedDate: dateCreated ? new Date(dateCreated) : null,
            mpLastUpdatedDate: dateApproved ? new Date(dateApproved) : null,
          },
        });

        // 2. Crear el Payment asociado a la orden
        const payment = await prisma.orderPayments.create({
          data: {
            orderId: dbOrder.id,
            mpOrderId: String(mpOrderId),
            status: "pending",
            transactionAmount: BigInt(Math.round(Number(transactionAmount))),
            currencyId: data.currency || "MXN",
            mpPaymentId: mpPaymentId ? String(mpPaymentId) : null,
            statusDetail: "pending_challenge",
            paymentMethodId: data.payment_method_id,
            paymentTypeId: data.payment_type,
            installments: Number(data.installments),
            cardLastFour: lastFourDigits,
            cardholderName: cardholderName,
            dateCreated: dateCreated ? new Date(dateCreated) : null,
            dateApproved: dateApproved ? new Date(dateApproved) : null,
            rawResponse: order, // Guardar respuesta completa de MP
          },
        });

        // Retornar datos del challenge para que el frontend muestre el iframe
        return NextResponse.json({
          challenge_required: true,
          challenge_url: challengeUrl,
          order_id: mpOrderId,
          payment_id: mpPaymentId,
          orderId: dbOrder.id,
          paymentId: payment.id,
          external_reference: prospectId,
          status: orderStatus,
          status_detail: statusDetail,
          amount: transactionAmount,
        });
      }
    } catch (mpError: any) {
      errorData = mpError?.data ?? {};
      const errorPayments = errorData?.transactions?.payments ?? [];

      orderStatus = errorData?.status === "failed" ? "rejected" : "unknown";

      // status_detail viene en mpError.data.transactions.payments[0].status_detail
      statusDetail =
        errorPayments?.[0]?.status_detail ??
        errorData?.status_detail ??
        "cc_rejected_other_reason";

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

    // Determinar el estado del pago
    let paymentStatus: string;
    let isSuccess = false;
    let isPending = false;
    let isRejected = false;

    switch (orderStatus) {
      case "paid":
      case "processed":
        paymentStatus = "approved";
        isSuccess = true;
        break;
      case "pending":
      case "in_process":
        paymentStatus = "pending";
        isPending = true;
        break;
      case "rejected":
      case "cancelled":
      case "expired":
        paymentStatus = "rejected";
        isRejected = true;
        break;
      default:
        paymentStatus = orderStatus || "unknown";
    }

    // Las variables lastFourDigits y cardholderName ya fueron declaradas antes del try

    // Determinar estado de la orden
    let orderStatusEnum: "pending" | "processing" | "completed" | "failed" =
      "pending";
    if (isSuccess) orderStatusEnum = "completed";
    else if (isPending) orderStatusEnum = "processing";
    else if (isRejected) orderStatusEnum = "failed";

    // Registrar el pago en la base de datos
    console.log("🚀 ~ POST ~ paymentStatus:", paymentStatus);

    // Preparar metadata con datos del request
    const metadata = {
      items: orderData.body.items,
      payer: {
        email: orderData.body.payer?.email,
        first_name: orderData.body.payer?.first_name,
        last_name: orderData.body.payer?.last_name,
      },
      // En caso de error, guardar los datos del error
      ...(isRejected && { errorData: errorData || null }),
    };

    // Obtener datos de MP (del objeto order o del errorData)
    const mpPayerId =
      order?.payer?.id?.toString() || errorData?.payer?.id?.toString() || null;

    // 1. Crear la Orden con datos de MP
    const dbOrder = await prisma.orders.create({
      data: {
        prospectId,
        planId: data.plan_id ?? null,
        status: orderStatusEnum,
        description: data.description,
        externalReference: String(data.external_reference),
        totalAmount: BigInt(Math.round(Number(transactionAmount))),
        metadata,
        mpOrderId: String(mpOrderId),
        mpUserId: mpPayerId,
        mpCreatedDate: dateCreated ? new Date(dateCreated) : null,
        mpLastUpdatedDate: dateApproved ? new Date(dateApproved) : null,
      },
    });

    // 2. Crear el Payment asociado a la orden (guardar rawResponse del objeto order o errorData)
    const rawResponse = order || errorData || null;
    const payment = await prisma.orderPayments.create({
      data: {
        orderId: dbOrder.id,
        mpOrderId: String(mpOrderId),
        status: paymentStatus as any,
        transactionAmount: BigInt(Math.round(Number(transactionAmount))),
        currencyId: data.currency || "MXN",
        mpPaymentId: mpPaymentId ? String(mpPaymentId) : null,
        statusDetail: statusDetail || null,
        paymentMethodId: data.payment_method_id,
        paymentTypeId: data.payment_type,
        installments: Number(data.installments),
        cardLastFour: lastFourDigits,
        cardholderName: cardholderName,
        dateCreated: dateCreated ? new Date(dateCreated) : null,
        dateApproved: dateApproved ? new Date(dateApproved) : null,
        rawResponse, // Guardar respuesta completa de MP (order o errorData)
      },
    });

    console.log("✅ Order and Payment registered:", {
      orderId: dbOrder.id,
      paymentId: payment.id,
      prospectId,
      orderStatus: orderStatusEnum,
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
        orderId: dbOrder.id,
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
        orderId: dbOrder.id,
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
        orderId: dbOrder.id,
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
  } catch (error: any) {
    console.error("=== ERROR COMPLETO ===");
    console.error(error);
    console.error({
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    console.error(
      "MP raw error:",
      JSON.stringify(
        {
          message: error?.message,
          cause: error?.cause,
          response: error?.response,
          status: error?.status,
        },
        null,
        2,
      ),
    );

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

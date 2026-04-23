import { prisma } from "@/lib/db/index";
import { randomUUID } from "crypto";
import { MercadoPagoConfig, Order } from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Buscar prospecto por teléfono
    const phoneToSearch = body.prospectPhone.slice(
      3,
      body.prospectPhone.length,
    );
    const prospect = await prisma.prospects.findFirst({
      where: { phone: phoneToSearch },
    });

    if (!prospect) {
      return NextResponse.json(
        { success: false, erro: "no prospect" },
        { status: 400 },
      );
    }

    const prospectId = prospect.id;
    const phone = prospect.phone.slice(1, prospect.phone.length);

    // Configurar el cliente de Mercado Pago
    const mercadoPagoConfig = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });

    const orderClient = new Order(mercadoPagoConfig);
    const idempotencyKey = randomUUID();

    // Crear la orden
    const orderData = {
      body: {
        type: "online",
        processing_mode: "automatic",
        total_amount: String(body.amount),
        external_reference: String(body.external_reference),
        description: "Membresía Station 24",
        // description: body.description,
        items: [
          {
            external_code: String(body.plan_id),
            title: body.displayName,
            description: body.description,
            category_id: "gym_fitness",
            quantity: 1,
            unit_price: String(body.amount),
          },
        ],
        transactions: {
          payments: [
            {
              amount: String(body.amount),
              payment_method: {
                id: body.payment_method_id,
                type: body.payment_type,
                token: body.token,
                installments: body.installments,
                statement_descriptor: "STATION24",
              },
            },
          ],
        },
        payer: {
          email: body.payer_email,
          first_name: body.payer_first_name,
          last_name: body.payer_last_name,
        },
      },
      requestOptions: {
        idempotencyKey,
      },
    };

    let order: any;
    let orderStatus: string = "unknown";
    let statusDetail: string | undefined = undefined;
    let mpOrderId: string | undefined = undefined;
    let mpPaymentId: string | undefined = undefined;
    let transactionAmount: any = body.amount;
    let dateApproved: any = null;
    let paymentMethodId: any = undefined;

    try {
      order = await orderClient.create(orderData);

      orderStatus = order.status;
      paymentMethodId = order.transactions?.payments?.[0]?.payment_method?.id;
      transactionAmount = order.total_paid_amount;
      dateApproved = order.last_updated_date;
      mpOrderId = order.id;
      mpPaymentId = order.transactions?.payments?.[0]?.id;
    } catch (mpError: any) {
      const errorData = mpError?.data ?? {};
      const errorPayments = errorData?.transactions?.payments ?? [];

      orderStatus = errorData?.status === "failed" ? "rejected" : "unknown";
      console.log("🚀 ~ POST ~ orderStatus:", orderStatus);

      // ✅ status_detail viene en mpError.data.transactions.payments[0].status_detail
      statusDetail =
        errorPayments?.[0]?.status_detail ??
        errorData?.status_detail ??
        "cc_rejected_other_reason";
      console.log("🚀 ~ POST ~ statusDetail:", statusDetail);

      mpOrderId = errorData?.id ?? undefined;
      mpPaymentId = errorPayments?.[0]?.id ?? undefined;
      transactionAmount = errorData?.total_amount ?? body.amount;
      paymentMethodId =
        errorPayments?.[0]?.payment_method?.id ?? body.payment_method_id;
      dateApproved = null;

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

    // Extraer información de la tarjeta
    const lastFourDigits = body.card_last_four;
    const cardholderName = body.cardholder_name;

    // Registrar el pago en la base de datos
    console.log("🚀 ~ POST ~ paymentStatus:", paymentStatus);
    const payment = await prisma.payments.create({
      data: {
        prospectId,
        mpPreferenceId: String(mpOrderId),
        status: paymentStatus,
        transactionAmount: Number(transactionAmount) * 100,
        currencyId: body.currency_id || "MXN",
        description: body.description,
        externalReference: prospectId,
        mpPaymentId: mpPaymentId ? String(mpPaymentId) : null,
        statusDetail: statusDetail || null,
        paymentMethodId: body.payment_method_id,
        paymentTypeId: body.payment_type,
        installments: Number(body.installments),
        planId: body.plan_id?.id ?? null,
        cardLastFour: lastFourDigits,
        cardholderName: cardholderName,
      },
    });
    console.log("🚀 ~ POST ~ data.statusDetail:", statusDetail);

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
  } catch (error: any) {
    console.error("=== ERROR COMPLETO ===");
    console.error("Mensaje:", JSON.stringify(error));
    return NextResponse.json(
      {
        success: false,
        error: error.cause?.body?.errors || error.message,
      },
      { status: 400 },
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

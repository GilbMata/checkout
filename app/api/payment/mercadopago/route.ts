import { db } from "@/lib/db/index";
import { payments, prospects } from "@/lib/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Order } from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validar campos requeridos
    // const requiredFields = ["token", "amount", "payer"];
    // for (const field of requiredFields) {
    //   if (!body[field]) {
    //     console.error(`❌ Campo faltante: ${field}`);
    //     return NextResponse.json(
    //       { success: false, error: `Campo faltante: ${field}` },
    //       { status: 400 },
    //     );
    //   }
    // }

    // console.log(
    //   "✅ Validación pasada. Token:",
    //   body.token.substring(0, 10) + "...",
    // );

    // let prospectId = "";
    const prospect = await db
      .select()
      .from(prospects)
      .where(
        eq(
          prospects.phone,
          body.prospectPhone.slice(3, body.prospectPhone.length),
        ),
      )
      .limit(1);

    if (!prospect) {
      return NextResponse.json(
        { success: false, erro: "no prospect" },
        { status: 400 },
      );
      //  prospectId = prospect[0].id;
    }

    const prospectId = prospect[0].id;
    const phone = prospect[0].phone.slice(1, prospect[0].phone.length);

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
        external_reference: phone, //cambiar a curp
        description: body.description,
        transactions: {
          payments: [
            {
              amount: String(body.amount),
              payment_method: {
                id: body.payment_method_id,
                type: "credit_card",
                token: body.token,
                installments: body.installments,
                // statement_descriptor: 'Store name'
              },
            },
          ],
        },
        payer: {
          email: body.payer_email, // Idealmente, el email del usuario logueado
        },
      },
      requestOptions: {
        idempotencyKey,
      },
    };

    const order = await orderClient.create(orderData);
    // console.log("🚀 ~ POST ~ order:", JSON.stringify(order));

    // Determinar el estado del pago
    const orderStatus = order.status; // 'paid', 'pending', 'rejected', 'cancelled', etc.
    const statusDetail = order.status_detail;
    const paymentMethodId =
      order.transactions?.payments?.[0]?.payment_method?.id;
    const transactionAmount = order.total_paid_amount;
    const dateApproved = order.last_updated_date;
    const mpOrderId = order.id;
    const mpPaymentId = order.transactions?.payments?.[0]?.id;

    (async () => {
      try {
        if (!mpOrderId) {
          throw new Error("Order ID is missing");
        }
        const capturedOrder = await orderClient.capture({
          id: mpOrderId,
          requestOptions: {
            idempotencyKey,
          },
        });
        console.log("Order captured successfully:", capturedOrder);
      } catch (error) {
        console.error("Error capturing order:", error);
      }
    })();

    // Generar ID para nuestro registro
    const paymentId = randomUUID();
    const now = Date.now();

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

    // Registrar el pago en la base de datos

    // Registrar el pago en la base de datos
    await db.insert(payments).values({
      id: paymentId,
      prospectId: prospectId,
      mpPreferenceId: String(mpOrderId), // Usamos el order ID como referencia
      status: "in_process",
      // status: paymentStatus,
      transactionAmount: Number(body.amount) * 100,
      currencyId: "MXN",
      description: body.description,
      externalReference: prospectId,
      mpPaymentId: mpPaymentId ? String(mpPaymentId) : null,
      statusDetail: statusDetail || null,
      paymentMethodId: body.payment_method_id,
      paymentTypeId: "credit_card",
      installments: Number(body.installments),
      createdAt: now,
      updatedAt: now,
      planId: body.plan_id.id,
    });

    console.log("✅ Payment registered:", {
      paymentId,
      prospectId,
      orderStatus,
      paymentStatus,
      mpOrderId,
      mpPaymentId,
    });

    // Actualizar el prospecto si el pago fue aprobado
    if (isSuccess) {
      await db
        .update(prospects)
        .set({
          paymentPending: false,
          updatedAt: now,
        })
        .where(eq(prospects.id, prospectId));
      console.log("✅ Prospect updated to member:", prospectId);
    }
    // id: number;
    //   status: "approved";
    //   status_detail?: string;
    //   payment_method_id?: string;
    //   transaction_amount?: number;
    //   date_approved?: string;
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
        paymentId: paymentId,
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
        paymentId: paymentId,
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
        paymentId: paymentId,
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
    console.error("Mensaje:", error);
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

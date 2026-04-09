import { db } from "@/lib/db/index";
import { payments, prospects } from "@/lib/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Order } from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

// Tipos para el body de la solicitud
interface PaymentRequestBody {
  token: string;
  amount: number;
  description?: string;
  payment_method_id: string;
  installments?: number;
  issuer_id?: string;
  external_reference: string;
  payer_email: string;
}

export async function POST(request: Request) {
  try {
    const body: PaymentRequestBody = await request.json();

    console.log("🚀 ~ POST /api/payment/mercadopago ~ body:", body);

    // Validar campos requeridos
    const requiredFields = [
      "token",
      "amount",
      "payer_email",
      "external_reference",
    ];
    for (const field of requiredFields) {
      if (!body[field as keyof PaymentRequestBody]) {
        console.error(`❌ Campo faltante: ${field}`);
        return NextResponse.json(
          { success: false, error: `Campo faltante: ${field}` },
          { status: 400 },
        );
      }
    }

    // Buscar el prospecto por phone o email
    let prospectId = body.external_reference;
    const prospect = await db
      .select()
      .from(prospects)
      .where(eq(prospects.phone, body.external_reference))
      .limit(1);

    if (prospect.length > 0) {
      prospectId = prospect[0].id;
    }

    // Configurar el cliente de Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });

    const orderClient = new Order(client);

    // Crear la orden con Checkout API via Orders
    const orderData = {
      body: {
        type: "online",
        processing_mode: "automatic",
        total_amount: String(body.amount),
        external_reference: prospectId,
        description: body.description || "Plan de membresía Station 24",
        transactions: {
          payments: [
            {
              amount: String(body.amount),
              payment_method: {
                id: body.payment_method_id,
                type: "credit_card",
                token: body.token,
                installments: Number(body.installments) || 1,
              },
            },
          ],
        },
        payer: {
          email: body.payer_email,
        },
      },
      requestOptions: {
        idempotencyKey: randomUUID(),
      },
    };

    console.log("🚀 ~ POST ~ orderData:", JSON.stringify(orderData, null, 2));

    // Crear la orden en MercadoPago
    const order = await orderClient.create(orderData);
    console.log("🚀 ~ POST ~ order response:", order);

    // Determinar el estado del pago
    const orderStatus = order.status; // 'paid', 'pending', 'rejected', 'cancelled', etc.
    const statusDetail = order.status_detail;
    const mpOrderId = order.id;
    const mpPaymentId = order.transactions?.payments?.[0]?.id;

    // Generar ID para nuestro registro
    const paymentId = crypto.randomUUID();
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
    await db.insert(payments).values({
      id: paymentId,
      prospectId: prospectId,
      mpPreferenceId: String(mpOrderId), // Usamos el order ID como referencia
      status: paymentStatus,
      transactionAmount: Math.round(Number(body.amount) * 100), // Convertir a centavos
      currencyId: "MXN",
      description: body.description || "Plan de membresía Station 24",
      externalReference: prospectId,
      mpPaymentId: mpPaymentId ? String(mpPaymentId) : null,
      statusDetail: statusDetail || null,
      paymentMethodId: body.payment_method_id,
      paymentTypeId: "credit_card",
      installments: Number(body.installments) || 1,
      createdAt: now,
      updatedAt: now,
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

    // Responder según el estado
    if (isSuccess) {
      return NextResponse.json({
        success: true,
        status: "approved",
        status_detail: statusDetail,
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
    console.error("❌ Error completo:", error);

    // Manejar errores específicos de MercadoPago
    const errorMessage =
      error?.cause?.body?.error || error?.message || "Error interno";
    const errorStatus = error?.cause?.body?.status || 500;

    return NextResponse.json(
      {
        success: false,
        rejected: true,
        error: errorMessage,
        status_detail: errorMessage,
      },
      { status: errorStatus > 399 ? errorStatus : 500 },
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

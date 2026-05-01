import { MercadoPagoConfig, Order } from "mercadopago";
import { NextResponse } from "next/server";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

// ========================================================================
// Configuración del cliente de MercadoPago
// ========================================================================
const mpConfig = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 },
});

// ========================================================================
// GET /api/payment/mercadopago/order/[id]
// Consulta el estado de una orden de pago (usado después del 3DS Challenge)
// ========================================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID es requerido" },
        { status: 400 },
      );
    }

    console.log("🔍 ~ Consultando orden:", id);

    const orderClient = new Order(mpConfig);
    const order = await orderClient.get({ id });
    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }
    console.log("🚀 ~ GET ~ order:", order);

    console.log("📋 ~ Estado de orden:", {
      id: order.id,
      status: order.status,
      status_detail: order.status_detail,
    });

    // ========================================================================
    // Determinar el estado del pago basado en la respuesta
    // ========================================================================
    let paymentStatus: string;
    let isSuccess = false;
    let isPending = false;
    let isRejected = false;
    let statusDetail = order.status_detail;

    const orderStatus = order.status;

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
      case "failed":
        paymentStatus = "rejected";
        isRejected = true;
        break;
      case "action_required":
        // Todavía requiere acción (ej: 3DS Challenge)
        paymentStatus = "pending";
        isPending = true;
        statusDetail = order.status_detail || "action_required";
        break;
      default:
        paymentStatus = orderStatus || "unknown";
    }

    // ========================================================================
    // Extraer información de 3DS si está disponible
    // ========================================================================
    const threeDSInfo =
      order.transactions?.payments?.[0]?.payment_method?.transaction_security;
    console.log("🚀 ~ GET ~ threeDSInfo:", threeDSInfo);

    const response: Record<string, unknown> = {
      success: isSuccess,
      status: paymentStatus,
      status_detail: statusDetail,
      order_id: order.id,
      external_reference: order.external_reference,
      total_amount: order.total_amount,
      total_paid_amount: order.total_paid_amount,
      currency: (order as any).currency,
      created_date: order.created_date,
      last_updated_date: order.last_updated_date,
      payment_method_id: order.transactions?.payments?.[0]?.payment_method?.id,
      payment_id: order.transactions?.payments?.[0]?.id,
    };

    // Agregar info de 3DS si está disponible
    if (threeDSInfo) {
      response.three_ds_info = {
        validation: threeDSInfo.validation,
        liability_shift: threeDSInfo.liability_shift,
        status: threeDSInfo.status,
        url: threeDSInfo.url,
      };
    }

    // Responder según el estado
    if (isSuccess) {
      return NextResponse.json({
        ...response,
        processed: true,
      });
    } else if (isPending) {
      return NextResponse.json({
        ...response,
        pending: true,
      });
    } else if (isRejected) {
      return NextResponse.json({
        ...response,
        rejected: true,
        error: getRejectionMessage(statusDetail),
      });
    } else {
      return NextResponse.json({
        ...response,
        error: `Estado inesperado: ${orderStatus}`,
      });
    }
  } catch (error: unknown) {
    console.error("=== ERROR consultations order ===");
    console.error(error);

    const errorMessage =
      error instanceof Error ? error.message : "Error al consultar la orden";

    return NextResponse.json(
      { error: errorMessage, status: 500 },
      { status: 500 },
    );
  }
}

// ========================================================================
// Función para obtener mensaje de rechazo legible
// ========================================================================
function getRejectionMessage(statusDetail?: string): string {
  console.log("🚀 ~ getRejectionMessage ~ statusDetail:", statusDetail);
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
    cc_rejected_3ds_challenge: "Autenticación 3DS fallida",
    expired: "Transacción expirada",
  };

  return messages[statusDetail || ""] || "Pago rechazado por el banco";
}

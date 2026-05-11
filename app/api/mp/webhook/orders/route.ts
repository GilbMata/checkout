/**
 * Webhook de MercadoPago para Orders/Pagos (Checkout API)
 * Maneja todos los actions y statuses de MP Orders
 * 
 * Actions posibles:
 * - payment.created, payment.updated
 * - order.created, order.updated
 * 
 * Order statuses: created, processed, processing, action_required, canceled, charged_back, expired, failed, refunded
 * Payment statuses: created, processed, action_required, at_terminal, expired, refunded, canceled, failed
 */
import prisma from "@/lib/db/prisma";
import { PaymentStatus, OrderStatus } from "@/src/generated/prisma";
import crypto from "crypto";
import { NextRequest } from "next/server";

// ============================================================================
// Constantes - Webhook Security
// ============================================================================

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET_ORDERS;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

// ============================================================================
// Tipos de datos de MercadoPago
// ============================================================================

interface MPNotification {
  id: number;
  live_mode: boolean;
  type: "payment" | "order" | "subscription" | "preapproval";
  action: string;
  date_created: string;
  user_id: number;
  api_version: string;
  data: {
    id: string;
  };
}

// ============================================================================
// MAPAS DE STATUS - Completos para MP Orders
// ============================================================================

// Order status de MP -> our OrderStatus
// Documentación: https://www.mercadopago.com.mx/developers/es/docs/checkout-api-orders/payment-management/status/order-status
const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  // Estados finales
  created: "pending",          // Orden creada, esperando pago
  processed: "completed",        // Pago acreditado (approved)
  canceled: "cancelled",         // Orden cancelada
  charged_back: "failed",        // Contracargo
  expired: "expired",           // Orden expirada
  failed: "failed",             // Orden fallida
  refunded: "failed",           // Reembolsada (tratarla como fallida)
  
  // Estados de procesamiento
  processing: "processing",    // En procesamiento
  action_required: "processing", // Requiere acción (3DS, etc)
  at_terminal: "processing",    // En terminal (para Point)
};

// Payment status (transacción interna) de MP -> our PaymentStatus
// Documentación: https://www.mercadopago.com.mx/developers/es/docs/mp-point/resources/status-order-transaction
const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  // Estados finales
  approved: "approved",        // Pago aprobado
  pending: "pending",          // Pago pendiente
  rejected: "rejected",         // Pago rechazado
  canceled: "cancelled",        // Pago cancelado
  refunded: "refunded",         // Pago reembolsado
  failed: "failed",            // Pago fallido
  charged_back: "charged_back", // Contracargo
  
  // Estados de procesamiento
  created: "pending",          // Transacción creada
  processed: "approved",        // Transacción procesada
  in_process: "in_process",   // En procesamiento
  action_required: "pending",   // Requiere acción
  authorized: "authorized",      // Autorizado (sin capturar)
  at_terminal: "in_process",  // En terminal
  expired: "rejected",         // Expirado
};

// ============================================================================
// Webhook Signature Validation
// ============================================================================

function validateWebhookSignature(
  signature: string,
  dataId: string,
  requestId: string,
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("⚠️ MP_WEBHOOK_SECRET no configurado - saltando validación");
    return true;
  }

  try {
    if (!signature) {
      console.warn("⚠️ Sin firma en request");
      return false;
    }

    const parts = signature.split(",");
    let timestamp = "";
    let hash = "";

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "ts") timestamp = value.trim();
      if (key === "v1") hash = value.trim();
    }

    if (!timestamp || !hash) {
      console.warn("⚠️ Firma incompleta");
      return false;
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const expectedHash = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch (error) {
    console.error("Error validando firma:", error);
    return false;
  }
}

// ============================================================================
// Obtener datos de MP
// ============================================================================

async function getMPOrderData(orderId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      console.error("❌ Error fetching order from MP:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error fetching MP order:", error);
    return null;
  }
}

// ============================================================================
// Procesar actualización de Order/Payment
// ============================================================================

async function processOrderNotification(mpData: any) {
  if (!mpData) {
    console.error("❌ No hay datos de MP");
    return;
  }

  console.log("💰 Procesando order:", {
    id: mpData.id,
    status: mpData.status,
    status_detail: mpData.status_detail,
  });

  // Mapear status de MP a nuestro OrderStatus
  const orderStatus: OrderStatus =
    ORDER_STATUS_MAP[mpData.status] || "pending";

  // Mapear status de payment interno (si existe)
  let paymentStatus: PaymentStatus = "pending";
  let paymentStatusDetail: string | null = null;
  const paymentTransaction = mpData.transactions?.payments?.[0];
  
  if (paymentTransaction) {
    paymentStatus = PAYMENT_STATUS_MAP[paymentTransaction.status] || "pending";
    paymentStatusDetail = paymentTransaction.status_detail || null;
  }

  // Preparar metadata completa
  const metadata = {
    items: mpData.items || [],
    payer: mpData.payer || null,
    transactions: mpData.transactions || null,
    status_detail: mpData.status_detail, // Guardar también el status_detail de la order
    // Completar con más info relevante
    integration_data: mpData.integration_data || null,
    config: mpData.config || null,
  };

  // Calcular totalAmount - MP devuelve en centavos (integer)
  // NOTA: total_paid_amount y total_amount de MP ya vienen en la menor unidad de la moneda (centavos para MXN)
  let totalAmount: number | null = null;
  
  if (mpData.total_paid_amount) {
    totalAmount = Math.round(Number(mpData.total_paid_amount));
  } else if (mpData.total_amount) {
    totalAmount = Math.round(Number(mpData.total_amount));
  }

  // Buscar orden existente por mpOrderId O externalReference
  // Esto maneja el caso donde el webhook llega antes de que el POST termine de guardar
  const existingOrder = await prisma.orders.findFirst({
    where: {
      OR: [
        { mpOrderId: String(mpData.id) },
        { externalReference: mpData.external_reference || undefined },
      ],
    },
  });

  const prospectId = existingOrder?.prospectId || null;

  if (existingOrder) {
    // Actualizar orden existente
    await prisma.orders.update({
      where: { id: existingOrder.id },
      data: {
        status: orderStatus,
        totalAmount: totalAmount || existingOrder.totalAmount,
        mpLastUpdatedDate: mpData.last_updated_date
          ? new Date(mpData.last_updated_date)
          : null,
        metadata,
      },
    });

    // Buscar y actualizar payment
    const existingPayment = await prisma.orderPayments.findFirst({
      where: { orderId: existingOrder.id },
    });

    if (existingPayment) {
      await prisma.orderPayments.update({
        where: { id: existingPayment.id },
        data: {
          status: paymentStatus,
          statusDetail: paymentStatusDetail,
          transactionAmount: totalAmount ? BigInt(totalAmount) : undefined,
          dateApproved: mpData.date_approved
            ? new Date(mpData.date_approved)
            : null,
          threeDsStatus: paymentTransaction?.status || null,
          threeDsStatusDetail: paymentTransaction?.status_detail || null,
          rawResponse: mpData,
        },
      });
    }

    console.log("✅ Order actualizada:", mpData.id, "-> status:", orderStatus);
  } else {
    // Crear nueva orden (caso extraño - debería existir)
    console.log("⚠️ Orden no encontrada, creando nueva:", mpData.id);

    const newOrder = await prisma.orders.create({
      data: {
        prospectId,
        status: orderStatus,
        description: mpData.description || null,
        externalReference: mpData.external_reference || null,
        totalAmount: totalAmount ? BigInt(totalAmount) : undefined,
        metadata,
        mpOrderId: String(mpData.id),
        mpUserId: mpData.user_id?.toString() || null,
        mpCreatedDate: mpData.created_date
          ? new Date(mpData.created_date)
          : null,
        mpLastUpdatedDate: mpData.last_updated_date
          ? new Date(mpData.last_updated_date)
          : null,
      },
    });

    // Crear payment asociado
    await prisma.orderPayments.create({
      data: {
        orderId: newOrder.id,
        mpPaymentId: paymentTransaction?.id?.toString() || null,
        mpOrderId: String(mpData.id),
        status: paymentStatus,
        statusDetail: paymentStatusDetail,
        transactionAmount: totalAmount ? BigInt(totalAmount) : undefined,
        currencyId: mpData.currency || "MXN",
        paymentMethodId: mpData.payment_method_id || null,
        paymentTypeId: mpData.payment_type_id || null,
        dateApproved: mpData.date_approved
          ? new Date(mpData.date_approved)
          : null,
        threeDsStatus: paymentTransaction?.status || null,
        threeDsStatusDetail: paymentTransaction?.status_detail || null,
        rawResponse: mpData,
      },
    });

    console.log("✅ Nueva Order creada:", mpData.id);
  }

  // Actualizar prospect si el pago fue aprobado
  if (prospectId && paymentStatus === "approved") {
    await prisma.prospects.update({
      where: { id: prospectId },
      data: { paymentPending: false },
    });
    console.log("✅ Prospect actualizado a member");
  }

  // Log detallado del estado
  console.log(`📊 Order: ${mpData.status}/${mpData.status_detail}`);
  if (paymentTransaction) {
    console.log(`📊 Payment: ${paymentTransaction.status}/${paymentTransaction.status_detail}`);
  }
}

// ============================================================================
// Handler Principal POST
// ============================================================================

export async function POST(req: Request) {
  try {
    // Parsear el body
    const queryParams = new URL(req.url).searchParams;
    const notification = (await req.json()) as MPNotification;

    console.log("📥 Webhook recibido:", {
      type: notification.type,
      action: notification.action,
      dataId: notification.data?.id,
    });

    const entityId = notification.data?.id;
    const notificationType = notification.type;
    const action = notification.action;

    if (!entityId) {
      console.error("❌ No hay entity ID en el webhook");
      return Response.json(
        { received: true, error: "No entity ID" },
        { status: 400 },
      );
    }

    // Validar firma
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";

    if (WEBHOOK_SECRET && xSignature) {
      if (!validateWebhookSignature(xSignature, entityId, xRequestId)) {
        console.warn("⚠️ Firma inválida");
        if (process.env.NODE_ENV === "production") {
          return Response.json(
            { received: true, error: "Invalid signature" },
            { status: 401 },
          );
        }
      }
    } else {
      console.log("⚠️ Sin firma o secret - saltando validación");
    }

    // Solo procesar tipos relevantes para orders/payments
    if (notificationType !== "payment" && notificationType !== "order") {
      console.log("ℹ️ Ignorando tipo:", notificationType);
      return Response.json({ received: true, ignored: true });
    }

    // Obtener datos completos de la orden desde MP
    console.log("🔄 Obteniendo datos de MP para:", entityId);
    const mpData = await getMPOrderData(entityId);

    if (!mpData) {
      console.error("❌ No se pudieron obtener datos de MP");
      return Response.json(
        { received: true, error: "Failed to fetch MP data" },
        { status: 500 },
      );
    }

    // Procesar la notificación
    await processOrderNotification(mpData);

    // Responder 200 a MP
    return Response.json({ received: true });
  } catch (error: any) {
    console.error("❌ Error procesando webhook:", error?.message);
    // Siempre responder 200 a MP para evitar reintentos
    return Response.json({ received: true, error: "Processing error" });
  }
}

// ============================================================================
// Handler para uso interno (desde /api/mp/webhook)
// ============================================================================

export async function handleOrderWebhook(req: NextRequest) {
  const body = await req.json();
  const entityId = body.data?.id;

  if (!entityId) {
    console.error("❌ No hay entity ID");
    return;
  }

  // Validar firma
  const signature = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";

  if (signature && !validateWebhookSignature(signature, entityId, requestId)) {
    console.error("❌ Firma inválida");
    return;
  }

  // Obtener datos de MP y procesar
  const mpData = await getMPOrderData(entityId);
  if (mpData) {
    await processOrderNotification(mpData);
  }
}
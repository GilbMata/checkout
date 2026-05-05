import prisma from "@/lib/db/prisma";
import { PaymentStatus } from "@/src/generated/prisma";
import crypto from "crypto";

// ============================================================================
// Constantes - Webhook Security
// ============================================================================

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET_ORDERS;

type MPPaymentStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "in_process"
  | "in_mediation"
  | "failed"
  | "charged_back"
  | "authorized";

interface WebhookData {
  type: string;
  action: string;
  data: {
    id: string;
  };
}

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
    const parts = signature.split(",");
    let timestamp = "";
    let hash = "";

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key === "ts") timestamp = value.trim();
      if (key === "v1") hash = value.trim();
    }

    if (!timestamp || !hash) {
      return false;
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;

    const expectedHash = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash),
    );
  } catch (error) {
    console.error("Error validando firma:", error);
    return false;
  }
}

// ============================================================================
// Handler
// ============================================================================

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebhookData;
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";

    const notificationType = body.type;
    const entityId = body.data?.id;

    if (!entityId) {
      return Response.json(
        { received: true, error: "No entity ID" },
        { status: 400 },
      );
    }

    // Validar firma
    if (!validateWebhookSignature(xSignature, entityId, xRequestId)) {
      return Response.json(
        { received: true, error: "Invalid signature" },
        { status: 401 },
      );
    }

    // Solo payment u order
    if (notificationType !== "payment" && notificationType !== "order") {
      console.log("Ignorando tipo:", notificationType);
      return Response.json({ received: true, ignored: true });
    }

    console.log("💰 Procesando webhook de pago:", entityId);
    await processPaymentWebhook(entityId);

    return Response.json({ received: true });
  } catch (error: any) {
    console.error("Error:", error?.message);
    return Response.json(
      { received: true, error: "Processing error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Payment Processing
// ============================================================================

async function getPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching payment:", error);
    return null;
  }
}

function mapMPPaymentStatus(mpStatus: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    approved: "approved",
    pending: "pending",
    in_process: "in_process",
    rejected: "rejected",
    cancelled: "cancelled",
    refunded: "refunded",
    failed: "failed",
    charged_back: "charged_back",
    authorized: "authorized",
  };
  return map[mpStatus] || "pending";
}

async function processPaymentWebhook(paymentId: string) {
  const payment = await getPaymentDetails(paymentId);
  if (!payment) {
    console.error("No se pudieron obtener detalles del pago:", paymentId);
    return;
  }

  console.log("💰 Payment:", {
    id: payment.id,
    status: payment.status,
    statusDetail: payment.status_detail,
  });

  const statusDetail = payment.status_detail;
  let statusTyped: PaymentStatus;

  if (statusDetail === "accredited") {
    statusTyped = "approved";
  } else {
    statusTyped = mapMPPaymentStatus(payment.status);
  }

  const externalReference = payment.external_reference;
  let prospectId: string | null = null;

  if (externalReference) {
    const prospect = await prisma.prospects.findFirst({
      where: { id: externalReference },
    });
    prospectId = prospect?.id || null;
  }

  // Check existing payment
  const existingPayment = await prisma.payments.findFirst({
    where: { mpPreferenceId: String(payment.id) },
  });

  if (existingPayment) {
    await prisma.payments.update({
      where: { id: existingPayment.id },
      data: {
        status: statusTyped,
        statusDetail: payment.status_detail || null,
        dateApproved: payment.date_approved
          ? new Date(payment.date_approved)
          : null,
        threeDsStatus: payment.transactions?.payments?.[0]?.status || null,
        threeDsStatusDetail: payment.transactions?.payments?.[0]?.status_detail || null,
      },
    });
    console.log("✅ Payment actualizado:", payment.id);
  } else {
    await prisma.payments.create({
      data: {
        prospectId: prospectId || null,
        mpPaymentId: String(payment.id),
        mpPreferenceId: String(payment.id),
        status: statusTyped,
        statusDetail: payment.status_detail || null,
        transactionAmount: payment.total_paid_amount,
        currencyId: payment.currency || "MXN",
        paymentMethodId: payment.payment_method_id || null,
        paymentTypeId: payment.payment_type_id || null,
        installments: payment.installments || null,
        description: payment.description || null,
        externalReference: externalReference || null,
        dateApproved: payment.date_approved
          ? new Date(payment.date_approved)
          : null,
        threeDsStatus: payment.transactions?.payments?.[0]?.status || null,
        threeDsStatusDetail: payment.transactions?.payments?.[0]?.status_detail || null,
      },
    });
    console.log("✅ Payment guardado:", payment.id);
  }

  // Update prospect on success
  if (prospectId && payment.status === "approved") {
    await prisma.prospects.update({
      where: { id: prospectId },
      data: { paymentPending: false },
    });
  }

  // Log status
  switch (payment.status) {
    case "pending":
      console.log("⏳ Pago pendiente:", payment.id);
      break;
    case "rejected":
      console.log("❌ Pago rechazado:", payment.id);
      break;
    case "approved":
      console.log("✅ Pago aprobado:", payment.id);
      break;
    case "refunded":
      console.log("💸 Pago reembolsado:", payment.id);
      break;
    case "charged_back":
      console.log("⚠️ Contracargo:", payment.id);
      break;
  }
}
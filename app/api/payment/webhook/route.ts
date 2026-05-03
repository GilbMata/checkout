import prisma from "@/lib/db/prisma";
import { PaymentStatus } from "@/src/generated/prisma";

// Estado del pago en MercadoPago
type MPPaymentStatus =
  | "approved" // Pago aprobado
  | "pending" // Pago pendiente
  | "rejected" // Pago rechazado
  | "cancelled" // Pago cancelado
  | "refunded" // Pago reembolsado
  | "in_process" // Pago en proceso de revisión
  | "in_mediation" // Pago en mediación
  | "failed" // Pago fallido 3ds
  | "charged_back" // 🔄 Contracargo (dispute)
  | "authorized"; // 🔐 Autorizado, sin capturar

// Estado de suscripción/preapproval en MercadoPago
type MPPreapprovalStatus =
  | "authorized" // Autorizado, listo para cobrar
  | "active" // Activo, cobrando
  | "pending" // Pendiente
  | "paused" // Pausado
  | "cancelled" // Cancelado
  | "expired" // Expirado
  | "rejected" // Rechazado;
  | "stopped"; // Detenido manualmente

interface WebhookData {
  type: string;
  action: string;
  data: {
    id: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebhookData;
    // 3c019d78cb0cfbeb4b1ec6296a2ce46ab38ad69dc833af1aa79fb323d91bb5f0
    // Obtain the x-signature value from the header
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";

    // Obtain Query params related to the request URL
    // const urlParams = new URLSearchParams(window.location.search);
    // console.log("🚀 ~ POST ~ urlParams:", urlParams);
    // const dataID = urlParams.get("data.id");
    // console.log("🚀 ~ POST ~ dataID:", dataID);

    // Separating the x-signature into parts
    const parts = xSignature.split(",");
    // console.log("Webhook MercadoPago recibido:", JSON.stringify(body));
    // Determinar el tipo de notificación
    const notificationType = body.type;
    const action = body.action;
    const entityId = body.data?.id;

    if (!entityId) {
      console.error("No se recibió ID en el webhook");
      return Response.json(
        { received: true, error: "No entity ID" },
        { status: 400 },
      );
    }

    // Procesar según el tipo de notificación
    if (notificationType === "preapproval") {
      // Notificación de suscripción/preapproval
      console.log("📋 Procesando webhook de suscripción:", entityId);
      await processPreapprovalWebhook(entityId, action);
    } else if (notificationType === "order" || notificationType === "payment") {
      // Notificación de pago único (orders)
      console.log("💰 Procesando webhook de pago:", entityId);
      await processPaymentWebhook(entityId);
    } else {
      console.log("Ignorando tipo de notificación:", notificationType);
      return Response.json({ received: true, ignored: true });
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.log("=== ERROR ===");
    console.log(error?.message); // Solo el mensaje, no todo el stack
    console.log("=== CODIGO ===");
    console.log(error?.code);
    console.error(" Error procesando webhook:", error);
    return Response.json(
      { received: true, error: "Processing error" },
      { status: 500 },
    );
  }
}

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

    if (!response.ok) {
      console.error("Error fetching payment from MP:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting payment details:", error);
    return null;
  }
}

// ============================================
// Mapping de status de MP al enum de Prisma
function mapMPPaymentStatus(mpStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    approved: "approved",
    pending: "pending",
    in_process: "in_process",
    rejected: "rejected",
    cancelled: "cancelled",
    refunded: "refunded",
    failed: "failed",
    charged_back: "charged_back", // Contracargo
    authorized: "authorized", // Autorizado sin capturar
  };
  return statusMap[mpStatus] || "pending";
}

async function processPaymentStatus(payment: any) {
  const status = payment.status as MPPaymentStatus;
  const statusDetail = payment.status_detail;
  
  // Si status_detail es "accredited", el pago fue aprobado aunque el status sea "pending"
  // Esto puede pasar con 3DS donde el status queda en pending pero el detail indica acreditado
  let statusTyped: PaymentStatus;
  if (statusDetail === "accredited") {
    statusTyped = "approved";
  } else {
    // Mapear el status de MP al enum de Prisma
    statusTyped = mapMPPaymentStatus(status);
  }
  
  const externalReference = payment.external_reference;

  // Buscar el prospecto por external_reference (que contiene el prospectId)
  let customerPhone = externalReference.slice(-10);
  let prospectId: string | null = null;

  if (!customerPhone && payment.payer?.email) {
    const prospect = await prisma.prospects.findFirst({
      where: { phone: customerPhone },
    });

    if (prospect) {
      prospectId = prospect.id;
    }
  }

  // Verificar si ya existe el pago
  // console.log("🚀 ~ processPaymentStatus ~ payment:", payment);
  const existingPayment = await prisma.payments.findFirst({
    where: { mpPreferenceId: String(payment.id) },
  });
  if (existingPayment) {
    // Actualizar pago existente
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
    // Insertar nuevo pago
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
        dateCreated: payment.created_date
          ? new Date(payment.created_date)
          : null,
        threeDsStatus: payment.transactions?.payments?.[0]?.status || null,
        threeDsStatusDetail: payment.transactions?.payments?.[0]?.status_detail || null,
      },
    });

    console.log("✅ Payment guardado:", payment.id);
  }

  // Actualizar el prospecto según el estado del pago
  if (prospectId && status === "approved") {
    await prisma.prospects.update({
      where: { id: prospectId },
      data: {
        paymentPending: false,
      },
    });

    console.log("✅ Prospecto actualizado a miembro:", prospectId);
  }

  // Log para otros estados
  switch (status) {
    case "pending":
      console.log("⏳ Pago pendiente:", payment.id);
      break;
    case "rejected":
      console.log("❌ Pago rechazado:", payment.id, payment.status_detail);
      break;
    case "cancelled":
      console.log("🚫 Pago cancelado:", payment.id);
      break;
    case "refunded":
      console.log("💸 Pago reembolsado:", payment.id);
      break;
    case "in_process":
      console.log("🔄 Pago en proceso:", payment.id);
      break;
    case "in_mediation":
      console.log("⚖️ Pago en mediación:", payment.id);
      break;
    case "charged_back":
      console.log("⚠️ Contracargo/disputa iniciado:", payment.id);
      break;
    case "authorized":
      console.log("🔐 Pago autorizado (sin capturar):", payment.id);
      break;
  }
}
/**
 * Procesa webhook de preapproval (suscripción)
 */
async function processPreapprovalWebhook(
  preapprovalId: string,
  action: string,
) {
  console.log("Preapproval webhook:", { preapprovalId, action });

  // Obtener detalles del preapproval desde MercadoPago
  const preapproval = await getPreapprovalDetails(preapprovalId);

  if (!preapproval) {
    console.error("❌ No se pudieron obtener detalles del preapproval");
    return;
  }

  console.log("Preapproval details:", {
    id: preapproval.id,
    status: preapproval.status,
    externalReference: preapproval.external_reference,
    nextPaymentDate: preapproval.next_payment_date,
  });

  // Buscar la suscripción en nuestra DB
  const existingSubscription = await prisma.subscriptions.findFirst({
    where: { mpPreapprovalId: preapprovalId },
  });

  const now = new Date();
  const prospectId = preapproval.external_reference;

  if (existingSubscription) {
    // Actualizar suscripción existente
    await prisma.subscriptions.update({
      where: { id: existingSubscription.id },
      data: {
        status: mapMPPreapprovalStatus(preapproval.status) as any,
        nextBillingDate: preapproval.next_payment_date
          ? new Date(preapproval.next_payment_date)
          : existingSubscription.nextBillingDate,
      },
    });

    console.log(
      "✅ Suscripción actualizada:",
      preapprovalId,
      preapproval.status,
    );
  } else {
    console.log("⚠️ Suscripción no encontrada en DB:", preapprovalId);
  }

  // Procesar según el estado del preapproval
  await processPreapprovalStatus(preapproval, prospectId);
}

async function getPreapprovalDetails(preapprovalId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Error fetching preapproval:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting preapproval details:", error);
    return null;
  }
}

async function processPreapprovalStatus(
  preapproval: any,
  prospectId: string | null,
) {
  const status = preapproval.status as MPPreapprovalStatus;
  const now = Date.now();

  // Actualizar prospecto según estado
  if (prospectId) {
    switch (status) {
      case "authorized":
      case "active":
        // Suscripción activa - miembro puede acceder
        await prisma.prospects.update({
          where: { id: prospectId },
          data: {
            paymentPending: false,
          },
        });
        console.log("✅ Miembro activado por suscripción:", prospectId);
        break;

      case "cancelled":
      case "expired":
        // Suscripción cancelada/expirada - bloquear acceso
        await prisma.prospects.update({
          where: { id: prospectId },
          data: {
            paymentPending: true,
            blockedReason: `Suscripción ${status}`,
          },
        });
        console.log("⛔ Acceso bloqueado por suscripción:", status);
        break;

      default:
        console.log("📋 Estado de suscripción:", status);
    }
  }
}

function mapMPPreapprovalStatus(mpStatus: string): string {
  const mapping: Record<string, string> = {
    authorized: "active",
    active: "active",
    pending: "paused",
    paused: "paused",
    cancelled: "cancelled",
    expired: "expired",
    rejected: "rejected",
  };
  return mapping[mpStatus] || "pending";
}

// Alias para mantener compatibilidad con el código original
async function processPaymentWebhook(paymentId: string) {
  const payment = await getPaymentDetails(paymentId);
  if (!payment) {
    console.error("No se pudieron obtener detalles del pago:", paymentId);
    return;
  }

  console.log("💰 Payment details:", {
    id: payment.id,
    status: payment.status,
    statusDetail: payment.status_detail,
    externalReference: payment.external_reference,
    amount: payment.total_paid_amount,
  });

  await processPaymentStatus(payment);
}

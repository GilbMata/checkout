"use server";

import { db } from "@/lib/db/index";
import { prospects, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Estado del pago en MercadoPago
type MPPaymentStatus =
  | "approved" // Pago aprobado
  | "pending" // Pago pendiente
  | "rejected" // Pago rechazado
  | "cancelled" // Pago cancelado
  | "refunded" // Pago reembolsado
  | "in_process" // Pago en proceso de revisión
  | "in_mediation" // Pago en mediación
  | "failed"; // Pago en mediación

// Estado de suscripción/preapproval en MercadoPago
type MPPreapprovalStatus =
  | "authorized" // Autorizado, listo para cobrar
  | "active" // Activo, cobrando
  | "pending" // Pendiente
  | "paused" // Pausado
  | "cancelled" // Cancelado
  | "expired" // Expirado
  | "rejected"; // Rechazado;

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
    console.log("Webhook MercadoPago recibido:", JSON.stringify(body));

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
  } catch (error) {
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

async function processPaymentStatus(payment: any) {
  const status = payment.status as MPPaymentStatus;
  const externalReference = payment.external_reference;

  // Buscar el prospecto por external_reference (que contiene el prospectId)
  let prospectId = externalReference;

  // Si no hay external_reference, intentar buscar por email del payer
  if (!prospectId && payment.payer?.email) {
    const prospect = await prisma.prospects.findFirst({
      where: { phone: externalReference },
    });

    if (prospect) {
      prospectId = prospect.id;
    }
  }

  // Verificar si ya existe el pago
  const existingPayment = await prisma.payments.findFirst({
    where: { mpPreferenceId: String(payment.id) },
  });

  if (existingPayment) {
    // Actualizar pago existente
    await prisma.payments.update({
      where: { id: existingPayment.id },
      data: {
        status,
        statusDetail: payment.status_detail || null,
        dateApproved: payment.date_approved
          ? new Date(payment.date_approved)
          : null,
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
        status,
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
  const existingSubscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.mpPreapprovalId, preapprovalId))
    .limit(1);

  const now = Date.now();
  const prospectId = preapproval.external_reference;

  if (existingSubscription.length > 0) {
    // Actualizar suscripción existente
    const sub = existingSubscription[0];

    await db
      .update(subscriptions)
      .set({
        status: mapMPPreapprovalStatus(preapproval.status),
        nextBillingDate: preapproval.next_payment_date
          ? new Date(preapproval.next_payment_date).getTime()
          : sub.nextBillingDate,
        updatedAt: now,
      })
      .where(eq(subscriptions.mpPreapprovalId, preapprovalId));

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
        await db
          .update(prospects)
          .set({
            paymentPending: false,
            updatedAt: now,
          })
          .where(eq(prospects.id, prospectId));
        console.log("✅ Miembro activado por suscripción:", prospectId);
        break;

      case "cancelled":
      case "expired":
        // Suscripción cancelada/expirada - bloquear acceso
        await db
          .update(prospects)
          .set({
            paymentPending: true,
            blockedReason: `Suscripción ${status}`,
            updatedAt: now,
          })
          .where(eq(prospects.id, prospectId));
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

import prisma from "@/lib/db/prisma";
import {
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from "@/src/generated/prisma";
import crypto from "crypto";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a string is a valid UUID
 */
function isUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ============================================================================
// Constantes - Webhook Security
// ============================================================================

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET_SUBSCRIPTIONS;

// Estado de authorized payment en MercadoPago (pagos de suscripción)
type MPAuthorizedPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processing"
  | "paused"
  | "canceled"
  | "expired";

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
      console.error("❌ Firma inválida: componentes faltantes");
      return false;
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;

    const expectedHash = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash),
    );

    if (!isValid) {
      console.error("❌ Firma de webhook inválida");
    }

    return isValid;
  } catch (error) {
    console.error("❌ Error validando firma:", error);
    return false;
  }
}

// ============================================================================
// Handlers
// ============================================================================

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebhookData;
    // console.log("🚀 ~ POST ~ body:", body);
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";

    const notificationType = body.type;
    const action = body.action;
    const entityId = body.data?.id;

    console.log("🚀 ~ Webhook recibido. :", {
      notificationType,
      action,
      entityId,
    });

    if (!entityId) {
      return Response.json(
        { received: true, error: "No entity ID" },
        { status: 400 },
      );
    }

    // Validar firma
    // if (!validateWebhookSignature(xSignature, entityId, xRequestId)) {
    //   return Response.json(
    //     { received: true, error: "Invalid signature" },
    //     { status: 401 },
    //   );
    // }

    // Procesar según tipo
    if (notificationType === "subscription_authorized_payment") {
      await processAuthorizedPaymentWebhook(entityId, action);
    } else if (
      notificationType === "preapproval" ||
      notificationType === "subscription_preapproval"
    ) {
      await processPreapprovalWebhook(entityId, action);
    } else if (notificationType === "payment") {
      // Payments de suscripción también vienen por este topic
      await processSubscriptionPaymentWebhook(entityId, action);
    } else {
      console.log("Ignorando tipo:", notificationType);
      return Response.json({ received: true, ignored: true });
    }

    return Response.json({ received: true });
  } catch (error: any) {
    console.error("Error procesando webhook:", error?.message);
    return Response.json(
      { received: true, error: "Processing error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Authorized Payment Webhook
// ---------------------------------------------------------------------------

async function processAuthorizedPaymentWebhook(
  paymentId: string,
  action: string,
) {
  console.log("🔄 Authorized Payment webhook:", { paymentId, action });

  const mpPayment = await getAuthorizedPaymentDetails(paymentId);
  if (!mpPayment) {
    console.error("❌ No se pudieron obtener detalles del authorized payment");
    return;
  }

  console.log("📊 Authorized Payment:", {
    id: mpPayment.id,
    status: mpPayment.status,
    preapprovalId: mpPayment.preapproval_id,
  });

  const subscription = await prisma.subscriptions.findFirst({
    where: { mpPreapprovalId: mpPayment.preapproval_id },
  });

  if (!subscription) {
    console.error("❌ Suscripción no encontrada:", mpPayment.preapproval_id);
    return;
  }

  // Idempotency check
  const existingPayment = await prisma.subscriptionPayment.findFirst({
    where: { mpPaymentId: paymentId },
  });
  console.log(
    "🚀 ~ processAuthorizedPaymentWebhook ~ existingPayment:",
    existingPayment,
  );

  if (existingPayment) {
    await prisma.subscriptionPayment.update({
      where: { id: existingPayment.id },
      data: {
        status: mapMPAuthorizedPaymentStatus(mpPayment.status),
        lastAttemptAt: new Date(),
        dateApproved: mpPayment.date_approved
          ? new Date(mpPayment.date_approved)
          : null,
      },
    });
  } else {
    const amount = mpPayment.amount;
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        mpPaymentId: paymentId,
        status: mapMPAuthorizedPaymentStatus(mpPayment.status),
        amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
        currencyId: mpPayment.currency_id || "MXN",
        attemptsCount: 1,
        lastAttemptAt: new Date(),
        errorCode: mpPayment.rejection_code || null,
        errorReason: mpPayment.rejection_reason || null,
        dateApproved: mpPayment.date_approved
          ? new Date(mpPayment.date_approved)
          : null,
      },
    });
  }

  // Procesar estado
  const paymentStatus = mpPayment.status as MPAuthorizedPaymentStatus;

  switch (paymentStatus) {
    case "approved":
      console.log("✅ Pago de suscripción aprobado:", paymentId);
      await handleSubscriptionPaymentApproved(subscription.id);
      break;

    case "rejected":
      console.log("❌ Pago de suscripción rechazado:", paymentId);
      await handleSubscriptionPaymentRejected(subscription.id, mpPayment);
      break;

    case "pending":
    case "processing":
      console.log("⏳ Pago:", paymentStatus);
      break;

    case "expired":
    case "canceled":
      console.log("🚫 Pago expirado/cancelado:", paymentId);
      await handleSubscriptionPaymentRejected(subscription.id, mpPayment);
      break;
  }
}

async function getAuthorizedPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/authorized_payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Error fetching authorized payment:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting authorized payment:", error);
    return null;
  }
}

function mapMPAuthorizedPaymentStatus(
  mpStatus: string,
): SubscriptionPaymentStatus {
  const map: Record<string, SubscriptionPaymentStatus> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    processing: "pending",
    paused: "pending",
    canceled: "failed",
    expired: "failed",
  };
  return map[mpStatus] || "pending";
}

// ---------------------------------------------------------------------------
// Preapproval Webhook
// ---------------------------------------------------------------------------

async function processPreapprovalWebhook(
  preapprovalId: string,
  action: string,
) {
  console.log("📋 Preapproval webhook:", { preapprovalId, action });

  const preapproval = await getPreapprovalDetails(preapprovalId);
  if (!preapproval) {
    console.error("❌ No se pudieron obtener detalles del preapproval");
    return;
  }

  console.log("📊 Preapproval:", {
    id: preapproval.id,
    status: preapproval.status,
    externalReference: preapproval.external_reference,
  });

  const subscription = await prisma.subscriptions.findFirst({
    where: { mpPreapprovalId: preapprovalId },
  });

  if (!subscription) {
    console.error("❌ Suscripción no encontrada:", preapprovalId);
    return;
  }

  // Actualizar suscripción
  await prisma.subscriptions.update({
    where: { id: subscription.id },
    data: {
      status: mapMPPreapprovalStatus(preapproval.status),
      nextBillingDate: preapproval.next_payment_date
        ? new Date(preapproval.next_payment_date)
        : subscription.nextBillingDate,
    },
  });

  // Procesar estado
  await processPreapprovalStatus(preapproval, subscription.prospectId);
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

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error getting preapproval:", error);
    return null;
  }
}

function mapMPPreapprovalStatus(mpStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    authorized: "active",
    active: "active",
    pending: "paused",
    paused: "paused",
    cancelled: "cancelled",
    expired: "expired",
  };
  return map[mpStatus] || "pending";
}

async function processPreapprovalStatus(preapproval: any, prospectId: string) {
  const status = preapproval.status;

  switch (status) {
    case "authorized":
    case "active":
      await prisma.prospects.update({
        where: { id: prospectId },
        data: { paymentPending: false },
      });
      break;

    case "cancelled":
    case "expired":
      await prisma.prospects.update({
        where: { id: prospectId },
        data: {
          paymentPending: true,
          blockedReason: `Suscripción ${status}`,
        },
      });
      break;
  }
}

// ---------------------------------------------------------------------------
// Payment Handlers
// ---------------------------------------------------------------------------

async function handleSubscriptionPaymentApproved(subscriptionId: string) {
  // Obtener la suscripción actual para decrementar pending_installments
  const subscription = await prisma.subscriptions.findUnique({
    where: { id: subscriptionId },
  });

  // Calcular nuevos pending installments
  const newPendingInstallments =
    subscription?.pendingInstallments != null &&
    subscription.pendingInstallments > 0
      ? subscription.pendingInstallments - 1
      : subscription?.pendingInstallments;

  await prisma.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      status: "active",
      lastPaymentStatus: "approved",
      failedAttempts: 0,
      lastBillingDate: new Date(),
      pendingInstallments: newPendingInstallments,
    },
  });

  // Actualizar prospecto
  if (subscription) {
    await prisma.prospects.update({
      where: { id: subscription.prospectId },
      data: {
        paymentPending: false,
        blockedReason: null,
      },
    });
  }
}

async function handleSubscriptionPaymentRejected(
  subscriptionId: string,
  mpPayment: any,
) {
  const paymentId = String(mpPayment.id);

  // 1. Buscar si el pago ya está registrado
  const existingPayment = await prisma.subscriptionPayment.findFirst({
    where: { mpPaymentId: paymentId },
  });

  // 2. Si ya existe, NO hacer nada (evitar duplicación)
  if (existingPayment) {
    console.log("⚠️ Pago rechazado ya registrado:", paymentId);
    return;
  }

  // 3. Si no existe, crear el registro del pago rechazado
  const amount = mpPayment.transaction_amount;
  await prisma.subscriptionPayment.create({
    data: {
      subscriptionId,
      mpPaymentId: paymentId,
      status: "rejected",
      amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
      currencyId: mpPayment.currency_id || "MXN",
      attemptsCount: 1,
      lastAttemptAt: new Date(),
      errorCode: mpPayment.status_detail || null,
      errorReason: mpPayment.status_detail || "Pago rechazado",
    },
  });

  // 4. Obtener suscripción para actualizar failedAttempts
  const subscription = await prisma.subscriptions.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) return;

  // Contar pagos rechazados en subscription_payments para consistency
  const rejectedPaymentsCount = await prisma.subscriptionPayment.count({
    where: {
      subscriptionId,
      status: "rejected",
    },
  });

  const newFailedAttempts = rejectedPaymentsCount;

  // Calcular nuevos pending installments (decrementar en rechazo)
  const newPendingInstallments =
    subscription?.pendingInstallments != null &&
    subscription.pendingInstallments > 0
      ? subscription.pendingInstallments - 1
      : subscription?.pendingInstallments;

  let newStatus: SubscriptionStatus = subscription.status;
  let blockedReason = `Pago rechazado (${newFailedAttempts} intentos)`;

  if (newFailedAttempts >= 3) {
    newStatus = "cancelled";
    blockedReason = "Suscripción cancelada por pagos rechazados";
  } else {
    newStatus = "past_due";
  }

  await prisma.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      status: newStatus,
      lastPaymentStatus: "rejected",
      failedAttempts: newFailedAttempts,
      pendingInstallments: newPendingInstallments,
    },
  });

  await prisma.prospects.update({
    where: { id: subscription.prospectId },
    data: {
      paymentPending: true,
      blockedReason,
    },
  });
}

async function handleSubscriptionPaymentRefunded(
  subscriptionId: string,
  mpPayment: any,
) {
  const subscription = await prisma.subscriptions.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) return;

  console.log("💸 Procesando reembolso para:", subscriptionId);

  // Primero, buscar o crear el registro de payment
  const paymentId = String(mpPayment.id);
  let paymentRecord = await prisma.subscriptionPayment.findFirst({
    where: { mpPaymentId: paymentId },
  });

  if (paymentRecord) {
    // Actualizar existente a refunded
    await prisma.subscriptionPayment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "refunded",
        errorReason: mpPayment.description || "Reembolsado por el comprador",
      },
    });
  } else {
    // Crear nuevo registro como refunded (el pago fue procesado y luego reembolsado)
    const amount = mpPayment.transaction_amount;
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        mpPaymentId: paymentId,
        status: "refunded",
        amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
        currencyId: mpPayment.currency_id || "MXN",
        attemptsCount: 1,
        errorReason: mpPayment.description || "Reembolsado",
      },
    });
  }

  // Actualizar suscripción a estado refunded
  await prisma.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      status: "refunded",
      lastPaymentStatus: "refunded",
    },
  });

  // Bloquear al prospect
  await prisma.prospects.update({
    where: { id: subscription.prospectId },
    data: {
      paymentPending: true,
      blockedReason: "Pago reembolsado",
    },
  });
}

async function handleSubscriptionPaymentPending(
  subscriptionId: string,
  mpPayment: any,
) {
  const paymentId = String(mpPayment.id);

  // Solo crear registro si no existe (no actualizar approved anterior)
  const existing = await prisma.subscriptionPayment.findFirst({
    where: { mpPaymentId: paymentId },
  });

  if (!existing) {
    const amount = mpPayment.transaction_amount;
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        mpPaymentId: paymentId,
        status: "pending",
        amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
        currencyId: mpPayment.currency_id || "MXN",
        attemptsCount: 1,
        lastAttemptAt: new Date(),
      },
    });
  }
}

async function handleSubscriptionPaymentCanceled(
  subscriptionId: string,
  mpPayment: any,
) {
  const paymentId = String(mpPayment.id);

  // Buscar o crear registro
  let paymentRecord = await prisma.subscriptionPayment.findFirst({
    where: { mpPaymentId: paymentId },
  });

  if (paymentRecord) {
    await prisma.subscriptionPayment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "cancelled",
        errorReason: mpPayment.description || "Pago cancelado",
      },
    });
  } else {
    const amount = mpPayment.transaction_amount;
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        mpPaymentId: paymentId,
        status: "cancelled",
        amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
        currencyId: mpPayment.currency_id || "MXN",
        attemptsCount: 1,
        errorReason: "Pago cancelado",
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Subscription Payment Webhook (topic: payment)
// ---------------------------------------------------------------------------

async function processSubscriptionPaymentWebhook(
  paymentId: string,
  action: string,
) {
  console.log("💳 Subscription Payment webhook:", { paymentId, action });

  const mpPayment = await getPaymentDetails(paymentId);
  // console.log("🚀 ~ processSubscriptionPaymentWebhook ~ mpPayment:", mpPayment);
  if (!mpPayment) {
    console.error("❌ No se pudieron obtener detalles del pago");
    return;
  }

  console.log("📊 Payment:", {
    id: mpPayment.id,
    status: mpPayment.status,
    externalReference: mpPayment.external_reference,
    statusDetail: mpPayment.status_detail,
  });

  // Buscar la suscripción - try multiple methods:
  // 1. By external_reference if it's a valid UUID (our subscription ID)
  // 2. By mpPreapprovalId (the actual MP preapproval_id from payment)
  // 3. By payer email
  // 4. By latest active subscription for any prospect
  const externalRef = mpPayment.external_reference;
  const preapprovalIdFromPayment = (mpPayment as any).preapproval_id;
  const payerEmail = (mpPayment as any).payer?.email;

  // Try by mpPreapprovalId (the MP preapproval_id from the payment)
  let subscription = await prisma.subscriptions.findFirst({
    where: { mpPreapprovalId: preapprovalIdFromPayment },
  });

  // Fallback 1: Buscar por external_reference (por si la suscripción se creó con estado "pending" tras rechazo)
  if (!subscription && externalRef) {
    subscription = await prisma.subscriptions.findFirst({
      where: { externalReference: externalRef },
    });
    if (subscription) {
      console.log(
        "🔄 Suscripción encontrada por external_reference:",
        externalRef,
      );
    }
  }

  // Fallback 2: Buscar por payer email (último recurso)
  if (!subscription && payerEmail) {
    subscription = await prisma.subscriptions.findFirst({
      where: { payerEmail: payerEmail },
      orderBy: { createdAt: "desc" },
    });
    if (subscription) {
      console.log("🔄 Suscripción encontrada por payer email:", payerEmail);
    }
  }

  if (!subscription) {
    console.error("❌ Suscripción no encontrada para payment:", paymentId);
    return;
  }

  await handleSubscriptionPaymentFromPayment(subscription.id, mpPayment);
}

async function getPaymentDetails(paymentId: string) {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN_SUBSCRIPTIONS}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Error fetching payment:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting payment details:", error);
    return null;
  }
}

async function handleSubscriptionPaymentFromPayment(
  subscriptionId: string,
  mpPayment: any,
) {
  // console.log(
  //   "🚀 ~ handleSubscriptionPaymentFromPayment ~ mpPayment:",
  //   mpPayment,
  // );
  const paymentId = String(mpPayment.id);
  const status = mpPayment.status;
  const statusDetail = mpPayment.status_detail;

  // Verificar si es un pago de suscripción (approved = éxito)
  if (status === "approved") {
    console.log("✅ Pago de suscripción aprobado:", paymentId);
    await handleSubscriptionPaymentApproved(subscriptionId);

    // Registrar en subscription_payments si no existe
    const existing = await prisma.subscriptionPayment.findFirst({
      where: { mpPaymentId: paymentId },
    });

    if (!existing) {
      const amount = mpPayment.transaction_amount;
      await prisma.subscriptionPayment.create({
        data: {
          subscriptionId,
          mpPaymentId: paymentId,
          status: "approved",
          amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
          currencyId: mpPayment.currency_id || "MXN",
          attemptsCount: 1,
          lastAttemptAt: new Date(),
          dateApproved: mpPayment.date_approved
            ? new Date(mpPayment.date_approved)
            : null,
        },
      });
    }
  } else if (status === "rejected") {
    console.log("❌ Pago de suscripción rechazado:", paymentId);
    await handleSubscriptionPaymentRejected(subscriptionId, mpPayment);
  } else if (status === "refunded") {
    console.log("💸 Pago de suscripción reembolsado:", paymentId);
    await handleSubscriptionPaymentRefunded(subscriptionId, mpPayment);
  } else if (status === "pending") {
    console.log("⏳ Pago de suscripción pendiente:", paymentId);
    await handleSubscriptionPaymentPending(subscriptionId, mpPayment);
  } else if (status === "in_process") {
    console.log("🔄 Pago de suscripción en proceso:", paymentId);
    await handleSubscriptionPaymentInProcess(subscriptionId, mpPayment);
  } else if (status === "canceled") {
    console.log("🚫 Pago de suscripción cancelado:", paymentId);
    await handleSubscriptionPaymentCanceled(subscriptionId, mpPayment);
  } else {
    console.log("⚠️ Estado de pago no manejado:", status);
  }
}

// ---------------------------------------------------------------------------
// In Process Payment Handler
// ---------------------------------------------------------------------------

async function handleSubscriptionPaymentInProcess(
  subscriptionId: string,
  mpPayment: any,
) {
  const paymentId = String(mpPayment.id);

  // El estado in_process es temporal - el pago está siendo procesado por MP
  // Solo crear/actualizar registro sin bloquear al usuario
  const existing = await prisma.subscriptionPayment.findFirst({
    where: { mpPaymentId: paymentId },
  });

  if (existing) {
    // Actualizar estado si ya existe
    await prisma.subscriptionPayment.update({
      where: { id: existing.id },
      data: {
        status: "pending", // Mapear in_process a pending
        lastAttemptAt: new Date(),
      },
    });
  } else {
    // Crear nuevo registro
    const amount = mpPayment.transaction_amount;
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        mpPaymentId: paymentId,
        status: "pending", // Mapear in_process a pending
        amount: amount != null ? BigInt(Math.round(amount * 100)) : null,
        currencyId: mpPayment.currency_id || "MXN",
        attemptsCount: 1,
        lastAttemptAt: new Date(),
      },
    });
  }

  // No bloqueamos al prospecto - el pago está en proceso
  console.log(
    "📝 Pago en proceso registrado - esperando confirmación:",
    paymentId,
  );
}

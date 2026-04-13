"use server";

import { db } from "@/lib/db/index";
import { payments, prospects } from "@/lib/db/schema";
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
    console.log("🔔 Webhook MercadoPago recibido:", JSON.stringify(body));
    // return Response.json({ received: true });

    // Solo procesamos notificaciones de payments
    if (body.type !== "order") {
      console.log("Ignorando tipo de notificación:", body.type);
      return Response.json({ received: true, ignored: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error("No se recibió ID de pago en el webhook");
      return Response.json(
        { received: true, error: "No payment ID" },
        { status: 400 },
      );
    }

    // Obtener detalles del pago desde MercadoPago
    const payment = await getPaymentDetails(paymentId);
    console.debug("🚀 ~ POST ~ payment:", payment);

    if (!payment) {
      console.error("No se pudieron obtener detalles del pago:", paymentId);
      return Response.json(
        { received: true, error: "Payment not found" },
        { status: 404 },
      );
    }

    console.log("💰 Payment details:", {
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      externalReference: payment.external_reference,
      amount: payment.total_paid_amount,
    });

    // Procesar el pago según su estado
    await processPaymentStatus(payment);

    return Response.json({ received: true });
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);
    return Response.json(
      { received: true, error: "Processing error" },
      { status: 500 },
    );
  }
}

async function getPaymentDetails(paymentId: string) {
  try {
    // Usar el SDK de MercadoPago para obtener los detallesh
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
  const now = Date.now();

  // Buscar el prospecto por external_reference (que contiene el prospectId)
  let prospectId = externalReference;

  // Si no hay external_reference, intentar buscar por email del payer
  if (!prospectId && payment.payer?.email) {
    const prospect = await db
      .select()
      .from(prospects)
      .where(eq(prospects.phone, externalReference))
      .limit(1);

    if (prospect.length > 0) {
      prospectId = prospect[0].id;
    }
  }

  // Guardar o actualizar el pago en nuestra base de datos
  const paymentRecord = {
    id: crypto.randomUUID(),
    prospectId: prospectId,
    mpPaymentId: String(payment.id),
    mpPreferenceId: String(payment.id) || null,
    status: status,
    statusDetail: payment.status_detail || null,
    transactionAmount: payment.total_paid_amount, // Store in cents
    currencyId: payment.currency || "MXN",
    paymentMethodId: payment.payment_method_id || null,
    paymentTypeId: payment.payment_type_id || null,
    installments: payment.installments || null,
    description: payment.description || null,
    externalReference: externalReference || null,
    dateApproved: payment.date_approved
      ? new Date(payment.date_approved).getTime()
      : null,
    dateCreated: payment.created_date
      ? new Date(payment.created_date).getTime()
      : null,
    createdAt: now,
    updatedAt: now,
  };

  // Verificar si ya existe el pago
  const existingPayment = await db
    .select()
    .from(payments)
    .where(eq(payments.mpPreferenceId, String(payment.id)))
    .limit(1);

  if (existingPayment.length > 0) {
    // Actualizar pago existente
    await db
      .update(payments)
      .set({
        status: paymentRecord.status,
        statusDetail: paymentRecord.statusDetail,
        dateApproved: paymentRecord.dateApproved,
        updatedAt: now,
      })
      .where(eq(payments.mpPreferenceId, String(payment.id)));

    console.log("✅ Payment actualizado:", payment.id);
  } else {
    // Insertar nuevo pago
    await db.insert(payments).values(paymentRecord);
    console.log("✅ Payment guardado:", payment.id);
  }

  // Actualizar el prospecto según el estado del pago
  if (prospectId && status === "approved") {
    await db
      .update(prospects)
      .set({
        paymentPending: false,
        updatedAt: now,
      })
      .where(eq(prospects.id, prospectId));

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

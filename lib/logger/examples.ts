// lib/logger/examples.ts
// Ejemplos de uso del logger en cada módulo

import { NextRequest, NextResponse } from "next/server";
import { paymentLogger, prospectLogger, webhookLogger } from "./logger";
// import { paymentLogger, prospectLogger, webhookLogger } from ".";

// ── Pagos ─────────────────────────────────────────────────

export async function processPayment(data: {
  paymentId: string;
  amount: number;
  currency: string;
  userId: string;
  ip: string;
}) {
  const traceId = crypto.randomUUID();

  paymentLogger.audit({
    eventType: "PAYMENT_INITIATED",
    userId: data.userId,
    ipAddress: data.ip,
    traceId,
    payload: {
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
    },
  });

  // Usando measure() — registra duración y resultado automáticamente
  return paymentLogger.measure(
    { eventType: "PAYMENT_COMPLETED", userId: data.userId, traceId },
    async () => {
      // const result = await stripe.charges.create(...)
      // return result
    },
  );
}

// ── Prospectos ────────────────────────────────────────────

export async function createProspect(data: {
  name: string;
  email: string;
  source: string;
  createdBy: string;
}) {
  // const prospect = await db.prospects.create(data)

  prospectLogger.audit({
    eventType: "PROSPECT_CREATED",
    userId: data.createdBy,
    success: true,
    payload: { name: data.name, email: data.email, source: data.source },
  });
}

// ── Webhooks (route handler de Next.js) ───────────────────

export async function POST(req: NextRequest) {
  const traceId = req.headers.get("stripe-signature") ?? crypto.randomUUID();

  webhookLogger.info({
    eventType: "WEBHOOK_RECEIVED",
    traceId,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    payload: { source: "stripe" },
  });

  try {
    // const event = stripe.webhooks.constructEvent(body, sig, secret)
    // await handleStripeEvent(event)

    webhookLogger.info({
      eventType: "WEBHOOK_PROCESSED",
      traceId,
      success: true,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    webhookLogger.error({
      eventType: "WEBHOOK_FAILED",
      traceId,
      success: false,
      err: err instanceof Error ? err : new Error(String(err)),
    });
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}

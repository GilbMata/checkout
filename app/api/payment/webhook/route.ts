/**
 * @deprecated Usar /api/webhooks/subscriptions para suscripciones
 *             Usar /api/webhooks/orders para pagos únicos
 * 
 * Redirige al endpoint correcto
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = body.type;

  if (type === "preapproval" || type === "subscription_authorized_payment") {
    return NextResponse.redirect(
      new URL("/api/webhooks/subscriptions", req.url),
      { status: 200 },
    );
  } else if (type === "payment" || type === "order") {
    return NextResponse.redirect(
      new URL("/api/webhooks/orders", req.url),
      { status: 200 },
    );
  }

  return NextResponse.json({ received: true, ignored: true });
}
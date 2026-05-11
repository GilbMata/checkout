/**
 * Webhook de Suscripciones de MercadoPago
 * Este endpoint maneja preapproval y subscription_authorized_payment
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type;

    // Solo procesar tipos de suscripción
    if (type === "preapproval" || type === "subscription_authorized_payment") {
      console.log("📧 Webhook de suscripción recibido:", type, body.data?.id);
      // TODO: integrar con lógica de suscripciones
    }

    // Siempre retornar 200 a MP
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing subscription webhook:", error);
    // Siempre retornar 200 a MP aunque haya error
    return NextResponse.json({ received: true });
  }
}

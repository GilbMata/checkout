"use server";

import { getSession } from "@/lib/auth/session";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const isTest = MP_ACCESS_TOKEN.startsWith("TEST-");
// Usar URL de sandbox si es modo test
const MP_BASE_URL = isTest
  ? "https://api.mercadopago.com"
  : "https://api.mercadopago.com";

export async function processPayment(data: any) {
  const session = await getSession();

  console.debug(
    "🚀 ~ processPayment ~ input:",
    JSON.stringify(data.formData, null, 2),
  );

  try {
    const paymentBody: any = {
      transaction_amount: Number(data.formData.transactionAmount) || 1000,
      token: data.formData.token,
      description: "Plan gimnasio Station 24",
      payment_method_id: data.formData.paymentMethodId,
      binary_mode: false,
      issuer_id: data.formData.issuer_id,
      payer: {
        email:
          data.formData.payer?.email || data.formData.email || "test@test.com",
      },
    };

    if (data.formData.installments && Number(data.formData.installments) > 1) {
      paymentBody.installments = Number(data.formData.installments);
    }
    if (data.formData.issuer_id) {
      paymentBody.issuer_id = data.formData.issuer_id;
    }

    console.debug(
      "🚀 ~ processPayment ~ full body:",
      JSON.stringify(paymentBody, null, 2),
    );

    const response = await fetch(`${MP_BASE_URL}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key":
          data.formData.external_reference || crypto.randomUUID(),
      },
      body: JSON.stringify(paymentBody),
    });

    const responseData = await response.json();
    console.debug("🚀 ~ processPayment ~ response:", responseData);
    console.debug("🚀 ~ processPayment ~ status:", response.status);

    if (!response.ok) {
      return {
        error: responseData.message || "Error en pago",
        details: responseData,
        status: response.status,
      };
    }

    return {
      status: responseData.status,
      id: responseData.id,
      status_detail: responseData.status_detail,
    };
  } catch (error: any) {
    console.error("❌ processPayment error:", error);

    return {
      error: error?.message || "Error procesando pago",
      details: null,
    };
  }
}

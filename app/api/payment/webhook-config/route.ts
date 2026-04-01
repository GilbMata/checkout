"use server";

import { mpConfig } from "@/lib/mercadopago";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Solo permitir configuración en desarrollo o con token específico
    const adminToken = req.headers.get("x-admin-token");
    if (adminToken !== process.env.ADMIN_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    switch (action) {
      case "get":
        return await getWebhookConfig();

      case "register":
        return await registerWebhook();

      case "remove":
        return await removeWebhook();

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Webhook config error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

async function getWebhookConfig() {
  try {
    // Obtener la URL del webhook actual
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`;

    return Response.json({
      webhookUrl,
      mode: mpConfig.isProd ? "prod" : "test",
      ready: true,
    });
  } catch (error) {
    console.error("Error getting webhook config:", error);
    return Response.json({ error: "Failed to get config" }, { status: 500 });
  }
}

async function registerWebhook() {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`;

    // La URL del webhook debe estar registrada en el panel de MercadoPago
    // Esta función solo devuelve la URL que necesita配置uración

    return Response.json({
      message: "Webhook URL configurada",
      webhookUrl,
      instructions:
        "Registra esta URL en el panel de MercadoPago: https://www.mercadopago.com.mx/developers/panel/notifications",
      mode: mpConfig.isProd ? "prod" : "test",
    });
  } catch (error) {
    console.error("Error registering webhook:", error);
    return Response.json(
      { error: "Failed to register webhook" },
      { status: 500 },
    );
  }
}

async function removeWebhook() {
  try {
    return Response.json({
      message:
        "Webhook eliminado (debes hacerlo desde el panel de MercadoPago)",
    });
  } catch (error) {
    console.error("Error removing webhook:", error);
    return Response.json(
      { error: "Failed to remove webhook" },
      { status: 500 },
    );
  }
}

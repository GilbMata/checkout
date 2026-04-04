import { MercadoPagoConfig, Order } from "mercadopago";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validar campos requeridos
    const requiredFields = ["token", "amount", "payer"];
    for (const field of requiredFields) {
      if (!body[field]) {
        console.error(`❌ Campo faltante: ${field}`);
        return NextResponse.json(
          { success: false, error: `Campo faltante: ${field}` },
          { status: 400 },
        );
      }
    }

    console.log(
      "✅ Validación pasada. Token:",
      body.token.substring(0, 10) + "...",
    );
    // Configurar el cliente de Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });

    const orderClient = new Order(client);

    // Crear la orden
    const orderData = {
      body: {
        type: "online",
        processing_mode: "automatic", // Procesamiento automático
        total_amount: String(body.amount),
        external_reference: body.external_reference,
        // description: body.description,
        transactions: {
          payments: [
            {
              amount: String(body.amount),
              payment_method: {
                id: body.payment_method_id,
                type: "credit_card",
                token: body.token,
                installments: Number(body.installments),
                // statement_descriptor: 'Store name'
              },
            },
          ],
        },
        payer: {
          email: body.payer, // Idealmente, el email del usuario logueado
        },
      },
    };

    console.debug("🚀 ~ POST ~ orderData:", orderData);
    const order = await orderClient.create(orderData);
    console.debug("🚀 ~ POST ~ order:", order);

    // Verificar el estado del pago
    const paymentStatus = order.status;
    const paymentDetail = order.status_detail;

    return NextResponse.json({
      success: paymentStatus === "processed",
      status: paymentStatus,
      status_detail: paymentDetail,
      order_id: order.id,
      payment_id: order.transactions?.payments?.[0]?.id,
    });
  } catch (error: any) {
    console.error("=== ERROR COMPLETO ===");
    console.error("Mensaje:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.cause?.body?.errors || error.message,
      },
      { status: 400 },
    );
  }
}

"use server";

import { generateMagicToken, saveMagicToken } from "@/lib/auth/otp";
import { prisma } from "@/lib/db/index";
import { createPlaticaClient } from "@/lib/whatsapp-sender";

// Crear cliente WhatsApp una sola vez
const whatsappClient = createPlaticaClient({
  channelId: process.env.PLATICA_CHANNEL_ID!,
  apiKey: process.env.PLATICA_API_KEY!,
  apiUrl: process.env.PLATICA_API_URL!,
  apiUrlOTP: process.env.PLATICA_API_URLOTP!,
  campaignId: process.env.PLATICA_CAMPAIGN_ID,
});

interface SendOTPParams {
  prospectId: string;
  planName: string;
  type: string;
}

export async function sendMsj(params: SendOTPParams): Promise<{
  success: boolean;
  type?: string;
  error?: string;
}> {
  try {
    let userId = params.prospectId;
    let type = params.type;
    const planName = params.planName;

    console.log("[sendMsj] Iniciando - type:", type, "prospectId:", userId);

    const prospect = await prisma.prospects.findUnique({
      where: { id: userId },
    });

    if (!prospect) {
      return { success: false, error: "Cliente no encontrado" };
    }

    console.log("[sendMsj] Prospecto:", prospect.firstName, "phone:", prospect.phone);

    const { phone, firstName } = prospect;
    const token = generateMagicToken();

    // Inicializar con tipo correcto
    let result: { ok: true; data: boolean } | { ok: false; error: string } | null = null;

    if (type === "paymentfailed") {
      console.log("[sendMsj] Guardando magic token...");
      await saveMagicToken(userId, token, type);

      const magicLink = `${process.env.APP_URL}/api/auth/magic-link?token=${token}`;
      console.log("[sendMsj] Enviando WhatsApp a:", phone, "magicLink:", magicLink);

      result = await whatsappClient.sendpaymentfailedMessage(
        prospect.phone,
        prospect.firstName,
        planName,
        magicLink,
      );
      console.log("[sendMsj] Result WhatsApp:", result);
    }
    if (type === "paymentsuccess") {
      result = await whatsappClient.sendpaymentsuccessMessage(
        prospect.phone,
        prospect.firstName,
        planName,
      );
    }

    if (!result) {
      return { success: false, error: "Tipo de mensaje no reconocido" };
    }

    if (!result.ok) {
      return { success: false, type, error: result.error };
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending whatsapp:", error);
    return {
      success: false,
      error: "Error al enviar el msj",
    };
  }
}

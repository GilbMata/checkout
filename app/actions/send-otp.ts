"use server";

import {
  clearOldOTP,
  generateOTP,
  saveOTP,
} from "@/lib/auth/otp";
import { prisma } from "@/lib/db/index";
import { sendOtpEmail } from "@/lib/otpsend/email/send-email";
import { createPlaticaClient } from "@/lib/whatsapp-sender";

export type OTPMethod = "whatsapp" | "email" | "PLATICA Desactivado via env";

// Crear cliente WhatsApp una sola vez
const whatsappClient = createPlaticaClient({
  channelId: process.env.PLATICA_CHANNEL_ID!,
  apiKey: process.env.PLATICA_API_KEY!,
  apiUrl: process.env.PLATICA_API_URL!,
  apiUrlOTP: process.env.PLATICA_API_URLOTP!,
});

interface SendOTPParams {
  prospectId: string;
  email?: string;
  phone?: string;
}

export async function sendOTP(params: SendOTPParams): Promise<{
  success: boolean;
  method: OTPMethod;
  error?: string;
}> {
  // const { traceId } = useCheckoutStore();
  const otp = generateOTP();

  try {
    const method = (process.env.OTP_DEFAULT_METHOD || "whatsapp") as OTPMethod;

    let userId = params.prospectId;

    const prospect = await prisma.prospects.findUnique({
      where: { id: userId },
    });

    if (!prospect) {
      return { success: false, method, error: "Cliente no encontrado" };
    }

    await clearOldOTP(userId);
    await saveOTP(userId, otp);

    if (method === "whatsapp") {
      if (process.env.PLATICA === "false") {
        // logger.debug({
        //   eventType: "ACCESS",
        //   traceId,
        //   payload: {
        //     msg: `[Platica] Desactivado via env`,
        //     OTP: otp,
        //   },
        // });
        console.log("🚀 ~ PLATICA Desactivado ~ otp:", otp);
        return { success: true, method: "PLATICA Desactivado via env" };
      }
      const result = await whatsappClient.sendOTP(prospect.phone, otp);
      if (!result.ok) {
        return { success: false, method, error: result.error };
      }
      return { success: true, method: "whatsapp" };
    } else {
      await sendOtpEmail(prospect.email, otp);
      return { success: true, method: "email" };
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return {
      success: false,
      method: (process.env.OTP_DEFAULT_METHOD || "whatsapp") as OTPMethod,
      error: "Error al enviar el código",
    };
  }
}

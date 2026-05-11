"use server";

import {
  clearOldOTP,
  generateMagicToken,
  generateOTP,
  saveMagicToken,
  saveOTP,
} from "@/lib/auth/otp";
import { prisma } from "@/lib/db/index";
import { sendOtpEmail } from "@/lib/otpsend/email/send-email";
import { createPlaticaClient } from "@/lib/whatsapp-sender";

export type OTPMethod = "whatsapp" | "email";

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
  try {
    const method = (process.env.OTP_DEFAULT_METHOD || "whatsapp") as OTPMethod;
    const otp = generateOTP();
    console.log("🚀 ~ sendOTP ~ otp:", otp);

    let userId = params.prospectId;

    const prospect = await prisma.prospects.findUnique({
      where: { id: userId },
    });

    if (!prospect) {
      return { success: false, method, error: "Cliente no encontrado" };
    }

    await clearOldOTP(userId);
    await saveOTP(userId, otp);

    const token = generateMagicToken();
    await saveMagicToken(userId, token);

    const magicLink = `${process.env.APP_URL}/api/auth/magic-link?token=${token}`;

    if (method === "whatsapp") {
      const result = await whatsappClient.sendOTP(prospect.phone, otp);
      if (!result.ok) {
        return { success: false, method, error: result.error };
      }
      return { success: true, method: "whatsapp" };
    } else {
      await sendOtpEmail(prospect.email, otp, magicLink);
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

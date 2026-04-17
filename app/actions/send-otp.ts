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

export type OTPMethod = "whatsapp" | "email";

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
      // const sent = await sendOTPWhatsApp(prospect.phone, otp);
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

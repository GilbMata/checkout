"use server";

import {
  clearOldOTP,
  generateMagicToken,
  generateOTP,
  saveMagicToken,
  saveOTP,
} from "@/lib/auth/otp";
import { db } from "@/lib/db/index";
import { prospects } from "@/lib/db/schema";
import { sendOtpEmail } from "@/lib/otpsend/email/send-email";
import { eq } from "drizzle-orm";

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
    // Validate email is not from a disposable provider
    // const emailValidation = validateDisposableEmail(params.email);
    // if (emailValidation.isDisposable) {
    //   return {
    //     success: false,
    //     method: (process.env.OTP_DEFAULT_METHOD || "whatsapp") as OTPMethod,
    //     error: emailValidation.message,
    //   };
    // }

    const method = (process.env.OTP_DEFAULT_METHOD || "whatsapp") as OTPMethod;
    const otp = generateOTP();
    console.log("🚀 ~ sendOTP ~ otp:", otp);

    let userId = params.prospectId;

    const existingProspect = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, userId))
      .limit(1);

    const prospect = existingProspect[0];
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
      // if (!sent) {
      //   console.error("Failed to send WhatsApp, falling back to email");
      //   await sendOtpEmail(prospect.email, otp, magicLink);
      //   return { success: true, method: "email" };
      // }
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

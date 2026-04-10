"use server";

import { verifyOTP } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db/index";
import { prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface VerifyOTPParams {
  phone: string;
  otp: string;
}

export async function verifyOTPAction(params: VerifyOTPParams) {
  try {
    const { phone, otp } = params;
    const user = await db
      .select()
      .from(prospects)
      .where(eq(prospects.phone, phone))
      .limit(1);
    if (!user[0]) {
      return { valid: false, error: "Usuario no encontrado" };
    }
    const valid = await verifyOTP(user[0].id, otp);
    console.log("🚀 ~ valid:", valid);

    if (!valid) {
      return { valid: false, error: "Código inválido" };
    }

    await createSession(user[0]);
    return { valid: true };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { valid: false, error: "Error al verificar el código" };
  }
}

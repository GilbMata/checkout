"use server";

import { verifyOTP } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/index";

interface VerifyOTPParams {
  phone: string;
  otp: string;
}

export async function verifyOTPAction(params: VerifyOTPParams) {
  try {
    const { phone, otp } = params;

    const user = await prisma.prospects.findFirst({
      where: { phone },
    });

    if (!user) {
      return { valid: false, error: "Usuario no encontrado" };
    }

    const valid = await verifyOTP(user.id, otp);

    if (!valid) {
      return { valid: false, error: "Código inválido" };
    }

    await createSession(user);
    return { valid: true };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { valid: false, error: "Error al verificar el código" };
  }
}

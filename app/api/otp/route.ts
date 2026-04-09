import { getProspectByEmailAction } from "@/app/actions/prospects";
import { db } from "@/lib/db/index";
import { otpRequests } from "@/lib/db/schema";
import { generateOTP, sendOTPEmail } from "@/lib/email";
import { otpSchema } from "@/lib/validations";
import { and, eq, gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

async function verifyOTPCode(email: string, code: string): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .select()
    .from(otpRequests)
    .where(and(eq(otpRequests.otp, code), gt(otpRequests.expiresAt, now)))
    .limit(1);

  return result.length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = otpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, code } = validation.data;
    const isValid = await verifyOTPCode(email, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Código inválido o expirado" },
        { status: 401 },
      );
    }

    const prospect = await getProspectByEmailAction(email);

    return NextResponse.json({
      success: true,
      message: "Verificación exitosa",
      prospect: prospect
        ? {
            id: prospect.id,
            email: prospect.email,
            firstName: prospect.firstName,
            lastName: prospect.lastName,
            isMember: !!prospect.idMember,
          }
        : null,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 },
      );
    }

    const prospect = await getProspectByEmailAction(email);
    if (!prospect) {
      return NextResponse.json(
        { error: "Prospecto no encontrado" },
        { status: 404 },
      );
    }

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: "Nuevo código enviado",
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

import {
  createProspectAction,
  getProspectByCurpAction,
  getProspectByEmailAction,
} from "@/app/actions/prospects";
import { generateOTP, sendOTPEmail } from "@/lib/email";
import { registrationSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const planId = body.planId;

    const validation = registrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      curp,
      firstName,
      lastName,
      birthDate,
      email,
      gender,
      areaCode,
      phone,
    } = validation.data;

    const existingByEmail = await getProspectByEmailAction(email);
    if (existingByEmail) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado" },
        { status: 409 },
      );
    }

    const existingByCurp = await getProspectByCurpAction(curp);
    if (existingByCurp) {
      return NextResponse.json(
        { error: "La CURP ya está registrada" },
        { status: 409 },
      );
    }

    const result = await createProspectAction({
      curp,
      firstName,
      lastName,
      birthDate,
      email,
      gender,
      areaCode,
      phone: phone || "",
      planId,
    });

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: "Prospecto creado. Se envió código de verificación.",
      prospectId: result.id,
    });
  } catch (error) {
    console.error("Error creating prospect:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

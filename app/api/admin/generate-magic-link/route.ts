import { generateMagicToken, saveMagicToken } from "@/lib/auth/otp";
import { prisma } from "@/lib/db/index";
import { NextResponse } from "next/server";

/**
 * Endpoint para generar un magic link para una suscripción específica
 * POST /api/admin/generate-magic-link
 * Body: { subscription_id: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription_id } = body;

    if (!subscription_id) {
      return NextResponse.json(
        { error: "subscription_id es requerido" },
        { status: 400 },
      );
    }

    // Buscar la suscripción
    const subscription = await prisma.subscriptions.findUnique({
      where: { id: subscription_id },
      include: {
        prospect: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Suscripción no encontrada" },
        { status: 404 },
      );
    }

    const prospect = subscription.prospect;

    // Generar token mágico
    const token = generateMagicToken();
    await saveMagicToken(prospect.id, token, undefined, subscription_id);

    // Generar el magic link
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const magicLink = `${appUrl}/api/auth/magic-link?token=${token}`;

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      prospect_email: prospect.email,
      prospect_phone: prospect.phone,
      magic_link: magicLink,
    });
  } catch (error) {
    console.error("Error generating magic link:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

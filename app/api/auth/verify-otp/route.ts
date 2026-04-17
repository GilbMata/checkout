import { verifyOTP } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/index";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    console.debug("🚀 ~ POST ~ email, otp :", email, otp);

    const user = await prisma.prospects.findUnique({
      where: { email },
    });

    console.debug("🚀 ~ POST ~ user:", user);
    if (!user) {
      return Response.json({ valid: false });
    }

    const userId = user.id;
    const valid = await verifyOTP(userId, otp);

    if (!valid) {
      return Response.json({ valid: false });
    }

    // Crear sesión con los datos completos del usuario
    await createSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    });

    return Response.json({ valid: true });
  } catch (error) {
    console.error(error);
    return Response.json({ valid: false }, { status: 500 });
  }
}

import { verifyOTP } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db/index";
import { prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    console.log("🚀 ~ POST ~ valid:");
    const { email, otp } = await req.json();
    console.debug("🚀 ~ POST ~ email, otp :", email, otp);
    const user = await db
      .select()
      .from(prospects)
      .where(eq(prospects.email, email));
    console.debug("🚀 ~ POST ~ user:", user);
    if (!user[0]) {
      return Response.json({ valid: false });
    }
    const userId = user[0].id;
    const valid = await verifyOTP(userId, otp);
    console.log("🚀 ~ POST ~ valid:", valid);
    if (!valid) {
      return Response.json({ valid: false });
    }
    // Crear sesión con los datos completos del usuario
    await createSession({
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      phone: user[0].phone,
    });
    return Response.json({ valid: true });
  } catch (error) {
    console.error(error);
    return Response.json({ valid: false }, { status: 500 });
  }
}

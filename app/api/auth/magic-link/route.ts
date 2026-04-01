import { getUserFromToken } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return redirect("/");

  const user = await getUserFromToken(token);

  if (!user) return redirect("/");

  await createSession(user.id);

  return redirect("/checkout2");
}

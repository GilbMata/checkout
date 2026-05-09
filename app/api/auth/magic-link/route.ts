import { getUserFromToken } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    // Token no proporcionado - mostrar página de error
    return redirect("/auth/magic-link/error?reason=invalid");
  }

  const result = await getUserFromToken(token);
  console.log("🚀 ~ GET ~ result:", result);

  if (!result) {
    // Token no válido o vencido - mostrar página de error
    return redirect("/auth/magic-link/error?reason=expired");
  }

  const { user, subscriptionId } = result;

  if (!user || !subscriptionId) {
    // Datos inválidos - mostrar página de error
    return redirect("/auth/magic-link/error?reason=invalid");
  }

  await createSession(user);

  // return redirect(`/auth/magic-link/success?subscription_id=${subscriptionId}`);
  return redirect(`/checkout/card-update?subscription_id=${subscriptionId}`);
}

// https://mrna-carnival-assessing-extreme.trycloudflare.com/api/auth/magic-link?token=2748f9e843085aa03f75779a552a002c199d0d09a7cbc0ef075e4740e04acb2b

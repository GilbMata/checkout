import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const cookieExpirationTime = process.env.COOKIE_EXPIRATION_TIME!;

type SessionPayload = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: "prospect" | "member";
};

export async function createSession(params: SessionPayload) {
  const token = await new SignJWT({
    id: params.id,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    phone: params.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(cookieExpirationTime)
    .sign(secret);
  const cookieStore = await cookies();
  cookieStore.set("station24-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("station24-session")?.value;
  console.log("🚀 ~ getSession ~ token:", token);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.delete("station24-session");
}

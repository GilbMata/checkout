import { db } from "@/lib/db/index";
import { magicLinks, otpRequests, prospects } from "@/lib/db/schema";
import crypto, { randomUUID } from "crypto";
import { and, desc, eq, gt } from "drizzle-orm";

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOTP(userId: string, otp: string) {
  // await redis.set(`otp:${email}`, otp, "EX", 300); // 5 min
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
  const createdAt = Date.now();

  await db.insert(otpRequests).values({
    id: randomUUID(),
    userId,
    otp,
    expiresAt,
    createdAt,
  });
}

export async function verifyOTP(userId: string, otp: string) {
  // const stored = await redis.get(`otp:${email}`);
  // if (!stored) return false;
  // return stored === otp;
  const result = await db
    .select()
    .from(otpRequests)
    .where(
      and(
        eq(otpRequests.userId, userId),
        eq(otpRequests.otp, otp),
        gt(otpRequests.expiresAt, Date.now()),
      ),
    );
  console.log("🚀 ~ verifyOTP ~ result:", result);

  return result.length > 0;
}

export async function canSendOTP(userId: string) {
  const last = await db
    .select()
    .from(otpRequests)
    .where(eq(otpRequests.userId, userId))
    .orderBy(desc(otpRequests.createdAt))
    .limit(1);

  if (!last[0]) return true;

  const lastTime = last[0].createdAt;
  const now = Date.now();

  // ⏱ 60 segundos cooldown
  return now - lastTime > 60 * 1000;
}

export async function otpAttempts(userId: string) {
  const last5min = Date.now() - 5 * 60 * 1000;

  const attempts = await db
    .select()
    .from(otpRequests)
    .where(
      and(eq(otpRequests.userId, userId), gt(otpRequests.createdAt, last5min)),
    );

  return attempts.length;
}

export async function clearOldOTP(userId: string) {
  await db.delete(otpRequests).where(eq(otpRequests.userId, userId));
}

export function generateMagicToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function saveMagicToken(userId: string, token: string) {
  // await redis.set(`magic:${token}`, email, "EX", 600);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await db.insert(magicLinks).values({
    token,
    userId,
    expiresAt,
  });
}

export async function getUserFromToken(token: string) {
  const result = await db
    .select()
    .from(magicLinks)
    .where(
      and(eq(magicLinks.token, token), gt(magicLinks.expiresAt, Date.now())),
    );

  const record = result[0];
  if (!record) return null;

  const user = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, record.userId));

  return user[0] ?? null;
}

import { prisma } from "@/lib/db/index";
import crypto from "crypto";

export function generateOTP() {
  // Genera OTP 6 digitos aleatorios
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOTP(userId: string, otp: string) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  console.log("🚀 ~ saveOTP ~ expiresAt:", expiresAt);

  await prisma.otpRequests.create({
    data: {
      userId,
      otp,
      expiresAt,
    },
  });
}

export async function verifyOTP(userId: string, otp: string) {
  if (process.env.NODE_ENV === "development") {
    if (otp === "123456") {
      return true;
    }
  }
  const now = new Date();

  const result = await prisma.otpRequests.findFirst({
    where: {
      userId,
      otp,
      expiresAt: { gt: now },
    },
  });
  console.log("🚀 ~ verifyOTP ~ result:", result);

  return !!result;
}

export async function canSendOTP(userId: string) {
  const last = await prisma.otpRequests.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!last) return true;

  const lastTime = last.createdAt.getTime();
  const now = Date.now();

  // 60 segundos cooldown
  return now - lastTime > 60 * 1000;
}

export async function otpAttempts(userId: string) {
  const last5min = new Date(Date.now() - 5 * 60 * 1000);

  const count = await prisma.otpRequests.count({
    where: {
      userId,
      createdAt: { gt: last5min },
    },
  });

  return count;
}

export async function clearOldOTP(userId: string) {
  await prisma.otpRequests.deleteMany({
    where: { userId },
  });
}

export function generateMagicToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function saveMagicToken(
  userId: string,
  token: string,
  type?: string,
  subscriptionId?: string,
) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  try {
    await prisma.magicLinks.create({
      data: {
        token,
        userId,
        type,
        subscriptionId,
        expiresAt,
      },
    });
  } catch (error) {
    console.log(error);
  }
}

export async function getUserFromToken(token: string) {
  const now = new Date();
  console.log("🚀 ~ getUserFromToken ~ now:", now);

  const record = await prisma.magicLinks.findFirst({
    where: {
      token,
      expiresAt: { gt: now },
    },
  });
  console.log("🚀 ~ getUserFromToken ~ record:", record);

  const subscriptionId = record?.subscriptionId || null;

  if (!record) return null;

  const user = await prisma.prospects.findUnique({
    where: { id: record.userId },
  });

  return { user, subscriptionId };
}

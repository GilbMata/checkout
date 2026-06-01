import { prisma } from "@/lib/db/index";

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
  if (process.env.NODE_ENV === "development" || process.env.OTP_BYPASS === "true") {
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



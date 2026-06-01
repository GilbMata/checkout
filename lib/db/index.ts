// Database client - Migrated to Prisma with PostgreSQL
// Install dependencies: npm install prisma @prisma/client && npx prisma generate

export { default as prisma } from "./prisma";

// Type exports for Prisma
export type {
  EmailValidationLogs,
  OtpRequests,
  Prospects,
} from "@/src/generated/prisma";

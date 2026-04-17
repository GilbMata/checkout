// Database client - Migrated to Prisma with PostgreSQL
// Install dependencies: npm install prisma @prisma/client && npx prisma generate

export { prisma } from "./prisma";

// Type exports for Prisma
export type {
  EmailValidationLogs,
  MagicLinks,
  OtpRequests,
  Payments,
  Prospects,
} from "@prisma/client";

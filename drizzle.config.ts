import type { Config } from "drizzle-kit";

// NOTE: This config is kept for reference but migration to Prisma is in progress
// See prisma/schema.prisma for the new PostgreSQL schema

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./sqlite.db",
  },
} satisfies Config;

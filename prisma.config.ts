// prisma.config.ts

import { defineConfig } from "@prisma/config";
import { config } from "dotenv";

config({ path: ".env, .env.development" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

// prisma.config.ts

import { defineConfig, env } from "@prisma/config";
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.development" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // url: process.env.DATABASE_URL,
  },
});

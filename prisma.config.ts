// prisma.config.ts

// import { defineConfig } from "@prisma/client/config";

import { defineConfig } from "prisma/config";
// import { dotenv } from "@prisma/client/runtime/library";

import { config } from "dotenv";
config();

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

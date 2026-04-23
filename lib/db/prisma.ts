// import { PrismaClient } from "@prisma/client";

import { PrismaClient } from "@/src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  // 1. Configurar el pool de conexión de 'pg'
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 2. Crear el adaptador
  const adapter = new PrismaPg(pool);

  // 3. Pasar el adaptador al constructor
  return new PrismaClient({ adapter });
};
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

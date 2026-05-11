// app/api/test-timezone/route.ts
import { prisma } from "@/lib/db/index";
import { NextResponse } from "next/server";

export async function GET() {
  // 1. Ver qué hora cree Node.js que es
  const nodeJsNow = new Date();

  // 2. Insertar un registro sin especificar createdAt (deja que @default(now()) actúe)
  const nuevo = await prisma.test.create({
    data: {
      // no incluyas createdAt
    },
  });

  // 3. Leer el registro recién creado
  const leido = await prisma.test.findUnique({
    where: { id: nuevo.id },
  });

  return NextResponse.json({
    nodeJsNow: nodeJsNow.toISOString(),
    nodeJsLocal: nodeJsNow.toString(),
    valorGuardado: leido?.createdAt,
  });
}

// app/api/receipt/[id]/route.ts

import prisma from "@/lib/db/prisma";
import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: paymentId } = await params;

  // Obtener payment de la base de datos usando Prisma
  const payment = await prisma.payments.findFirst({
    where: { mpPaymentId: paymentId },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  // Obtener email del prospect si existe
  let email = "";
  if (payment.prospectId) {
    const prospect = await prisma.prospects.findUnique({
      where: { id: payment.prospectId },
    });
    if (prospect) {
      email = prospect.email;
    }
  }

  // Formatear datos para el PDF
  const amount = payment.transactionAmount
    ? payment.transactionAmount / 100
    : 0;
  const plan = payment.description || "Plan Station24";
  const date = payment.dateApproved
    ? new Date(payment.dateApproved).toLocaleString("es-MX")
    : new Date().toLocaleString("es-MX");
  const method = payment.paymentMethodId || "No especificado";

  // Crear PDF con jsPDF
  const doc = new jsPDF();

  // Titulo
  doc.setFontSize(20);
  doc.text("COMPROBANTE DE PAGO", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.text(`ID Pago: ${payment.mpPaymentId || payment.id}`, 20, 40);
  doc.text(
    `Monto: $${amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    20,
    50,
  );
  doc.text(`Plan: ${plan}`, 20, 60);
  doc.text(`Fecha: ${date}`, 20, 70);
  doc.text(`Método: ${method}`, 20, 80);
  doc.text(`Email: ${email}`, 20, 90);

  // Generar PDF como array buffer
  const pdfBuffer = doc.output("arraybuffer");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=receipt-${paymentId}.pdf`,
    },
  });
}

"use server";

import { prisma } from "@/lib/db/index";
import { z } from "zod";

const subscriptionIdSchema = z.object({
  id: z.string().uuid("ID de suscripción inválido"),
});

export async function getSubscriptionDetails(id: string) {
  try {
    const validation = subscriptionIdSchema.safeParse({ id });

    if (!validation.success) {
      throw new Error(validation.error.issues[0].message);
    }

    const subscription = await prisma.subscriptions.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            email: true,
            curp: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!subscription) {
      throw new Error("Suscripción no encontrada");
    }

    // Obtener fecha del último intento de pago (cualquier status)
    const lastPayment = subscription.payments[0] || null;
    const lastPaymentAttemptAt = lastPayment?.lastAttemptAt || null;
    const lastPaymentStatus = lastPayment?.status || null;

    return {
      success: true,
      data: {
        id: subscription.id,
        planId: subscription.planId,
        planDescription: subscription.planDescription,
        mpPreapprovalId: subscription.mpPreapprovalId,
        payerEmail: subscription.payerEmail,
        prospectEmail: subscription.prospect.email,
        prospectCurp: subscription.prospect.curp,
        status: subscription.status,
        lastPaymentStatus: subscription.lastPaymentStatus,
        nextBillingDate: subscription.nextBillingDate,
        lastBillingDate: subscription.lastBillingDate,
        failedAttempts: subscription.failedAttempts,
        totalInstallments: subscription.totalInstallments,
        pendingInstallments: subscription.pendingInstallments,
        transactionAmount: subscription.transactionAmount,
        lastPaymentAttemptAt,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener la suscripción",
    };
  }
}
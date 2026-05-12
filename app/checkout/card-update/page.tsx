import { getMembershipAction } from "@/app/actions/evoActions";
import { getSubscriptionDetails } from "@/app/actions/subscriptions";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import CardUpdatePageContent from "./CardUpdatePageContent";

interface PageProps {
  searchParams: Promise<{
    subscription_id?: string;
    preapproval_id?: string;
  }>;
}

export default async function CardUpdatePage({ searchParams }: PageProps) {
  // Validar sesión en server
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const params = await searchParams;
  const subscriptionId = params.subscription_id;
  const preapprovalId = params.preapproval_id;

  if (!subscriptionId) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="text-center text-red-700">
            Parámetros de suscripción no proporcionados
          </p>
        </div>
      </div>
    );
  }

  const result = await getSubscriptionDetails(subscriptionId);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="text-center text-red-700">
            {result.error || "Error al cargar la suscripción"}
          </p>
        </div>
      </div>
    );
  }

  const data = result.data;
  const resolvedPreapprovalId = preapprovalId || data.mpPreapprovalId;

  if (!resolvedPreapprovalId) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-4 border border-red-300 rounded-lg bg-red-50">
          <p className="text-center text-red-700">
            Suscripción sin preapproval ID válido
          </p>
        </div>
      </div>
    );
  }

  // Obtener plan info
  let planInfo: Record<string, unknown> | null = null;
  if (data.planId) {
    try {
      const planResponse = await getMembershipAction(data.planId);
      if (planResponse) {
        planInfo = planResponse as Record<string, unknown>;
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
    }
  }

  const userName = session.firstName as string;
  const subscriptionEmail = data.payerEmail || data.prospectEmail || "";

  return (
    <CardUpdatePageContent
      userName={userName}
      subscription={{
        id: data.id,
        planId: data.planId,
        planDescription: data.planDescription ?? undefined,
        mpPreapprovalId: resolvedPreapprovalId ?? undefined,
        payerEmail: subscriptionEmail,
        prospectEmail: data.prospectEmail,
        prospectCurp: data.prospectCurp ?? undefined,
        status: String(data.status),
        lastPaymentStatus: data.lastPaymentStatus
          ? String(data.lastPaymentStatus)
          : undefined,
        nextBillingDate: data.nextBillingDate,
        lastBillingDate: data.lastBillingDate,
        failedAttempts: data.failedAttempts,
        totalInstallments: data.totalInstallments ?? undefined,
        pendingInstallments: data.pendingInstallments ?? undefined,
        lastPaymentAttemptAt: data.lastPaymentAttemptAt,
        transactionAmount: data.transactionAmount
          ? Number(data.transactionAmount) / 100
          : undefined,
      }}
      planInfo={planInfo}
    />
  );
}

"use client";

import CardUpdateClient from "./CardUpdateClient";
import MembershipInfo from "./MembershipInfo";
import WelcomeToast from "./WelcomeToast";
import UpdateSuccess from "./UpdateSuccess";
import { useSearchParams } from "next/navigation";

interface SubscriptionData {
  id: string;
  planId?: string;
  planDescription?: string;
  mpPreapprovalId?: string;
  payerEmail: string;
  prospectEmail: string;
  prospectCurp: string;
  status: string;
  lastPaymentStatus?: string;
  nextBillingDate?: Date | string | null;
  lastBillingDate?: Date | string | null;
  failedAttempts?: number;
  totalInstallments?: number | null;
  pendingInstallments?: number | null;
  lastPaymentAttemptAt?: Date | string | null;
  transactionAmount?: number;
}

interface PageClientProps {
  userName: string;
  subscription: SubscriptionData;
  planInfo: Record<string, unknown> | null;
}

export default function CardUpdatePageContent({ userName, subscription, planInfo }: PageClientProps) {
  const searchParams = useSearchParams();
  const isUpdated = searchParams.get("updated") === "true";

  if (isUpdated) {
    return (
      <>
        <WelcomeToast userName={userName} />
        <UpdateSuccess />
      </>
    );
  }

  return (
    <>
      <WelcomeToast userName={userName} />
      {planInfo && (
        <MembershipInfo
          planName={(planInfo.name as string) || subscription.planDescription || "Plan"}
          price={planInfo.price as number | undefined}
          frequency={planInfo.frequency as string | undefined}
          description={planInfo.description as string | undefined}
          features={planInfo.features as string[] | undefined}
          status={subscription.status}
          lastPaymentStatus={subscription.lastPaymentStatus}
          nextBillingDate={subscription.nextBillingDate}
          lastBillingDate={subscription.lastBillingDate}
          failedAttempts={subscription.failedAttempts}
          totalInstallments={subscription.totalInstallments}
          pendingInstallments={subscription.pendingInstallments}
          lastPaymentAttemptAt={subscription.lastPaymentAttemptAt}
          transactionAmount={subscription.transactionAmount}
        />
      )}
      <CardUpdateClient
        userName={userName}
        subscription={{
          id: subscription.id,
          preapprovalId: subscription.mpPreapprovalId || "",
          payerEmail: subscription.payerEmail,
          curp: subscription.prospectCurp || "",
          status: subscription.status,
          transactionAmount: subscription.transactionAmount ? subscription.transactionAmount * 100 : undefined,
        }}
      />
    </>
  );
}
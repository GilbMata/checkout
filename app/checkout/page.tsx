import { PlanNotFound } from "@/components/ui/plan-not-found";
import { logger } from "@/lib/logger/logger";
import { getBranchAction, getMembershipAction } from "../actions/evoActions";
import CheckoutClient from "./_componentes/CheckoutClient";
import WelcomePage from "./_componentes/WelcomePage";

interface SearchParams {
  planId?: string;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const planId = params.planId;

  const traceId = crypto.randomUUID();

  if (!planId) {
    return <WelcomePage />;
  }

  let plan: any = null;
  let branch: any = null;

  try {
    const planResponse = await getMembershipAction(planId);
    if (planResponse?.list && planResponse.qtde > 0) {
      plan = planResponse.list[0];
      const idBranch = plan.idBranch;
      const branchResponse = await getBranchAction(idBranch);
      if (Array.isArray(branchResponse) && branchResponse.length > 0) {
        branch = branchResponse[0];
      } else if (
        branchResponse?.branch &&
        Array.isArray(branchResponse.branch)
      ) {
        branch = branchResponse.branch[0];
      }
      logger.info({
        eventType: "ACCESS",
        traceId,
        payload: { planId, idBranch, planName: plan.name },
      });
    }
  } catch (err) {
    logger.error({
      eventType: "SYSTEM_ERROR",
      traceId,
      success: false,
      err: err instanceof Error ? err : new Error(String(err)),
      payload: { planId },
    });
  }

  if (!plan) {
    logger.warn({
      eventType: "SYSTEM_ERROR",
      traceId,
      payload: { planId, reason: "plan_not_found" },
    });
    return <PlanNotFound />;
  }
  let session = null;
  // session = await getSession();

  return (
    <CheckoutClient
      plan={plan}
      branch={branch}
      session={session}
      traceId={traceId}
    />
  );
}

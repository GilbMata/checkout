import { getSession } from "@/lib/auth/session";
import { getBranchAction, getMembershipAction } from "../actions/evoActions";
import { PlanNotFound } from "@/components/ui/plan-not-found";
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
    }
  } catch (err) {
    console.error(err);
  }

  if (!plan) {
    return <PlanNotFound />;
  }
  const session = await getSession();
  // console.log("🚀 ~ CheckoutPage ~ session:", session);

  return (
    // <MPCProvider>
    <CheckoutClient plan={plan} branch={branch} session={session} />
    // </MPCProvider>
  );
}

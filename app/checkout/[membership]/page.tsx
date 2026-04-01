// import { getMembership } from "@/lib/evo-api";
// import { useCheckoutFlow } from "@/hooks/useCheckoutFlow";
// import { getBranchAction, getMembershipAction } from "../actions/evoMember";
import { getBranchAction, getMembershipAction } from "@/app/actions/evoMember";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import StepEmail from "@/components/checkout/StepEmail";
import StepOTP from "@/components/checkout/StepOTP";
import StepPayment from "@/components/checkout/StepPayment";
import { getSession } from "@/lib/auth/session";
import { useCheckoutStore } from "@/store/useCheckoutStore";

export default async function CheckoutPage({ searchParams }: any) {
  const searchParam = await searchParams;
  const session = await getSession();
  const planId = await searchParam.planId;
  if (!planId) return <div>Plan no encontrado</div>;

  let plan: any = null,
    branch: any = null;
  try {
    const planResponse = await getMembershipAction(planId);

    if (planResponse?.list && planResponse.qtde > 0) {
      debugger;
      plan = planResponse.list[0];
      const idBranch = plan.idBranch;
      const branchResponse = await getBranchAction(idBranch);
      if (Array.isArray(branchResponse) && branchResponse.length > 0) {
        branch = branchResponse[0];
      } else if (
        branchResponse?.branch &&
        Array.isArray(branchResponse.branch)
      ) {
        // Por si la API devuelve { branch: [...] }
        branch = branchResponse.branch[0];
      }
      // console.debug("🚀 ~ CheckoutPage ~ idBranch:", idBranch)

      // console.debug("🚀 Sucursal obtenida:", branch[0]);
    }
    // setLoading(true);
  } catch (err) {
    console.error(err);
    // toast.error("Error API");
  }
  // finally {
  // setLoading(false);
  // }

  return <CheckoutClient plan={plan} branch={branch} />;
}

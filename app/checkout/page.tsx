import CheckoutClient from "@/components/checkout/CheckoutClient";
import { getSession } from "@/lib/auth/session";
import { getBranchAction, getMembershipAction } from "../actions/evoMember";

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
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Plan no seleccionado</h1>
          <p className=" mb-2">Serás redirigido en 5 segundos...</p>
          <p className="text-sm text-gray-400">
            Si no redirecciona, haz clic en el botón
          </p>
          <a
            href="https://station24.com.mx/unete"
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ir ahora
          </a>
          {/* <script
            dangerouslySetInnerHTML={{
              __html: `setTimeout(function(){window.location.href='https://station24.com.mx/unete'},5000)`,
            }}
          /> */}
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Plan no encontrado
          </h1>
          <p className="text-gray-600 mb-2">
            Serás redirigido en 5 segundos...
          </p>
          <a
            href="https://station24.com.mx/unete"
            className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ir ahora
          </a>
          <script
            dangerouslySetInnerHTML={{
              __html: `setTimeout(function(){window.location.href='https://station24.com.mx/unete'},5000)`,
            }}
          />
        </div>
      </div>
    );
  }
  const session = await getSession();
  // console.log("🚀 ~ CheckoutPage ~ session:", session);

  return <CheckoutClient plan={plan} branch={branch} session={session} />;
}

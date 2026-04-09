"use client";

import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useEffect } from "react";
import StepEmail from "./StepEmail";
import StepOTP from "./StepOTP";
import StepPayment from "./StepPayment";

// import Header from "../layout/Header";

export default function CheckoutClient({
  plan,
  branch,
}: {
  plan: any;
  branch: any;
}) {
  // console.log("Datos en Cliente:", { plan, branch });
  if (!plan) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-primary">
        <p className="animate-pulse">Cargando tu plan de entrenamiento...</p>
      </div>
    );
  }

  const { step, setPlan, setBranch } = useCheckoutStore();

  useEffect(() => {
    if (plan?.idMembership) {
      setPlan(plan);
      setBranch(branch);
    }
  }, [plan?.idMembership]);

  // const planId = plan.idMembership;
  // console.debug("🚀 ~ CheckoutClient ~ planId:", planId)
  // setPlanId(planId);

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Header plan={plan} /> */}
      {/* <Header /> */}

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden justify-center bg-black ">
        {/* LEFT */}
        <div className="fle  p-6">
          {step === "email" && <StepEmail />}
          {step === "otp" && <StepOTP />}
          {step === "payment" && <StepPayment />}
        </div>

        {/* RIGHT */}
        <div className="md:sticky md:top-0 h-screen p-6  ">
          {/* <PlanCheckout /> */}
        </div>
      </main>
    </div>
  );
}

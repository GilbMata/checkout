"use client";

import { getProspectByPhoneAction } from "@/app/actions/prospects";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useEffect, useState } from "react";
import PlanCheckout from "./PlanCheckout";
import StepEmail from "./StepEmail";
import StepOTP from "./StepOTP";
import StepPayment from "./StepPayment";

export default function CheckoutClient({
  plan,
  branch,
  session,
}: {
  plan: any;
  branch: any;
  session: any;
}) {
  const [loading, setLoading] = useState(true); // 🔥 inicia en true

  const { step, setPlan, setBranch, setStep, setProspect } = useCheckoutStore();

  useEffect(() => {
    const init = async () => {
      try {
        if (plan?.idMembership) {
          setPlan(plan);
          setBranch(branch);

          console.log("🚀 ~ init ~ session:", session);
          if (session) {
            const phone = session.phone;
            console.log("🚀 ~ init ~ phone:", phone);

            if (phone) {
              const prospect = await getProspectByPhoneAction(phone);
              console.log("🚀 ~ init ~ prospect:", prospect);

              setProspect(prospect as any);
              setStep("payment");
            }
          }
        }
      } catch (error) {
        console.error("Error en init:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [plan?.idMembership]);

  // 🔥 LOADER GLOBAL
  if (loading) {
    return (
      <div className=" inset-0 z-50 flex items-center justify-center backdrop-blur-sm h-">
        <div className="flex flex-col items-center gap-4 h-max">
          <div className="h-10 w-10  animate-spin rounded-full border-4 border-orange-500 border-t-black" />
          <p className="text-sm text-white-700 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // 🔴 fallback si no hay plan
  if (!plan) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-primary">
        <p className="animate-pulse">Cargando tu plan de entrenamiento...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex flex-1 flex-col md:flex-row overflow-hidden justify-center bg-black">
        <div className="p-6">
          {step === "email" && <StepEmail />}
          {step === "otp" && <StepOTP />}
          {step === "payment" && <StepPayment />}
        </div>

        <div className="md:sticky md:top-0 h-screen p-6">
          <PlanCheckout />
        </div>
      </main>
    </div>
  );
}

"use client";

import stationimg from "@/public/general-logotipo-05.png";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import Image from "next/image";
import { useEffect } from "react";
import PlanCheckout from "./PlanCheckout";
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

  const { step, setPlanId } = useCheckoutStore();

  useEffect(() => {
    if (plan?.idMembership) {
      setPlanId(plan.idMembership);
    }
  }, [plan?.idMembership]);

  // const planId = plan.idMembership;
  // console.debug("🚀 ~ CheckoutClient ~ planId:", planId)
  // setPlanId(planId);

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Header plan={plan} /> */}
      <header className="bg-blac shadow-md sticky top-0 z-50 backdrop-blur-md border- w-full">
        <div className="max-w-7xl mx-auto px- sm:px- lg:px-">
          <div className="flex items-center justify-around h-25">
            {/* Logo */}
            <div className="tracking-tighter">
              <Image
                src={stationimg}
                alt="Station 24 Fitness"
                className="h-7 w-auto object-contain"
                priority
              />
            </div>

            {/* Nombre de Sucursal */}
            {branch?.name && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                  Sucursal
                </span>
                <span className="text-white text-2xl font-black uppercase tracking-tigh leading-none size-">
                  {branch.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden justify-center bg-black ">
        {/* LEFT */}
        <div className="fle  p-6">
          {step === "email" && <StepEmail />}
          {step === "otp" && <StepOTP />}
          {step === "payment" && (
            <StepPayment planId={plan?.idMembership?.toString() || ""} />
          )}
        </div>

        {/* RIGHT */}

        <div className="md:sticky md:top-0 h-screen p-6  ">
          <PlanCheckout plan={plan} />
        </div>
      </main>
    </div>
  );
}

"use client";

import { getProspectByPhoneAction } from "@/app/actions/prospects";
import StepCurp from "@/app/checkout/_componentes/StepCurp";
import StepOTP from "@/app/checkout/_componentes/StepOTP";
import StepPayment from "@/app/checkout/_componentes/StepPayment";
import { logger } from "@/lib/logger/logger";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useEffect, useState } from "react";
import ClientForm from "./ClientForm";
import LoadComp from "./LoadComp";

export default function CheckoutClient({
  plan,
  branch,
  session,
  traceId,
}: {
  plan: any;
  branch: any;
  session: any;
  traceId: string;
}) {
  const [loading, setLoading] = useState(true);
  const {
    step,
    setPlan,
    setBranch,
    setStep,
    setProspect,
    setTraceId,
    prospect,
  } = useCheckoutStore();

  useEffect(() => {
    const init = async () => {
      setTraceId(traceId);
      try {
        if (plan?.idMembership) {
          setPlan(plan);
          setBranch(branch);
          if (session) {
            const phone = session.phone;
            if (phone) {
              const prospect = await getProspectByPhoneAction(phone);
              if (prospect) {
                setProspect(prospect as any);

                logger.info({
                  eventType: "ACCESS",
                  traceId,
                  userId: session?.user?.id, // ajusta según tu estructura de session
                  payload: { status: "COOKIE_FOUND" },
                });
                setStep("payment");
              } else {
                // Session existe pero prospect no está en DB - ir a flujo de registro

                setStep("email");
              }
            } else {
              setStep("email");
            }
          } else {
            setStep("email");
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
  // if (loading) {
  //   return (
  //     <div className=" inset-0 z-50 flex items-center justify-center backdrop-blur-sm h-">
  //       <div className="flex flex-col items-center gap-4 h-max">
  //         <div className="h-10 w-10  animate-spin rounded-full border-4 border-orange-500 border-t-black" />
  //         <p className="text-sm text-white-700 font-medium">Cargando...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // 🔴 fallback si no hay plan
  if (!plan) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-primary">
        <p className="animate-pulse">Cargando tu plan de entrenamiento...</p>
      </div>
    );
  }

  return (
    <div className=" min-h-screen">
      {/* Spinner encima de todo, sin desmontar el contenido */}
      <LoadComp
        isVisible={loading}
        title="Cargando..."
        description="Por favor espera mientras cargamos tu plan de entrenamiento..."
      />
      {/* <main className="flex flex-1 flex-col md:flex-row overflow-hidden justify-center bg-black"> */}
      <main className="flex flex-col md:flex-row justify-center md:space-x-3 bg-black">
        <div className="p-6 md:w-l">
          {/* 👇 siempre montado, invisible durante carga */}
          <div className={loading ? "invisible" : ""}>
            {step === "email" && <ClientForm />}
            {step === "otp" && <StepOTP />}
            {step === "curp" && <StepCurp />}
            {step === "payment" && <StepPayment />}
          </div>
        </div>

        {/* <div className="p-6"> */}
        {/* <PlanCheckout /> */}
        {/* <PlanCheckout2 /> */}
        {/* </div> */}
      </main>
    </div>
  );
}

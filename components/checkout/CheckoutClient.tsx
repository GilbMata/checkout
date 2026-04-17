"use client";

import { getProspectByPhoneAction } from "@/app/actions/prospects";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useState } from "react";
import PlanCheckout from "./PlanCheckout";
import StepEmail from "./StepEmail";
import StepOTP from "./StepOTP";
import StepPayment from "./StepPayment";
let mpInitialized = false;

export default function CheckoutClient({
  plan,
  branch,
  session,
}: {
  plan: any;
  branch: any;
  session: any;
}) {
  const [loading, setLoading] = useState(true);
  const { step, setPlan, setBranch, setStep, setProspect } = useCheckoutStore();

  useEffect(() => {
    if (!mpInitialized && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) {
      try {
        initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, {
          locale: "es-MX",
        });
        mpInitialized = true;
      } catch (err) {
        console.error("MP init error:", err);
      }
    }

    const init = async () => {
      try {
        if (plan?.idMembership) {
          setPlan(plan);
          setBranch(branch);
          if (session) {
            const phone = session.phone;
            if (phone) {
              const prospect = await getProspectByPhoneAction(phone);
              setProspect(prospect as any);
              setStep("payment");
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
    <div className="flex flex-col min-h-screen">
      {/* Spinner encima de todo, sin desmontar el contenido */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-black" />
            <p className="text-sm text-white font-medium">Cargando...</p>
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden justify-center bg-black">
        <div className="p-6 md:flex- md:overflow-y-auto md:self-start">
          {/* 👇 siempre montado, invisible durante carga */}
          <div className={loading ? "invisible" : ""}>
            {step === "email" && <StepEmail />}
            {step === "otp" && <StepOTP />}
            {step === "payment" && <StepPayment />}
          </div>
        </div>

        <div className="md:sticky md:top-0 md:h-screen p-6">
          <PlanCheckout />
        </div>
      </main>
    </div>
  );
}

"use client";

import { getProspectByPhoneAction } from "@/app/actions/prospects";
import StepEmail from "@/app/checkout/_componentes/StepEmail";
import StepOTP from "@/app/checkout/_componentes/StepOTP";
import StepPayment from "@/app/checkout/_componentes/StepPayment";
import { logger } from "@/lib/logger/logger";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-black text-white">
      {/* Overlay loader */}
      <LoadComp
        isVisible={loading}
        title="Cargando..."
        description="Por favor espera mientras cargamos tu plan de entrenamiento..."
      />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        {/* LEFT SIDE */}
        <section className="flex flex-1 items-center justify-center px-6 py-10 md:px-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-10">
              <h1 className="text-2xl font-semibold tracking-tight">
                Fit Premium
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Completa tu suscripción para comenzar tu entrenamiento.
              </p>
            </div>

            {/* Form card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl">
              <div className="p-6 md:p-8">
                {/* Progress */}
                <div className="mb-8">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-zinc-400">
                      Paso {step === "email" ? "1" : step === "otp" ? "2" : "3"}{" "}
                      de 3
                    </span>

                    <span className="text-sm text-zinc-500">
                      Configuración segura
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={false}
                      animate={{
                        width:
                          step === "email"
                            ? "33%"
                            : step === "otp"
                              ? "66%"
                              : "100%",
                      }}
                      transition={{
                        duration: 0.35,
                      }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className={loading ? "invisible" : ""}>
                  <AnimatePresence mode="wait">
                    {step === "email" && (
                      <motion.div
                        key="email"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <StepEmail />
                      </motion.div>
                    )}

                    {step === "otp" && (
                      <motion.div
                        key="otp"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <StepOTP />
                      </motion.div>
                    )}

                    {step === "payment" && (
                      <motion.div
                        key="payment"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                      >
                        <StepPayment />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span>🔒 Pago seguro</span>
              <span>•</span>
              <span>Cifrado SSL</span>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <aside className="w-full border-t border-zinc-900 bg-zinc-950/60 md:w-[440px] md:border-l md:border-t-0">
          <div className="md:sticky md:top-0 md:h-screen">
            <div className="flex h-full flex-col p-6 md:p-8">
              {/* Checkout summary */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold">Resumen</h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Tu acceso comienza inmediatamente después del pago.
                </p>
              </div>

              {/* Plan card */}
              <div className="rounded-3xl border border-zinc-800 bg-black/40 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Plan Anual Premium</h3>

                    <p className="mt-1 text-sm text-zinc-400">
                      Acceso completo a entrenamientos y rutinas.
                    </p>
                  </div>

                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">
                    Más popular
                  </span>
                </div>

                <div className="my-6 border-t border-zinc-800" />

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Suscripción</span>
                    <span>$1,299 MXN</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Descuento</span>
                    <span className="text-green-400">- $300 MXN</span>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <div className="flex justify-between">
                      <span className="text-base font-medium">Total</span>

                      <div className="text-right">
                        <div className="text-2xl font-semibold">$999 MXN</div>

                        <div className="text-xs text-zinc-500">
                          Facturación anual
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 space-y-4">
                {[
                  "Rutinas personalizadas",
                  "Acceso ilimitado",
                  "Actualizaciones incluidas",
                  "Soporte prioritario",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-sm text-zinc-300"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                      ✓
                    </div>

                    {feature}
                  </div>
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Security */}
              <div className="mt-10 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-lg">🛡️</div>

                  <div>
                    <p className="text-sm font-medium">Pagos protegidos</p>

                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Toda la información se procesa de forma segura mediante
                      cifrado SSL y proveedores certificados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

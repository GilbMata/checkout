"use client";

import { getOrCreatePreference } from "@/app/actions/createPayment";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useEffect, useRef, useState } from "react";

interface PaymentBrickProps {
  planId: string;
}

// Variable global para evitar inicialización múltiple
let mpInitialized = false;

// Skeleton component para cargar mientras MP inicializa
function PaymentSkeleton() {
  return (
    <div className="space-y-4 p-4 rounded-lg animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-zinc-700 rounded-full" />
        <div className="h-4 bg-zinc-700 rounded w-32" />
      </div>

      {/* Payment options skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800"
          >
            <div className="w-5 h-5 bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-zinc-800 rounded w-40" />
              <div className="h-2 bg-zinc-900 rounded w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Button skeleton */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="h-10 bg-zinc-700 rounded-lg w-full" />
      </div>
    </div>
  );
}

export default function PaymentBrick({ planId }: PaymentBrickProps) {
  const { email, phone, prospectId } = useCheckoutStore();
  const [preferenceData, setPreferenceData] = useState<{
    preferenceId: string;
    amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const initKey = useRef(Math.random().toString(36).substring(7));
  const [renderKey, setRenderKey] = useState(0);
  const loaded = useRef(false);

  // Solo renderizar en cliente para evitar hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Usar variable global para evitar inicialización múltiple
    if (!mpInitialized) {
      initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!);
      mpInitialized = true;
    }
  }, []);

  useEffect(() => {
    console.debug("🚀 ~ PaymentBrick ~ useEffect:", {
      prospectId,
      planId,
      email,
      loaded: loaded.current,
    });

    // Solo cargar cuando tengamos los datos necesarios y no se haya cargado antes
    if (!prospectId || !planId || !email || loaded.current) {
      console.debug("🚀 ~ PaymentBrick ~ skip:", {
        reason:
          !prospectId || !planId || !email ? "missing data" : "already loaded",
      });
      return;
    }

    loaded.current = true;
    console.debug("🚀 ~ PaymentBrick ~ loading preference...");

    async function loadPreference() {
      // Doble verificación dentro de la función async
      if (!prospectId || !planId || !email) {
        setError("Faltan datos para iniciar el pago");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getOrCreatePreference({
          planId,
          prospectId,
          email,
          phone: phone || undefined,
        });
        console.debug("🚀 ~ loadPreference ~ result:", result);

        // Obtener el amount de la respuesta
        setPreferenceData({
          preferenceId: result.preferenceId || "",
          amount: result.amount || 0,
        });
      } catch (err) {
        console.error("Error creating preference:", err);
        setError("Error al inicializar el pago");
      } finally {
        setLoading(false);
      }
    }

    loadPreference();
  }, [prospectId, planId, email]); // Se ejecuta cuando cambian estos valores

  // Loading state durante SSR o cliente-side hydration - mostrar skeleton
  if (!isMounted || loading) {
    return <PaymentSkeleton />;
  }

  if (error || !preferenceData?.preferenceId) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>{error || "Error al cargar el pago"}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // El Payment Brick usa una key única para evitar duplicados
  return (
    <div key={renderKey}>
      <Payment
        initialization={{
          preferenceId: preferenceData.preferenceId,
          amount: preferenceData.amount,
          payer: {
            email: email,
          },
        }}
        customization={{
          visual: {
            style: {
              theme: "dark",
              customVariables: {
                formBackgroundColor: "rgb(30, 30, 30)",
                baseColor: "rgb(236, 97, 0)",
                buttonTextColor: "white",
              },
            },
          },
          paymentMethods: {
            atm: "all",
            creditCard: "all",
            debitCard: "all",
            mercadoPago: "all",
            prepaidCard: "all",
            ticket: "all",
            maxInstallments: 12,
          },
        }}
        onSubmit={async (formData) => {
          console.log("Pago submetido:", formData);
          return { status: "pending" };
        }}
        onReady={() => console.log("Payment Brick listo")}
        onError={(error) => {
          console.error("Error en Payment Brick:", error);
        }}
      />
    </div>
  );
}

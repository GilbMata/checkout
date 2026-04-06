// app/components/CardPaymentBrick.tsx
"use client";

import { useCheckoutStore } from "@/store/useCheckoutStore";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useRef, useState } from "react";

interface CardPaymentBrickProps {
  amount: number;
  description: string;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  onPending?: (data: any) => void;
  onRejected?: (data: any) => void;
}
let globalInitDone = false;

export default function CardPaymentBrick({
  amount,
  description,
  onSuccess,
  onError,
  onPending,
  onRejected,
}: CardPaymentBrickProps) {
  const { email, phone, plan } = useCheckoutStore();
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const mountedRef = useRef(true);
  const onErrorRef = useRef(onError);

  // const {idMembership, nameMembership} = plan
  let planData = {};
  if (plan) {
    planData = {
      id: plan.idMembership,
      name: plan.nameMembership,
      price: plan.valuePromotionalPeriod
        ? plan.valuePromotionalPeriod
        : plan.value,
      currency: "MXN",
      // interval?: string; // monthly, yearly
      // activitiesGroups?: {
      //   name: string;
      //   activities: string[];
      // }[];4075595716483764
    };
  }

  // Mantener referencia actualizada del callback
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    // Si ya está inicializado, marcar como listo inmediatamente
    if (globalInitDone) {
      setReady(true);
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    if (publicKey && !globalInitDone) {
      try {
        initMercadoPago(publicKey, {
          locale: "es-MX",
        });
        globalInitDone = true;
        setReady(true);
        console.log("✅ MP initialized");
      } catch (err) {
        console.error("❌ MP init error:", err);
        if (mountedRef.current) {
          setError("Error al cargar pagos");
          onErrorRef.current("Error al cargar pagos");
        }
      }
    }
  }, []);

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (cardPaymentData: any) => {
    setProcessing(true);
    // console.log("Datos completos recibidos:", cardPaymentData);
    try {
      const {
        token,
        transaction_amount,
        issuer_id,
        installments,
        payer,
        payment_method_id,
        plan,
      } = cardPaymentData;
      amount = transaction_amount;
      if (!token) {
        throw new Error("No se pudo generar el token de la tarjeta");
      }

      const response = await fetch("/api/payment/mercadopago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          amount,
          description: description,
          payment_method_id,
          installments: Number(installments),
          issuer_id: issuer_id || undefined,
          prospectPhone: phone,
          payer_email: payer.email,
          plan_id: planData,
        }),
      });
      console.log("🚀 ~ handleSubmit ~ response:", response);

      const result = await response.json();
      console.log("🚀 ~ handleSubmit ~ result:", result);

      if (result.success) {
        setPaymentId(result);
        onSuccess(result);
      } else if (result.pending) {
        setPaymentId(result.payment_id);
        onPending?.(result);
      } else if (result.rejected) {
        onRejected?.(result);
        onError(result.error || result.status_detail || "Pago rechazado");
      } else {
        onError(result.error || "Error");
      }
    } catch (error: any) {
      console.error("Error en pago:", error);
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  if (!ready) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-zinc-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <CardPayment
        initialization={{
          amount,
          // payer: {
          //   email: email || "",
          // },
        }}
        onSubmit={handleSubmit}
        onError={(err) => {
          console.error("Error del Brick:", err);
          onError(err.message || "Error en el formulario de pago");
        }}
        onReady={() => console.log("CardPaymentBrick listo")}
      />

      {processing && (
        <div className="text-center mt-4 text-gray-600">Procesando pago...</div>
      )}
    </div>
  );
}

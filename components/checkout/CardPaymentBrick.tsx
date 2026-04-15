// app/components/CardPaymentBrick.tsx
"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useEffect, useRef, useState } from "react";

interface CardPaymentBrickProps {
  planData: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    recurrent: boolean;
  };
  userData: {
    phone: string;
    email: string;
    curp: string;
    firstName: string;
    lastName: string;
  };
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  onPending?: (data: any) => void;
  onRejected?: (data: any) => void;
}
let globalInitDone = false;

// Skeleton loader para el Brick de pago - reproduce el tamaño real del componente
function PaymentBrickSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto border-2 border-orange-500/30 rounded-lg overflow-hidden bg-zinc-900">
      {/* Header del formulario */}
      <div className="bg-zinc-800/50 p-4 border-b border-zinc-700">
        <div className="h-5 w-32 bg-zinc-700/50 rounded animate-pulse" />
      </div>

      {/* Campo número de tarjeta */}
      <div className="p-4 space-y-2">
        <div className="h-4 w-20 bg-zinc-700/50 rounded animate-pulse" />
        <div className="h-12 w-full bg-zinc-800 rounded animate-pulse" />
      </div>

      {/* Campos de fecha y CVV */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-16 bg-zinc-700/50 rounded animate-pulse" />
          <div className="h-12 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-12 bg-zinc-700/50 rounded animate-pulse" />
          <div className="h-12 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Campo nombre del titular */}
      <div className="px-4 pb-4 space-y-2">
        <div className="h-4 w-24 bg-zinc-700/50 rounded animate-pulse" />
        <div className="h-12 w-full bg-zinc-800 rounded animate-pulse" />
      </div>

      {/* Botón de pagar */}
      <div className="p-4">
        <div className="h-12 w-full bg-orange-500/30 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function CardPaymentBrick({
  userData: { phone, email, curp, firstName, lastName },
  planData,
  onSuccess,
  onError,
  onPending,
  onRejected,
}: CardPaymentBrickProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);
  const mountedRef = useRef(true);
  const onErrorRef = useRef(onError);
  const planAmount = planData.amount;
  // const recurrent = planData.membershipType;

  useEffect(() => {
    // Si ya está inicializado, marcar como listo inmediatamente
    // if (globalInitDone) {
    //   setReady(true);
    //   return;
    // }

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
        // if (mountedRef.current) {
        //   setError("Error al cargar pagos");
        //   onErrorRef.current("Error al cargar pagos");
        // }
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
      } = cardPaymentData;
      if (!token) {
        throw new Error("No se pudo generar el token de la tarjeta");
      }
      if (planData.recurrent) {
        const response = await fetch("/api/payment/mercadopago/recurrent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            amount: transaction_amount,
            currency: planData?.currency,
            description: planData.description,
            payment_method_id,
            prospect_phone: phone,
            payer_email: payer.email,
            payer_first_name: firstName,
            payer_last_name: lastName,
            plan_id: planData.id,
            recurrence_interval: "monthly",
            identification_type: "CURP",
            identification_number: curp,
          }),
        });

        console.log("STATUS (recurrent):", response.status);
        const result = await response.json();
        console.log("🚀 ~ handleSubmit ~ result (recurrent):", result);
        if (result.success) {
          setPaymentId(result);
          onSuccess(result);
        } else if (result.pending) {
          setPaymentId(result.preapproval_id || result.payment_id);
          onPending?.(result);
        } else if (result.rejected) {
          onRejected?.(result);
          onError(
            result.error || result.status_detail || "Pago recurrente rechazado",
          );
        } else {
          onError(result.error || "Error en pago recurrente");
        }
      } else {
        const response = await fetch("/api/payment/mercadopago", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            amount: transaction_amount,
            currency: planData?.currency,
            description: planData.description,
            payment_method_id,
            installments: Number(installments),
            issuer_id: issuer_id || undefined,
            prospectPhone: phone,
            payer_email: payer.email,
            payer_first_name: firstName,
            payer_last_name: lastName,
            plan_id: planData.id,
          }),
        });

        console.log("STATUS:", response.status);
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
    return <PaymentBrickSkeleton />;
  }

  return (
    <div className="w-full max-w-md mx-auto   border-2 border-orange-500 rounded-lg ">
      <CardPayment
        initialization={{
          amount: planAmount,
          payer: {
            // email: email || "",
            identification: {
              type: "CURP",
              number: curp,
            },
          },
        }}
        customization={{
          visual: {
            hidePaymentButton: false,
            style: {
              theme: "dark",
              customVariables: {
                formBackgroundColor: "rgb(30, 30, 30)",
                baseColor: "rgb(236, 97, 0)",
                buttonTextColor: "white",
                borderRadiusMedium: "10px",
                borderRadiusLarge: "10px",
                borderRadiusSmall: "10px",
              },
            },
          },
        }}
        locale="es-MX"
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

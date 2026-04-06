"use client";

import { useCheckoutStore } from "@/store/useCheckoutStore";
import {
  CardPayment,
  initMercadoPago,
  StatusScreen,
} from "@mercadopago/sdk-react";
import { useEffect, useRef, useState } from "react";

interface CardPaymentBrickProps {
  amount: number;
  description: string;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  onPending?: (data: any) => void;
  onRejected?: (data: any) => void;
}

// Variable global para evitar inicialización múltiple
let globalInitDone = false;

export default function CardPaymentBrick({
  amount,
  description,
  onSuccess,
  onError,
  onPending,
  onRejected,
}: CardPaymentBrickProps) {
  const { email, phone, prospectId } = useCheckoutStore();
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (globalInitDone || initRef.current) return;

    initRef.current = true;
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    console.log(
      "🚀 ~ initMercadoPago ~ key:",
      publicKey?.substring(0, 15) + "...",
    );

    if (publicKey) {
      try {
        initMercadoPago(publicKey, { locale: "es-MX" });
        globalInitDone = true;
        setReady(true);
        console.log("✅ MP initialized");
      } catch (err) {
        console.error("❌ MP init error:", err);
        onError("Error al cargar pagos");
      }
    }
  }, []);

  const handleSubmit = async (cardPaymentData: any) => {
    setProcessing(true);

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
        throw new Error("Token no generado");
      }

      const response = await fetch("/api/payment/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          amount: transaction_amount || amount,
          description,
          payment_method_id,
          installments: Number(installments) || 1,
          issuer_id: issuer_id || undefined,
          external_reference: phone || prospectId,
          payer_email: payer?.email || email,
        }),
      });

      const result = await response.json();
      console.log("🚀 ~ result:", result);

      if (result.success) {
        setPaymentId(result.payment_id);
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
      onError(error.message || "Error");
    } finally {
      setProcessing(false);
    }
  };

  if (paymentId) {
    return (
      <StatusScreen
        initialization={{ paymentId }}
        onError={(e: any) => console.error("StatusScreen error:", e)}
      />
    );
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
    <div>
      <CardPayment
        initialization={{ amount }}
        onSubmit={handleSubmit}
        onError={(e: any) => {
          console.error("CardPayment error:", e);
          onError(e.message || "Error");
        }}
        onReady={() => console.log("CardPayment ready")}
      />
      {processing && (
        <div className="mt-4 text-center text-blue-600">Procesando...</div>
      )}
    </div>
  );
}

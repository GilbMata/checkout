// app/components/CardPaymentBrick.tsx
"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useState } from "react";

interface CardPaymentBrickProps {
  amount: number;
  description: string;
  phone: string;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
}

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
  locale: "es-MX",
});

export default function CardPaymentBrick({
  amount,
  description,
  phone,
  onSuccess,
  onError,
}: CardPaymentBrickProps) {
  const [processing, setProcessing] = useState(false);

  // ✅ CORRECCIÓN: La estructura correcta del callback
  const handleSubmit = async (cardPaymentData: any) => {
    setProcessing(true);

    console.log("Datos completos recibidos:", cardPaymentData);

    try {
      // ✅ La estructura correcta según la documentación
      const {
        token,
        transaction_amount,
        issuer_id,
        installments,
        payer,
        payment_method_id,
      } = cardPaymentData;
      console.debug(
        "🚀 ~ handleSubmit ~ token:",
        token,
        transaction_amount,
        issuer_id,
        installments,
        payer,
        payment_method_id,
      );
      // Verificar que tenemos el token
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
          issuer_id,
          external_reference: phone,
          payer: payer.email,
        }),
      });

      const result = await response.json();
      console.debug("🚀 ~ handleSubmit ~ result:", result);

      if (result.success) {
        onSuccess(result);
      } else {
        onError(result.error || "Pago rechazado");
      }
    } catch (error: any) {
      console.error("Error en pago:", error);
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <CardPayment
        initialization={{ amount: amount }}
        onSubmit={handleSubmit}
        onError={(error) => {
          console.error("Error del Brick:", error);
          onError(error.message || "Error en el formulario de pago");
        }}
        onReady={() => console.log("CardPaymentBrick listo")}
      />

      {processing && (
        <div className="text-center mt-4 text-gray-600">Procesando pago...</div>
      )}
    </div>
  );
}

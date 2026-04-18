// app/components/CardPaymentBrick.tsx
"use client";

import { CardPayment } from "@mercadopago/sdk-react";
import { useState } from "react";

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

export default function CardPaymentBrick({
  userData: { phone, email, curp, firstName, lastName },
  planData,
  onSuccess,
  onError,
  onPending,
  onRejected,
}: CardPaymentBrickProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const planAmount = planData.amount;
  // const recurrent = planData.membershipType;

  const handleSubmit = async (cardPaymentData: any, additionalData?: any) => {
    // console.log("🚀 ~ handleSubmit ~ additionalData:", additionalData);
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

      // Extraer información adicional de la tarjeta
      const cardLastFour = additionalData.lastFourDigits || null;
      const cardholderName = additionalData.cardholderName || null;
      const paymentTypeId = additionalData?.paymentTypeId;

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

  return (
    <div className="w-full max-w-md border-2 border-orange-500 rounded-lg ">
      <CardPayment
        initialization={{
          amount: planAmount,
          payer: {
            email: email || "",
            identification: {
              type: "CURP",
              number: curp,
            },
          },
        }}
        customization={{
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: 6,
          },
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
        // onReady={() => setBrickReady(true)}
      />

      {processing && (
        <div className="text-center mt-4 text-gray-600">Procesando pago...</div>
      )}
    </div>
  );
}

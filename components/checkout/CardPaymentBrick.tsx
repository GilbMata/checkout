"use client";

import { CardPayment } from "@mercadopago/sdk-react";
import { useCallback, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface PlanData {
  id: string;
  description: string;
  amount: number;
  currency: string;
  recurrent: boolean;
  displayName: string;
  branch: string;
}

interface UserData {
  phone: string;
  email: string;
  curp: string;
  firstName: string;
  lastName: string;
}

interface CardPaymentData {
  token: string;
  transaction_amount: number;
  issuer_id?: string;
  installments: number;
  payer: {
    email: string;
  };
  payment_method_id: string;
}

interface AdditionalCardData {
  lastFourDigits?: string;
  cardholderName?: string;
  paymentTypeId?: string;
}

interface PaymentResponse {
  success?: boolean;
  pending?: boolean;
  rejected?: boolean;
  error?: string;
  status_detail?: string;
  payment_id?: string;
  preapproval_id?: string;
  [key: string]: unknown;
}

interface PaymentCallbacks {
  onSuccess: (data: PaymentResponse) => void;
  onError: (error: string) => void;
  onPending?: (data: PaymentResponse) => void;
  onRejected?: (data: PaymentResponse) => void;
}

interface CardPaymentBrickProps {
  planData: PlanData;
  userData: UserData;
  onSuccess: (data: PaymentResponse) => void;
  onError: (error: string) => void;
  onPending?: (data: PaymentResponse) => void;
  onRejected?: (data: PaymentResponse) => void;
}

// ============================================================================
// Helper functions
// ============================================================================

function validateCardPaymentData(data: unknown): data is CardPaymentData {
  if (!data || typeof data !== "object") return false;

  const cardData = data as Record<string, unknown>;

  return (
    typeof cardData.token === "string" &&
    cardData.token.length > 0 &&
    typeof cardData.transaction_amount === "number" &&
    cardData.transaction_amount > 0 &&
    typeof cardData.payer === "object" &&
    cardData.payer !== null &&
    typeof (cardData.payer as Record<string, unknown>).email === "string"
  );
}

function extractErrorMessage(response: PaymentResponse): string {
  if (response.error) return response.error;
  if (response.status_detail) return response.status_detail;
  return "Error desconocido en el procesamiento del pago";
}

// ============================================================================
// Component
// ============================================================================

export default function CardPaymentBrick({
  userData: { phone, email, curp, firstName, lastName },
  planData,
  onSuccess,
  onError,
  onPending,
  onRejected,
}: CardPaymentBrickProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const title = planData.recurrent
    ? "Pago recurrente de tu Membresía. Tarjetas de crédito y débito "
    : "Pago anual de tu Membresía. Tarjetas de crédito y débito";

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      console.error("Payment error:", error);
      const message = error instanceof Error ? error.message : fallbackMessage;
      setInternalError(message);
      onError(message);
    },
    [onError],
  );

  const handleSubmit = useCallback(
    async (cardPaymentData: unknown, additionalData?: unknown) => {
      setIsProcessing(true);
      setInternalError(null);

      try {
        // Validate data from Brick
        if (!validateCardPaymentData(cardPaymentData)) {
          throw new Error(
            "Datos de pago inválidos. Por favor, verifica la información de tu tarjeta.",
          );
        }

        const {
          token,
          transaction_amount,
          issuer_id,
          installments,
          payer,
          payment_method_id,
        } = cardPaymentData as CardPaymentData;

        const extraData = additionalData as AdditionalCardData | undefined;
        const cardLastFour = extraData?.lastFourDigits ?? null;
        const paymentTypeId = extraData?.paymentTypeId;
        const cardholderName = extraData?.cardholderName ?? null; // Reserved for future use

        // Dev-only logging
        if (process.env.NODE_ENV === "development") {
          console.debug("[CardPayment] Submitting:", {
            hasToken: !!token,
            amount: transaction_amount,
            paymentMethod: payment_method_id,
            cardLastFour,
          });
        }

        // Build payload based on payment type
        const apiPayload = {
          displayName: planData.displayName,
          payment_type: paymentTypeId,
          installments: Number(installments),
          issuer_id: issuer_id || undefined,
          external_reference: planData.branch,
          card_last_four: cardLastFour,
          cardholder_name: cardholderName,
          token,
          amount: transaction_amount,
          currency: planData.currency,
          description: planData.description,
          payment_method_id,
          payer_email: payer.email,
          payer_first_name: firstName,
          payer_last_name: lastName,
          plan_id: planData.id,
          ...(planData.recurrent
            ? {
                prospect_phone: phone,
                recurrence_interval: "monthly",
                identification_type: "CURP",
                identification_number: curp,
              }
            : {
                prospect_phone: phone,
                installments: Number(installments) || 1,
                issuer_id: issuer_id || undefined,
              }),
        };
        console.log("🚀 ~ CardPaymentBrick ~ apiPayload:", apiPayload);

        const endpoint = planData.recurrent
          ? "/api/payment/mercadopago/recurrent"
          : "/api/payment/mercadopago/order";

        // HTTP request
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
        });

        // Validate HTTP response
        if (!response.ok) {
          throw new Error(
            `Error del servidor (${response.status}). Por favor, intenta más tarde.`,
          );
        }

        const result = (await response.json()) as PaymentResponse;

        // Process response
        if (result.success) {
          onSuccess(result);
        } else if (result.pending) {
          onPending?.(result);
        } else if (result.rejected) {
          onRejected?.(result);
          onError(extractErrorMessage(result));
        } else {
          onError(extractErrorMessage(result));
        }
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          handleApiError(
            error,
            "Error de conexión. Verifica tu conexión a internet.",
          );
        } else {
          handleApiError(
            error,
            "Error al procesar el pago. Por favor, intenta más tarde.",
          );
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [
      planData,
      phone,
      curp,
      firstName,
      lastName,
      onSuccess,
      onPending,
      onRejected,
      handleApiError,
    ],
  );

  // Error state render
  if (internalError) {
    return (
      <div className="w-full max-w-md p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-center text-red-700">{internalError}</p>
      </div>
    );
  }

  // Main render
  return (
    <div className="w-full max-w-md">
      <CardPayment
        initialization={{
          amount: planData.amount,
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
            texts: {
              formTitle: title,
            },
            hidePaymentMethodIcon: false,
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
        onReady={() => {
          console.debug("[CardPayment] Brick ready");
        }}
        onError={(error: unknown) => {
          console.error("[CardPayment] Brick error:", error);
          const message =
            error instanceof Error
              ? error.message
              : "Error en el formulario de pago";
          setInternalError(message);
          onError(message);
        }}
      />

      {isProcessing && (
        <div className="mt-4 text-center text-gray-600">
          <span className="inline-block animate-pulse">Procesando pago...</span>
        </div>
      )}
    </div>
  );
}

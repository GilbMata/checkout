"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  challenge_required?: boolean;
  challenge_url?: string;
  error?: string;
  status_detail?: string;
  status?: string;
  payment_id?: string;
  order_id?: string;
  preapproval_id?: string;
  [key: string]: unknown;
}

interface SubscriptionPaymentBrickProps {
  planData: PlanData;
  userData: UserData;
  onSuccess: (data: PaymentResponse) => void;
  onError: (error: string) => void;
  onPending?: (data: PaymentResponse) => void;
  onRejected?: (data: PaymentResponse) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
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
// Component - Subscription Payment (Recurring payment)
// ============================================================================

export default function SubscriptionPaymentBrick({
  userData: { phone, email, curp, firstName, lastName },
  planData,
  onSuccess,
  onError,
  onPending,
  onRejected,
  onProcessingChange,
}: SubscriptionPaymentBrickProps) {
  const [internalError, setInternalError] = useState<string | null>(null);

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      console.error("Payment error:", error);
      const message = error instanceof Error ? error.message : fallbackMessage;
      setInternalError(message);
      onError(message);
      onProcessingChange?.(false);
    },
    [onError, onProcessingChange],
  );

  const handleSubmit = useCallback(
    async (cardPaymentData: unknown, additionalData?: unknown) => {
      onProcessingChange?.(true);
      setInternalError(null);

      try {
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
        const cardholderName = extraData?.cardholderName ?? null;

        // Dev-only logging
        if (process.env.NODE_ENV === "development") {
          console.log("[SubscriptionPayment] Submitting:", {
            hasToken: !!token,
            amount: transaction_amount,
            paymentMethod: payment_method_id,
            cardLastFour,
          });
        }

        // API payload for subscription (recurring payment)
        const apiPayload = {
          displayName: planData.displayName,
          payment_type: paymentTypeId,
          installments: Number(installments),
          issuer_id: issuer_id || undefined,
          external_reference: planData.branch,
          card_last_four: cardLastFour,
          cardholder_name: cardholderName,
          prospect_phone: phone,
          token,
          amount: transaction_amount,
          currency: planData.currency,
          description: planData.description,
          payment_method_id,
          payer_email: payer.email,
          payer_first_name: firstName,
          payer_last_name: lastName,
          plan_id: planData.id,
          identification_type: "CURP",
          identification_number: curp,
          // Recurrence interval for subscriptions
          recurrence_interval: "monthly",
        };
        console.log("🚀 ~ SubscriptionPaymentBrick ~ apiPayload:", apiPayload);

        // Endpoint for subscription payment
        const endpoint = "/api/payment/mercadopago/recurrent";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
          throw new Error(`Error del servidor (${response.status}). `);
        }

        const result = (await response.json()) as PaymentResponse;
        console.log("🚀 ~ SubscriptionPaymentBrick ~ result:", result);
        return;
        if (result.success) {
          onSuccess(result);
        } else if (result.challenge_required) {
          onPending?.(result);
        } else if (result.pending) {
          onPending?.(result);
        } else if (result.rejected) {
          onRejected?.(result);
          onError(extractErrorMessage(result));
        } else {
          onError(extractErrorMessage(result));
        }
      } catch (error) {
        console.error("Error al procesar el pago:", error);

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
        onProcessingChange?.(false);
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
      onProcessingChange,
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

  // Main render - Subscription payment
  return (
    <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white rounded-2xl shadow-xl overflow-hidden gap-0">
      <CardHeader className="px-6 border-b border-gray-700">
        <CardTitle className="text-xl font-semibold tracking-tight">
          <>
            <span className="text-orange-500">Membresía recurrente</span>
            <span className="block text-sm font-normal text-gray-400 mt-1">
              Pago mensual con tarjeta de crédito o débito
            </span>
          </>
        </CardTitle>
      </CardHeader>
      <div className="px-3 py-0">
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
            visual: {
              texts: {
                formTitle: "Datos para tu suscripción mensual",
              },
              hidePaymentMethodIcon: false,
              style: {
                theme: "dark",
                customVariables: {
                  formBackgroundColor: "transparent",
                  baseColor: "#ec6100",
                  buttonTextColor: "#ffffff",
                  borderRadiusMedium: "12px",
                  borderRadiusLarge: "16px",
                  borderRadiusSmall: "8px",
                  fontSizeBase: "14px",
                  primaryColor: "#ec6100",
                  outlineClear: "true",
                },
              },
            },
          }}
          locale="es-MX"
          onSubmit={handleSubmit}
          onReady={() => {
            console.debug("[SubscriptionPayment] Brick ready");
          }}
          onError={(error: unknown) => {
            console.error("[SubscriptionPayment] Brick error:", error);
            const message =
              error instanceof Error
                ? error.message
                : "Error en el formulario de pago";
            setInternalError(message);
            onError(message);
            onProcessingChange?.(false);
          }}
        />
      </div>
    </Card>
  );
}

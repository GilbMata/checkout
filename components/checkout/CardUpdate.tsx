"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureMercadoPagoInitialized } from "@/lib/mercadoPagoInit";
import { CardPayment } from "@mercadopago/sdk-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface CardUpdateProps {
  subscriptionId: string;
  preapprovalId: string;
  payerEmail: string;
  curp: string;
  amount?: number;
  onSuccess: () => void;
  onError: (error: string) => void;
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

interface UpdateResponse {
  success: boolean;
  error?: string;
  message?: string;
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
    typeof (cardData.payer as Record<string, unknown>).email === "string" &&
    (typeof cardData.installments === "number" ||
      typeof cardData.installments === "undefined")
  );
}

// ============================================================================
// Component - Card Update (Update subscription card token)
// ============================================================================

export default function CardUpdate({
  subscriptionId,
  preapprovalId,
  payerEmail,
  curp,
  amount,
  onSuccess,
  onError,
}: CardUpdateProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      console.error("Card update error:", error);
      const message = error instanceof Error ? error.message : fallbackMessage;
      setInternalError(message);
      onError(message);
      setIsUpdating(false);
    },
    [onError],
  );

  const handleSubmit = useCallback(
    async (cardPaymentData: unknown, additionalData?: unknown) => {
      console.log("[CardUpdate] handleSubmit called with:", cardPaymentData);
      setIsUpdating(true);
      setInternalError(null);

      try {
        if (!validateCardPaymentData(cardPaymentData)) {
          throw new Error(
            "Datos de tarjeta inválidos. Por favor, verifica la información.",
          );
        }

        const { token, installments } = cardPaymentData as CardPaymentData;

        const extraData = additionalData as AdditionalCardData | undefined;
        const cardLastFour = extraData?.lastFourDigits ?? null;
        const cardholderName = extraData?.cardholderName ?? null;
        const payment_method_id = (cardPaymentData as CardPaymentData)
          .payment_method_id;

        // Default installments to 1 if not provided
        const installmentsValue = installments || 1;

        if (process.env.NODE_ENV === "development") {
          console.log("[CardUpdate] Submitting:", {
            subscriptionId,
            preapprovalId,
            hasToken: !!token,
            cardLastFour,
          });
        }

        // API payload for card update
        const apiPayload = {
          subscription_id: subscriptionId,
          preapproval_id: preapprovalId,
          token,
          card_last_four: cardLastFour,
          cardholder_name: cardholderName,
          payment_method_id,
          installments: installmentsValue,
        };

        // Endpoint for card update
        const endpoint = "/api/payment/mercadopago/recurrent";

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Error del servidor (${response.status})`,
          );
        }

        const result = (await response.json()) as UpdateResponse;
        console.log("[CardUpdate] result:", result);

        if (result.success) {
          onSuccess();
        } else {
          throw new Error(result.error || "Error al actualizar la tarjeta");
        }
      } catch (error) {
        console.error("Error al actualizar la tarjeta:", error);

        if (error instanceof TypeError && error.message.includes("fetch")) {
          handleApiError(
            error,
            "Error de conexión. Verifica tu conexión a internet.",
          );
        } else {
          handleApiError(
            error,
            "Error al actualizar la tarjeta. Por favor, intenta más tarde.",
          );
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [subscriptionId, preapprovalId, onSuccess, handleApiError],
  );

  const [isMPReady, setIsMPReady] = useState(false);
  const mpkey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_SUBSCRIPTIONS;

  useEffect(() => {
    if (!mpkey) {
      setInternalError("Configuración de pagos no disponible");
      return;
    }

    let mounted = true;

    ensureMercadoPagoInitialized(mpkey)
      .then(() => {
        if (mounted) setIsMPReady(true);
      })
      .catch((err) => {
        console.error("MP init error:", err);
        if (mounted) setInternalError("Error al cargar Mercado Pago");
      });

    return () => {
      mounted = false;
    };
  }, [mpkey]);

  // Error state render
  if (internalError) {
    return (
      <div className="w-full max-w-md p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-center text-red-700">{internalError}</p>
      </div>
    );
  }

  if (!isMPReady) {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white rounded-2xl shadow-xl overflow-hidden gap-0">
        <CardHeader className="px-6 border-b border-gray-700">
          <CardTitle className="text-xl font-semibold">
            <span className="text-orange-500">Cargando...</span>
          </CardTitle>
        </CardHeader>
        <div className="p-6 text-center text-gray-400">
          Preparando el sistema de pagos...
        </div>
      </Card>
    );
  }

  // Main render - Card update form
  return (
    <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white rounded-2xl shadow-xl overflow-hidden gap-0">
      <CardHeader className="px-6 border-b border-gray-700">
        <CardTitle className="text-xl font-semibold tracking-tight">
          <>
            <span className="text-orange-500">Actualizar tarjeta</span>
            <span className="block text-sm font-normal text-gray-400 mt-1">
              Ingresa los datos de tu nueva tarjeta
            </span>
          </>
        </CardTitle>
      </CardHeader>
      <div className="px-3 py-0">
        <CardPayment
          initialization={{
            amount: amount || 100, // Usar monto de la suscripción o mínimo
            payer: {
              email: payerEmail || "",
              identification: {
                type: "CURP",
                number: curp,
              },
            },
          }}
          customization={{
            paymentMethods: {
              minInstallments: 1,
              maxInstallments: 1,
            },
            visual: {
              texts: {
                formTitle: "Datos de tu nueva tarjeta",
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
                  // primaryColor: "#ec6100",
                  // outlineClear: "true",
                },
              },
            },
          }}
          locale="es-MX"
          onSubmit={handleSubmit}
          onReady={() => {
            console.log("[CardUpdate] Brick ready");
          }}
          onError={(error: unknown) => {
            console.error("[CardUpdate] Brick error:", error);
            // Mostrar el error completo para debugging
            if (typeof error === "object" && error !== null) {
              const errObj = error as Record<string, unknown>;
              console.error(
                "[CardUpdate] Error details:",
                JSON.stringify(errObj, null, 2),
              );
            }
            const message =
              error instanceof Error
                ? error.message
                : "Error en el formulario de tarjeta";
            setInternalError(message);
            onError(message);
          }}
        />
      </div>
      {isUpdating && (
        <div className="px-6 pb-4 text-center text-gray-400 text-sm">
          Actualizando tarjeta...
        </div>
      )}
    </Card>
  );
}

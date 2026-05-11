"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ensureMercadoPagoInitialized,
  getInitializedKey,
  isMercadoPagoReady,
} from "@/lib/mercadoPagoInit";
import { CardPayment } from "@mercadopago/sdk-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface PlanData {
  id: string;
  description: string;
  amount: number;
  currency: string;
  /** Indica si es un pago recurrente (suscripción) o único (order) */
  recurrent: boolean;
  displayName: string;
  branch: string;
  /** Referencia externa - se construye dinámicamente si no se proporciona */
  externalReference?: string;
}

interface UserData {
  phone: string;
  area?: string;
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

interface CardPaymentBrickProps {
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

/**
 * Construye la externalReference según el tipo de pago
 * - Suscripciones (recurrent): branch + "_" + phone
 * - Orders (no recurrent): branch + "_" + phone
 */
function buildExternalReference(planData: PlanData, phone: string): string {
  if (planData.externalReference) {
    return planData.externalReference;
  }
  return `${planData.branch}_${phone}`;
}

/**
 * Obtiene el endpoint correcto según el tipo de pago
 */
function getPaymentEndpoint(recurrent: boolean): string {
  return recurrent ? "/api/mp/recurrent" : "/api/mp/order";
}

/**
 * Construye el payload para el API según el tipo de pago
 */
function buildApiPayload(
  cardPaymentData: CardPaymentData,
  extraData: AdditionalCardData | undefined,
  planData: PlanData,
  userData: UserData,
): Record<string, unknown> {
  const {
    token,
    transaction_amount,
    issuer_id,
    installments,
    payer,
    payment_method_id,
  } = cardPaymentData;

  const cardLastFour = extraData?.lastFourDigits ?? null;
  const paymentTypeId = extraData?.paymentTypeId;
  const cardholderName = extraData?.cardholderName ?? null;

  const basePayload = {
    displayName: planData.displayName,
    payment_type: paymentTypeId,
    installments: Number(installments),
    issuer_id: issuer_id || undefined,
    external_reference: buildExternalReference(planData, userData.phone),
    card_last_four: cardLastFour,
    cardholder_name: cardholderName,
    token,
    amount: transaction_amount,
    currency: planData.currency,
    description: planData.description,
    payment_method_id,
    payer_email: payer.email,
    payer_first_name: userData.firstName,
    payer_last_name: userData.lastName,
    plan_id: planData.id,
    identification_type: "CURP",
    identification_number: userData.curp,
    // Campos de contacto
    payer_phone: userData.phone,
    ...(userData.area ? { payer_area_code: userData.area } : {}),
  };

  // Agregar recurrence_interval solo para suscripciones
  if (planData.recurrent) {
    return {
      ...basePayload,
      recurrence_interval: "monthly",
    };
  }

  return basePayload;
}

// ============================================================================
// Component - Unified CardPaymentBrick
// ============================================================================

export default function CardPaymentBrick({
  userData,
  planData,
  onSuccess,
  onError,
  onPending,
  onRejected,
  onProcessingChange,
}: CardPaymentBrickProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isMPReady, setIsMPReady] = useState(false);
  const mpInitializedRef = useRef(false);

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
      // Notificar que el procesamiento comenzó
      onProcessingChange?.(true);
      setInternalError(null);

      try {
        // Validar datos del Brick
        if (!validateCardPaymentData(cardPaymentData)) {
          throw new Error(
            "Datos de pago inválidos. Por favor, verifica la información de tu tarjeta.",
          );
        }

        const extraData = additionalData as AdditionalCardData | undefined;

        // Dev-only logging
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[CardPayment - ${planData.recurrent ? "Recurrent" : "Order"}] Submitting:`,
            {
              hasToken: !!(cardPaymentData as CardPaymentData).token,
              amount: (cardPaymentData as CardPaymentData).transaction_amount,
              paymentMethod: (cardPaymentData as CardPaymentData)
                .payment_method_id,
              cardLastFour: extraData?.lastFourDigits,
            },
          );
        }

        // Construir payload dinámicamente según el tipo
        const apiPayload = buildApiPayload(
          cardPaymentData as CardPaymentData,
          extraData,
          planData,
          userData,
        );

        console.log("🚀 ~ CardPaymentBrick ~ apiPayload:", apiPayload);

        // Endpoint dinámico según tipo de pago
        const endpoint = getPaymentEndpoint(planData.recurrent);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
          throw new Error(
            `Error del servidor (${response.status}). Por favor, intenta más tarde.`,
          );
        }

        const result = (await response.json()) as PaymentResponse;

        // ====================================================================
        // Procesar respuesta - incluyendo 3DS Challenge
        // ====================================================================
        if (result.success) {
          onSuccess(result);
        } else if (result.challenge_required) {
          // 3DS Challenge requerido - pasar datos al callback onPending
          // que maneja StepPayment (muestra iframe del challenge)
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
        // Notificar que el procesamiento terminó
        onProcessingChange?.(false);
      }
    },
    [
      planData,
      userData,
      onSuccess,
      onPending,
      onRejected,
      handleApiError,
      onProcessingChange,
    ],
  );

  // ========================================================================
  // Inicialización de Mercado Pago (requerida para el Brick)
  // ========================================================================
  const mpKey = planData.recurrent
    ? process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_SUBSCRIPTIONS
    : process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

  useEffect(() => {
    if (!mpKey) {
      console.warn("Mercado Pago public key no disponible");
      return;
    }

    console.log(
      "[CardPaymentBrick] Iniciando MercadoPago con key:",
      mpKey.substring(0, 10) + "...",
    );

    // Si ya está inicializado globalmente, marcar listo inmediatamente
    if (isMercadoPagoReady() && getInitializedKey() === mpKey) {
      console.log(
        "[CardPaymentBrick] Ya estaba inicializado, marcando listo inmediatamente",
      );
      setIsMPReady(true);
      return;
    }

    ensureMercadoPagoInitialized(mpKey)
      .then(() => {
        console.log(
          "[CardPaymentBrick] MercadoPago inicializado exitosamente!",
        );
        setIsMPReady(true);
      })
      .catch((err) => {
        console.error("[CardPaymentBrick] MP init error:", err);
        setInternalError(
          "Error al cargar Mercado Pago: " +
            (err instanceof Error ? err.message : String(err)),
        );
      });
  }, [mpKey]);

  // ========================================================================
  // Render: Estado de error interno
  // ========================================================================
  if (internalError) {
    return (
      <div className="w-full max-w-md p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-center text-red-700">{internalError}</p>
      </div>
    );
  }

  // ========================================================================
  // Render: Cargando Mercado Pago
  // ========================================================================
  if (!isMPReady) {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white rounded-2xl shadow-xl overflow-hidden">
        <CardHeader className="px-6 pt-3 pb-4 border-b border-gray-700">
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

  // ========================================================================
  // Render: Formulario de pago unificado
  // ========================================================================
  const isRecurrent = planData.recurrent;

  return (
    <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <CardHeader className="px-6 pt-3 pb-4 border-b border-gray-700">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {isRecurrent ? (
            <>
              <span className="text-orange-500">Membresía recurrente</span>
              <span className="block text-sm font-normal text-gray-400 mt-1">
                Pago mensual con tarjeta de crédito o débito
              </span>
            </>
          ) : (
            <>
              <span className="text-orange-500">Membresía anual</span>
              <span className="block text-sm font-normal text-gray-400 mt-1">
                Pago único con tarjeta de crédito o débito
              </span>
            </>
          )}
        </CardTitle>
      </CardHeader>

      {/* Formulario del Brick */}
      <div className="px-3 py-4">
        <CardPayment
          initialization={{
            amount: planData.amount,
            payer: {
              email: isRecurrent ? userData.email : "",
              identification: {
                type: "CURP",
                number: userData.curp,
              },
            },
          }}
          customization={{
            visual: {
              texts: {
                formTitle: isRecurrent
                  ? "Datos para tu suscripción mensual"
                  : "Datos para tu pago anual",
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
                },
              },
            },
          }}
          locale="es-MX"
          onSubmit={handleSubmit}
          onReady={() => {
            console.debug(
              `[CardPayment - ${isRecurrent ? "Recurrent" : "Order"}] Brick ready`,
            );
          }}
          onError={(error: unknown) => {
            console.error(
              `[CardPayment - ${isRecurrent ? "Recurrent" : "Order"}] Brick error:`,
              error,
            );
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

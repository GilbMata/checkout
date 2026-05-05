"use client";

import ProcessingOverlay from "@/app/checkout/_componentes/LoadComp";
import OrderPaymentBrick from "@/app/checkout/_componentes/OrderPaymentBrick";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import SubscriptionPaymentBrick from "./suscription/SubscriptionPaymentBrick";
let mpInitialized = false;

// ========================================================================
// Types
// ========================================================================

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
  external_reference?: string;
  [key: string]: unknown;
}

// ========================================================================
// Main component
// ========================================================================

export default function StepPayment() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // ========================================================================
  // Estado para 3DS Challenge
  // ========================================================================
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeUrl, setChallengeUrl] = useState<string>("");
  const [challengeOrderId, setChallengeOrderId] = useState<string>("");

  // ========================================================================
  // Callback: Pago aprobado
  // ========================================================================
  const handleSuccess = useCallback(
    (result: PaymentResponse) => {
      console.log("Pago aprobado:", result);
      if (result.payment_id) {
        router.push(
          `/checkout/success?order_id=${result.order_id}&payment_id=${result.payment_id}`,
        );
      } else {
        router.push("https://station24.com.mx/");
      }
    },
    [router],
  );

  // ========================================================================
  // Callback: Pago pendiente o 3DS Challenge requerido
  // ========================================================================
  const handlePending = useCallback(
    (result: PaymentResponse) => {
      console.log("Pago pendiente / 3DS:", result);

      // ========================================================================
      // Detectar si requiere 3DS Challenge
      // ========================================================================
      if (result.challenge_required && result.challenge_url) {
        // Mostrar modal con iframe del challenge
        setChallengeUrl(result.challenge_url);
        setChallengeOrderId(result.order_id || "");
        setShowChallenge(true);
        console.log("🔐 ~ 3DS Challenge requerido:", result.challenge_url);
        return;
      }

      // Pago pendiente sin challenge - redirigir a página de espera
      const paymentId = result.payment_id || result.id || result.preference_id;
      const queryParams = paymentId ? `?payment_id=${paymentId}` : "";
      router.push(`/checkout/pending${queryParams}`);
    },
    [router],
  );

  // ========================================================================
  // Callback: Pago rechazado
  // ========================================================================
  const handleRejected = useCallback(
    (result: PaymentResponse) => {
      console.log("Pago rechazado:", result);
      const paymentId = result.payment_id || result.id || result.preference_id;
      const orderId = result.order_id || result.id;
      const statusDetail = result.status_detail || result.error;

      let queryParams = "";
      if (paymentId && statusDetail) {
        queryParams = `?payment_id=${paymentId}&status_detail=${encodeURIComponent(statusDetail)}`;
      } else if (paymentId) {
        queryParams = `?payment_id=${paymentId}`;
      } else if (statusDetail) {
        queryParams = `?status_detail=${encodeURIComponent(statusDetail)}`;
      }

      router.push(`/checkout/failure${queryParams}`);
    },
    [router],
  );

  // ========================================================================
  // Callback: Error
  // ========================================================================
  const handleError = useCallback(
    (error: unknown) => {
      console.error("Error en pago:", error);
      const errorMsg =
        error instanceof Error ? error.toString() : "Error al procesar el pago";
      toast.error(errorMsg);
      setTimeout(() => router.refresh(), 3000);
    },
    [router],
  );

  // ========================================================================
  // Listener para detectar cuando el Challenge 3DS termina
  // ========================================================================
  useEffect(() => {
    if (!showChallenge || !challengeOrderId) return;

    const handleChallengeComplete = async (event: MessageEvent) => {
      // Mejor validación de origen
      const allowedOrigins = [
        "https://www.mercadopago.com.mx",
        "https://mercadopago.com.mx",
      ];
      if (!allowedOrigins.includes(event.origin)) {
        console.warn("Origen no permitido:", event.origin);
        return;
      }

      // Verificar que el mensaje sea del iframe de 3DS
      const status = event.data?.status || event.data?.type;
      if (status === "COMPLETE") {
        console.log("🔐 ~ 3DS Challenge completado, consultando estado...");

        // Cerrar modal
        setShowChallenge(false);

        try {
          // Consultar estado de la orden
          const response = await fetch(
            `/api/payment/mercadopago/order/${challengeOrderId}`,
          );
          console.log("🚀 ~ handleChallengeComplete ~ response:", response);
          const result = await response.json();

          console.log("📋 ~ Estado después del challenge:", result);
          console.log("📋 ~ Estado después del challenge:", result.success);

          if (result.success || result.processed) {
            // Pago aprobado
            toast.success("Pago aprobado");
            handleSuccess(result);
          } else if (result.rejected) {
            // Pago rechazado
            toast.error(result.error || "Pago rechazado");
            handleRejected(result);
          } else if (result.pending) {
            // Todavía pendiente - puede requerir otro challenge
            toast.info("Validación en proceso");
            handlePending(result);
          } else {
            // Error desconocido
            toast.error(result.error || "Error al verificar el pago");
            handleError(result);
          }
        } catch (error) {
          console.error("Error consultando orden:", error);
          toast.error("Error al verificar el estado del pago");
          handleError(error);
        }
      }
    };

    // Agregar listener
    window.addEventListener("message", handleChallengeComplete);

    // Cleanup
    return () => {
      window.removeEventListener("message", handleChallengeComplete);
    };
  }, [
    showChallenge,
    challengeOrderId,
    handleSuccess,
    handleRejected,
    handlePending,
    handleError,
  ]);

  // ========================================================================
  // Polling de seguridad (40 minutos max) - si no hay respuesta del iframe
  // ========================================================================
  useEffect(() => {
    if (!showChallenge || !challengeOrderId) return;

    // Timeout de 40 minutos (mismo que Mercado Pago)
    const timeout = setTimeout(
      () => {
        console.log("⏰ ~ Timeout 3DS - consultando estado...");
        setShowChallenge(false);
        handlePending({
          status: "expired",
          status_detail: "expired",
          error: "Tiempo de autenticación agotado",
        });
      },
      40 * 60 * 1000,
    );

    return () => clearTimeout(timeout);
  }, [showChallenge, challengeOrderId, handlePending]);

  // Obtener datos del plan y voucher desde el store
  const { prospect, plan, voucherDiscount } = useCheckoutStore();
  if (!plan) {
    throw new Error("Plan no encontrado");
  }
  if (!prospect) {
    throw new Error("Prospect no encontrado");
  }

  // Calcular amount con descuento de voucher
  const basePromo = Number(plan?.valuePromotionalPeriod ?? 0);
  const basePrice = Number(plan?.value ?? 0);
  const baseAmount = basePromo > 0 ? basePromo : basePrice;

  // Aplicar descuento del voucher si existe
  const finalAmount = voucherDiscount
    ? Math.round(voucherDiscount.totalFinalValue * 100) / 100
    : baseAmount;

  const description = plan?.description ? plan?.description : plan?.displayName;
  const email =
    process.env.NODE_ENV === "development"
      ? "test_user_mx@testuser.com"
      : prospect?.email;

  const userData = {
    phone: prospect?.phone,
    area: prospect?.areaCode,
    email: email,
    curp: prospect?.curp,
    firstName: prospect?.firstName,
    lastName: prospect?.lastName,
  };

  const externalReference = plan?.idBranch + "-" + userData.phone;
  const recurrence = plan?.membershipType?.includes("recurrence");

  const planData = {
    id: String(plan?.idMembership),
    description,
    amount: finalAmount,
    currency: "MXN",
    recurrent: plan?.membershipType?.includes("recurrence") ? true : false,
    membershipType: plan?.membershipType,
    displayName: plan?.displayName,
    branch: String(plan?.idBranch),
    externalReference,
  };

  return (
    <>
      {recurrence ? (
        <SubscriptionPaymentBrick
          planData={planData}
          userData={userData}
          onSuccess={handleSuccess}
          onError={handleError}
          onPending={handlePending}
          onRejected={handleRejected}
          onProcessingChange={setIsProcessing}
        />
      ) : (
        <OrderPaymentBrick
          planData={planData}
          userData={userData}
          onSuccess={handleSuccess}
          onError={handleError}
          onPending={handlePending}
          onRejected={handleRejected}
          onProcessingChange={setIsProcessing}
        />
      )}

      {/* Loader overlay mientras procesa el pago */}
      {isProcessing && <ProcessingOverlay isVisible={isProcessing} />}

      {/* ======================================================================== */}
      {/* Modal 3DS Challenge - autenticación bancaria */}
      {/* ======================================================================== */}
      <Dialog
        open={showChallenge}
        onOpenChange={(open) => {
          if (!open && challengeOrderId) {
            toast.warning(
              "Debes completar la verificación de seguridad para continuar",
            );
            return;
          }
          setShowChallenge(open);
        }}
      >
        <DialogContent className="max-w-lg h-[85vh] sm:max-w-xl bg-[#1a1a1a] border border-zinc-800">
          <DialogHeader className="text-center space-y-2 pb-2">
            {/* Header con gradiente de Station24 */}
            <div className="mx-auto size-15 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <ShieldCheck className="size-9 text-white" />
            </div>

            <DialogTitle className="text-2xl font-bold text-white tracking-tight">
              Verificación de seguridad
            </DialogTitle>

            <DialogDescription className="text-zinc-400 text-sm max-w-xs mx-auto">
              Confirma tu identidad con tu banco para completar el pago de
              manera segura
            </DialogDescription>
          </DialogHeader>

          {/* Panel del iframe con borde estilo Station24 */}
          <div className="flex-1 min-h-0 rounded-xl border-2 border-zinc-800 overflow-hidden bg-zinc-900/50">
            {/* Barra de estado con indicador animado */}
            <div className="bg-zinc-800/50 px-4 py-3 flex items-center justify-between border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-zinc-300">
                  Conexión segura
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-zinc-500">
                <Lock className="w-3 h-3" />
                <span>3D Secure</span>
              </div>
            </div>

            {challengeUrl ? (
              <iframe
                src={challengeUrl}
                className="w-full h-full min-h-87.5 bg-white"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="3DS Verification"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-87.5 gap-4">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                <p className="text-zinc-400 text-sm font-medium">
                  Preparando verificación segura...
                </p>
                <p className="text-zinc-500 text-xs">
                  Esto solo toma un momento
                </p>
              </div>
            )}
          </div>

          {/* Footer con badges de seguridad */}
          <div className="space-y-4 pt-3">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.133-3.801 10.279-9 11.62-5.176-1.341-9-6.486-9-11.62 0-.68.055-1.352.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-xs font-medium">SSL</span>
              </div>
              <div className="w-px h-4 bg-zinc-700" />
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-orange-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.133-3.801 10.279-9 11.62-5.176-1.341-9-6.486-9-11.62 0-.68.055-1.352.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-xs font-medium">3D Secure</span>
              </div>
            </div>

            <p className="text-zinc-500 text-xs text-center">
              Tiempo límite: 40 minutos • Contacta a tu banco si no puedes
              completar la verificación
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

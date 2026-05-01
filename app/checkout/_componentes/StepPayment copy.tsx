"use client";

import CardPaymentBrick from "@/app/checkout/_componentes/CardPaymentBrick";
import ProcessingOverlay from "@/app/checkout/_componentes/LoadComp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { Clock, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [showChallenge, setShowChallenge] = useState(true);
  const [challengeUrl, setChallengeUrl] = useState<string>(
    "https://www.mercadopago.com.mx/auth/card/validation/pages/remedies/019dbd9d-69ff-75cb-af0d-e1bc87ed35e5?display_mode=self_hosted&guest_token=a1a9ca21-a8b4-483a-8416-fcda63b5c76d",
  );
  const [challengeOrderId, setChallengeOrderId] = useState<string>(
    "ORDTST01KPYSTRQSAKHW3AW3P46QK131",
  );
  const [iframeLoading, setIframeLoading] = useState(true);

  // ========================================================================
  // Callback: Pago aprobado
  // ========================================================================
  const handleSuccess = useCallback(
    (result: PaymentResponse) => {
      console.log("Pago aprobado:", result);
      if (result.payment_id) {
        router.push(`/checkout/success?payment_id=${result.payment_id}`);
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

      if (result.challenge_required && result.challenge_url) {
        setChallengeUrl(result.challenge_url);
        setChallengeOrderId(result.order_id || "");
        setShowChallenge(true);
        setIframeLoading(true);
        console.log("3DS Challenge requerido:", result.challenge_url);
        return;
      }

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
      if (event.data?.status === "COMPLETE") {
        console.log("3DS Challenge completado, consultando estado...");

        setShowChallenge(false);

        try {
          const response = await fetch(
            `/api/payment/mercadopago/order/${challengeOrderId}`,
          );
          const result = await response.json();

          console.log("Estado despues del challenge:", result);

          if (result.success || result.processed) {
            toast.success("Pago aprobado");
            handleSuccess(result);
          } else if (result.rejected) {
            toast.error(result.error || "Pago rechazado");
            handleRejected(result);
          } else if (result.pending) {
            toast.info("Validacion en proceso");
            handlePending(result);
          } else {
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

    window.addEventListener("message", handleChallengeComplete);

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
  // Polling de seguridad (40 minutos max)
  // ========================================================================
  useEffect(() => {
    if (!showChallenge || !challengeOrderId) return;

    const timeout = setTimeout(
      () => {
        console.log("Timeout 3DS - consultando estado...");
        setShowChallenge(false);
        handlePending({
          status: "expired",
          status_detail: "expired",
          error: "Tiempo de autenticacion agotado",
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

  const basePromo = Number(plan?.valuePromotionalPeriod ?? 0);
  const basePrice = Number(plan?.value ?? 0);
  const baseAmount = basePromo > 0 ? basePromo : basePrice;

  const finalAmount = voucherDiscount
    ? Math.round(voucherDiscount.totalFinalValue * 100) / 100
    : baseAmount;

  const description = plan?.description ? plan?.description : plan?.displayName;
  const email =
    process.env.NODE_ENV === "development"
      ? "test_user_mx@testuser.com"
      : prospect?.email;

  const planData = {
    id: String(plan?.idMembership),
    description,
    amount: finalAmount,
    currency: "MXN",
    recurrent: plan?.membershipType?.includes("recurrence") ? true : false,
    membershipType: plan?.membershipType,
    displayName: plan?.displayName,
    branch: String(plan?.idBranch),
  };

  const userData = {
    phone: prospect.areaCode + prospect?.phone,
    email: email,
    curp: prospect?.curp,
    firstName: prospect?.firstName,
    lastName: prospect?.lastName,
  };

  // ========================================================================
  // Reset loading state cuando cambia la URL
  // ========================================================================
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  return (
    <>
      <CardPaymentBrick
        planData={planData}
        userData={userData}
        onSuccess={handleSuccess}
        onError={handleError}
        onPending={handlePending}
        onRejected={handleRejected}
        onProcessingChange={setIsProcessing}
      />

      {isProcessing && <ProcessingOverlay isVisible={isProcessing} />}

      {/* ======================================================================== */}
      {/* Modal 3DS Challenge - DISENO DISTINTIVO */}
      {/* ======================================================================== */}
      <Dialog
        open={showChallenge}
        onOpenChange={(open) => {
          if (open === false && challengeOrderId) {
            return;
          }
          setShowChallenge(open);
        }}
      >
        <DialogContent
          className="max-w-3xl w-[95vw] h-[85vh] p-0! overflow-hidden"
          showCloseButton={false}
        >
          {/* Header con gradiente */}
          <div className="relative  px-6 py-4">
            {/* Icono de seguridad */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
              </div>
            </div>

            {/* Titulo y descripcion */}
            <div className="pl-14">
              <DialogHeader className="mt-0! text-left">
                <DialogTitle className="text-white text-lg font-semibold tracking-tight">
                  Verificacion de Seguridad
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-sm">
                  Confirma tu identidad con tu banco para completar el pago
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Indicador visual */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-700/50 text-xs text-zinc-300">
                <Lock className="w-3 h-3" />
                <span>3D Secure</span>
              </div>
            </div>
          </div>

          {/* Container del iframe */}
          <div className="relative flex-1 min-h-0 bg-zinc-50">
            {/* Loading state */}
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 z-10">
                <div className="w-12 h-12 rounded-full border-2 border-zinc-200 border-t-orange-500 animate-spin" />
                <p className="mt-4 text-sm text-zinc-500 font-medium">
                  Conectando con tu banco...
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Este proceso puede tomar unos segundos
                </p>
              </div>
            )}

            {/* Iframe */}
            {challengeUrl ? (
              <iframe
                key={challengeUrl}
                src={challengeUrl}
                className="w-full h-full absolute inset-0"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="3DS Verification"
                onLoad={handleIframeLoad}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-zinc-300 mx-auto" />
                  <p className="mt-4 text-zinc-500">
                    Cargando verificacion de seguridad...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer con informacion */}
          <div className="px-6 py-3 bg-zinc-100 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Tiempo limite: 40 minutos</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Transaccion segura con Mercado Pago</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import CardPaymentBrick from "./CardPaymentBrick";

// ============================================================================
// Loader overlay component
// ============================================================================

function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl shadow-orange-500/20">
        {/* Spinner animados */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-orange-300 animate-spin" style={{ animationDuration: "0.8s" }}></div>
        </div>

        {/* Texto */}
        <h3 className="text-xl font-bold text-white mb-2">
          Procesando pago
        </h3>
        <p className="text-gray-400 text-sm">
          Por favor espera mientras confirmamos tu pago con Mercado Pago
        </p>

        {/* Progress bar animada */}
        <div className="mt-6 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full animate-pulse" style={{ width: "60%" }}></div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function StepPayment() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSuccess = (result: { preapproval_id?: string; payment_id?: string }) => {
    console.log("Pago aprobado:", result);
    if (result.preapproval_id) {
      router.push(`/checkout/success?preapproval_id=${result.preapproval_id}`);
    } else if (result.payment_id) {
      router.push(`/checkout/success?payment_id=${result.payment_id}`);
    } else {
      router.push("https://station24.com.mx/");
    }
  };

  const handlePending = (result: any) => {
    console.log("Pago pendiente:", result);
    const paymentId = result.payment_id || result.id || result.preference_id;
    const queryParams = paymentId ? `?payment_id=${paymentId}` : "";
    router.push(`/checkout/pending${queryParams}`);
  };

  const handleRejected = (result: any) => {
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
  };

  const handleError = (error: any) => {
    console.error("Error en pago:", error);
    const errorMsg = error?.toString() || "Error al procesar el pago";
    // Mostrar toast de error - no redireccionar
    toast.error(errorMsg);
    // Despues de 3 segundos, refrescar la pagina para que usuario intente de nuevo
    setTimeout(() => {
      router.refresh();
    }, 3000);
  };

  // Obtener datos del plan desde el store
  const { prospect, plan } = useCheckoutStore();
  if (!plan) {
    throw new Error("Plan no encontrado");
  }
  if (!prospect) {
    throw new Error("Prospect no encontrado");
  }
  const promo = Number(plan?.valuePromotionalPeriod ?? 0);
  const price = Number(plan?.value ?? 0);
  const amount = promo > 0 ? promo : price;
  const description = plan?.description ? plan?.description : plan?.displayName;
  const email =
    process.env.NODE_ENV === "development"
      ? "test_user_mx@testuser.com"
      : prospect?.email;
  console.log("StepPayment email:", email);
  console.log("StepPayment membershipType:", plan?.membershipType);

  const planData = {
    id: String(plan?.idMembership),
    description,
    amount,
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
      {/* Loader overlay mientras procesa el pago */}
      {isProcessing && <ProcessingOverlay />}
    </>
  );
}
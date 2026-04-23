"use client";

import CardPaymentBrick from "@/app/checkout/_componentes/CardPaymentBrick";
import ProcessingOverlay from "@/app/checkout/_componentes/LoadComp";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Main component
// ============================================================================

export default function StepPayment() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSuccess = (result: {
    preapproval_id?: string;
    payment_id?: string;
  }) => {
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
  console.log("StepPayment email:", email);
  console.log("StepPayment membershipType:", plan?.membershipType);
  console.log(
    "StepPayment amount:",
    finalAmount,
    "(voucher:",
    !!voucherDiscount,
    ")",
  );

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

  return (
    <>
      {/* CardPaymentBrick con el monto ya calculado (con descuento) */}
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
      {isProcessing && <ProcessingOverlay isVisible={isProcessing} />}
    </>
  );
}

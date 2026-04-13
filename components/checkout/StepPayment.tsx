"use client";

import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useRouter } from "next/navigation";
import CardPaymentBrick from "./CardPaymentBrick";

export default function StepPayment() {
  const router = useRouter();

  const handleSuccess = (result: any) => {
    console.log("✅ Pago aprobado:", result);
    // Redirect a success page con payment_id
    const paymentId = result.payment_id || result.id;
    router.push(`/checkout/success?payment_id=${paymentId}`);
  };

  const handlePending = (result: any) => {
    console.log("⏳ Pago pendiente:", result);
    // Redirect a pending page
    const paymentId = result.payment_id || result.id || result.preference_id;
    const queryParams = paymentId ? `?payment_id=${paymentId}` : "";
    router.push(`/checkout/pending${queryParams}`);
  };

  const handleRejected = (result: any) => {
    console.log("❌ Pago rechazado:", result);
    return;
    // Redirect a failure page con status_detail
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

    // router.push(`/checkout/failure${queryParams}`);
  };

  const handleError = (error: any) => {
    console.error("❌ Error en pago:", error);
    // Redirect a failure page
    const errorMsg = error?.toString() || "Error al procesar el pago";
    return;
    router.push(
      `/checkout/failure?status_detail=${encodeURIComponent(errorMsg)}`,
    );
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

  const planData = {
    id: String(plan?.idMembership),
    description,
    amount,
    currency: "MXN",
  };
  const userData = {
    phone: prospect.areaCode + prospect?.phone,
    email: prospect?.email,
    curp: prospect?.curp,
    firstName: prospect?.firstName,
    lastName: prospect?.lastName,
  };

  return (
    // <div className="space-y-4 max-w-lg min-w-md mx-auto">
    //   <main className="container mx-auto p-8">
    //     <h1 className="text-2xl font-bold mb-8 text-center">
    //       Pagar con tarjeta
    //     </h1>

    <CardPaymentBrick
      planData={planData}
      userData={userData}
      onSuccess={handleSuccess}
      onError={handleError}
      onPending={handlePending}
      onRejected={handleRejected}
    />
    //   </main>
    // </div>
  );
}

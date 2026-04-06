"use client";

import { getMembershipAction } from "@/app/actions/evoMember";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useEffect, useState } from "react";
import PaymentBrickCheckout from "./PaymentBrickCheckout";

interface StepPaymentProps {
  planId: string;
}

interface PlanData {
  idMembership: number;
  displayName: string;
  valuePromotionalPeriod: number;
}

export default function StepPayment({ planId }: StepPaymentProps) {
  const { setStep, setEmail, phone, email, prospectId } = useCheckoutStore();
  const [paymentState, setPaymentState] = useState<{
    status: "idle" | "success" | "pending" | "rejected" | "error";
    message?: string;
    data?: any;
  }>({ status: "idle" });
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Cargar datos del plan
  useEffect(() => {
    async function loadPlan() {
      try {
        const result = await getMembershipAction(planId);
        if (result?.list?.length > 0) {
          setPlanData(result.list[0]);
        }
      } catch (error) {
        console.error("Error loading plan:", error);
      } finally {
        setLoadingPlan(false);
      }
    }
    loadPlan();
  }, [planId]);

  const handleSuccess = (result: any) => {
    console.log("✅ Pago aprobado:", result);
    setPaymentState({
      status: "success",
      message: `¡Pago aprobado! ID: ${result.payment_id}`,
      data: result,
    });
  };

  const handlePending = (result: any) => {
    console.log("⏳ Pago pendiente:", result);
    setPaymentState({
      status: "pending",
      message: `Pago pendiente: ${result.status_detail || "Awaiting payment"}`,
      data: result,
    });
  };

  const handleRejected = (result: any) => {
    console.log("❌ Pago rechazado:", result);
    setPaymentState({
      status: "rejected",
      message: result.error || result.status_detail || "Pago rechazado",
      data: result,
    });
  };

  const handleError = (error: any) => {
    console.error("❌ Error en pago:", error);
    setPaymentState({
      status: "error",
      message: error?.toString() || "Error al procesar el pago",
    });
  };

  const handleRetry = () => {
    setPaymentState({ status: "idle" });
  };

  // Mostrar estado de carga
  if (loadingPlan) {
    return (
      <div className="space-y-4 max-w-lg min-w-md mx-auto">
        <h2 className="text-2xl text-orange-500 font-bold text-center">
          Completa tu pago
        </h2>
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  // Mostrar resultado del pago según el estado
  if (paymentState.status !== "idle") {
    const statusStyles = {
      success: "bg-green-100 border-green-500 text-green-800",
      pending: "bg-yellow-100 border-yellow-500 text-yellow-800",
      rejected: "bg-red-100 border-red-500 text-red-800",
      error: "bg-red-100 border-red-500 text-red-800",
    };

    const statusIcons = {
      success: "✓",
      pending: "⏳",
      rejected: "✗",
      error: "⚠",
    };

    return (
      <div className="space-y-4 max-w-lg min-w-md mx-auto">
        <h2 className="text-2xl text-orange-500 font-bold text-center">
          Resultado del pago
        </h2>

        <div
          className={`p-6 rounded-lg border-2 ${statusStyles[paymentState.status]}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{statusIcons[paymentState.status]}</span>
            <h3 className="text-xl font-bold">
              {paymentState.status === "success" && "Pago Aprobado"}
              {paymentState.status === "pending" && "Pago Pendiente"}
              {paymentState.status === "rejected" && "Pago Rechazado"}
              {paymentState.status === "error" && "Error"}
            </h3>
          </div>

          <p className="mb-4">{paymentState.message}</p>

          {paymentState.data?.payment_id && (
            <p className="text-sm opacity-75">
              ID de pago: {paymentState.data.payment_id}
            </p>
          )}

          {(paymentState.status === "rejected" ||
            paymentState.status === "error") && (
            <button
              onClick={handleRetry}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Intentar de nuevo
            </button>
          )}

          {paymentState.status === "pending" && (
            <p className="mt-4 text-sm">
              Te notificaremos cuando el pago sea procesado.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Estado normal - mostrar el formulario de pago
  return (
    <div className="space-y-4 max-w-lg min-w-md mx-auto">
      <h2 className="text-2xl text-orange-500 font-bold text-center">
        Completa tu pago
      </h2>

      {planData && (
        <div className="bg-zinc-800 p-4 rounded-lg text-center">
          <p className="text-zinc-400 text-sm">{planData.displayName}</p>
          <p className="text-2xl font-bold text-orange-500">
            ${planData.valuePromotionalPeriod.toFixed(2)}
          </p>
        </div>
      )}

      <div className="bg-zinc-900 p-4 rounded-lg">
        <CardPaymentBrick
          amount={Number(planData?.valuePromotionalPeriod) || 199}
          description={planData?.displayName || "Plan de membresía Station 24"}
          onSuccess={handleSuccess}
          onError={handleError}
          onPending={handlePending}
          onRejected={handleRejected}
        />
      </div>
    </div>
  );
}

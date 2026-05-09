"use client";

import CardUpdate from "@/components/checkout/CardUpdate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface SubscriptionInfo {
  id: string;
  preapprovalId: string;
  payerEmail: string;
  curp: string;
  status: string;
  transactionAmount?: number;
}

interface CardUpdateClientProps {
  userName: string;
  subscription: SubscriptionInfo;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function CardUpdateClient({
  userName,
  subscription,
  onSuccess,
  onError,
}: CardUpdateClientProps) {
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastShown, setToastShown] = useState(false);

  const handleSuccess = () => {
    setUpdateSuccess(true);
    onSuccess?.();
    // Redirigir con parámetro de éxito
    const url = new URL(window.location.href);
    url.searchParams.set("updated", "true");
    window.history.replaceState({}, "", url.toString());
  };
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  };

  // Mostrar toast de bienvenida solo una vez
  useEffect(() => {
    if (userName && !toastShown) {
      toast.success(`¡Bienvenido, ${userName}!`, {
        description: "Actualiza los datos de tu tarjeta de pago",
        duration: 5000,
      });
      setToastShown(true);
    }
  }, [userName, toastShown]);

  // 🔹 SUCCESS STATE
  if (updateSuccess) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#181818] text-white rounded-2xl shadow-2xl border border-white/10">
          <CardContent className="text-center py-10 space-y-4">
            <div className="text-4xl">✅</div>

            <h2 className="text-xl font-semibold text-green-400">
              Tarjeta actualizada
            </h2>

            <p className="text-gray-400 text-sm">
              Tu método de pago se actualizó correctamente. Tu suscripción
              seguirá activa sin interrupciones.
            </p>

            <Button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
            >
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 🔹 ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#181818] text-white rounded-2xl shadow-2xl border border-red-500/20">
          <CardContent className="text-center py-10 space-y-4">
            <div className="text-4xl">⚠️</div>

            <h2 className="text-xl font-semibold text-red-400">
              No se pudo actualizar
            </h2>

            <p className="text-gray-400 text-sm">{error}</p>

            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
            >
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 🔹 MAIN FLOW
  return (
    <div className="w-full max-w-md space-y-4 mx-auto">
      {/* PAYMENT FORM */}
      <CardUpdate
        subscriptionId={subscription.id}
        preapprovalId={subscription.preapprovalId}
        payerEmail={subscription.payerEmail}
        curp={subscription.curp}
        amount={subscription.transactionAmount ? subscription.transactionAmount / 100 : undefined}
        onSuccess={handleSuccess}
        onError={handleError}
      />

      {/* TRUST FOOTER */}
      <p className="text-xs text-gray-500 text-center">
        Tus datos están protegidos y procesados de forma segura.
      </p>
    </div>
  );
}
"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

type PaymentData = {
  payment_id: string;
  order_id: string;
  status: "approved";
  status_detail?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  date_approved?: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval?: string; // monthly, yearly
  activitiesGroups?: {
    name: string;
    activities: string[];
  }[];
};

interface Props {
  payment: PaymentData;
  plan: Plan;
  email?: string;
  continueUrl?: string;
}

export default function PaymentSuccess({
  payment,
  plan,
  email,
  continueUrl,
}: Props) {
  const formattedDate = useMemo(() => {
    if (!payment.date_approved) return null;
    return new Date(payment.date_approved).toLocaleString("es-MX");
  }, [payment.date_approved]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        {/* Animated CheckCircle with glow effect */}
        <div className="relative mb-6">
          {/* Pulsing glow rings */}
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full bg-[green]/30 animate-ping" />
          </div>
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <span
              className="absolute inset-0 rounded-full bg-[green]/20"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          {/* Main icon with gradient and shadow */}
          <div className="relative">
            <CheckCircle2
              className="w-20 h-20 text-[green] drop-shadow-lg"
              style={{
                filter: "drop-shadow(0 0 12px rgba(0, 100, 0, 0.5))",
              }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">¡Pago exitoso!</h1>
        <p className="text-muted-foreground mt-2 text-base">
          Tu suscripción ha sido activada correctamente
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 bg-zinc-900 border border-[#ff5b00] rounded-2xl p-6 shadow-sm">
        {/* Plan */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-zinc-400">Plan</p>
            <p className="text-xl font-semibold text-white">{plan.name}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Monto</p>
            <p className="text-xl font-bold ">
              {plan.price.toLocaleString("es-MX", {
                style: "currency",
                currency: plan.currency || "MXN",
              })}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-[#ff5b00]/30" />

        {/* Payment Info */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">ID de orden</span>
            <span className="font-medium  bg-zinc-800 px-2 py-1 rounded text-xs">
              {payment.order_id}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">ID de pago</span>
            <span className="font-medium  bg-zinc-800 px-2 py-1 rounded text-xs">
              {payment.payment_id}
            </span>
          </div>

          {payment.payment_method_id && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Método</span>
              <span className="font-medium text-white">
                {payment.payment_method_id.toUpperCase()}
              </span>
            </div>
          )}

          {formattedDate && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Fecha</span>
              <span className="font-medium text-white">{formattedDate}</span>
            </div>
          )}

          {email && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Email</span>
              <span className="font-medium ">{email}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-[#ff5b00]/30" />

        {/* Activities */}
        {plan.activitiesGroups && plan.activitiesGroups.length > 0 && (
          <div>
            <p className="font-semibold text-white mb-3">Incluye:</p>
            <div className="space-y-3">
              {plan.activitiesGroups.map((group, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-white">{group.name}</p>
                  <ul className="text-sm text-zinc-400 list-disc ml-5 space-y-1">
                    {group.activities.map((act, j) => (
                      <li key={j}>{act}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => continueUrl && (window.location.href = continueUrl)}
        className="mt-6 w-md mx-auto bg-[#ff5b00] text-white py-3.5 rounded-xl font-medium hover:bg-[#ff4d00] active:scale-[0.98] transition-all shadow-lg shadow-[#ff5b00]/25 hover:shadow-[#ff5b00]/40"
      >
        Regresar
      </button>
    </div>
  );
}

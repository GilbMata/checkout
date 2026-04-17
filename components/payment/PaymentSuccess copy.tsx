"use client";

import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Mail,
  Tag,
} from "lucide-react";
import { useMemo, useState } from "react";

type PaymentData = {
  payment_id: string;
  order_id: string;
  status: "approved";
  status_detail?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  date_approved?: string;
  // Datos de la tarjeta
  card_last_four?: string;
  cardholder_name?: string;
  payment_type_id?: string;
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
  receiptUrl?: string;
}

export default function PaymentSuccess({
  payment,
  plan,
  email,
  continueUrl,
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Formatear fecha de aprobación
  const formattedDate = useMemo(() => {
    if (!payment.date_approved) return null;
    return new Date(payment.date_approved).toLocaleString("es-MX", {
      dateStyle: "full",
      timeStyle: "short",
    });
  }, [payment.date_approved]);

  // Formatear datos de la tarjeta para mostrar
  const cardDisplay = useMemo(() => {
    if (!payment.card_last_four) return null;

    const cardType =
      payment.payment_method_id === "debmaster"
        ? "Débito Mastercard"
        : payment.payment_method_id === "debvisa"
          ? "Débito Visa"
          : payment.payment_method_id === "visa"
            ? "Crédito Visa"
            : payment.payment_method_id === "master"
              ? "Crédito Mastercard"
              : "Tarjeta";

    return {
      cardBrand: cardType,
      lastFour: `•••• ${payment.card_last_four}`,
      cardholder: payment.cardholder_name || "",
    };
  }, [
    payment.card_last_four,
    payment.payment_type_id,
    payment.payment_method_id,
    payment.cardholder_name,
  ]);

  // Función para descargar receipt
  const handleDownload = () => {
    setIsDownloading(true);
    const url = `/api/receipt/${payment.payment_id}`;
    window.open(url, "_blank");
    setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 border-orange-500 border rounded-t-3xl">
        {/* Header Card - Estilo MercadoPago */}
        <div className="relative overflow-hidden rounded-t-3xl px-6 py-8 border-orange-500 border">
          {/* Background Pattern
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10" />
          </div> */}

          {/* Content */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">¡ Listo !</h1>
                <p className="text-sm text-white/80">Tu pago fue aprobado</p>
              </div>
            </div>

            {/* Amount Highlight */}
            <div className="mt-6 rounded-2xl bg-white/10 backdrop-blur-sm p-4">
              <p className="text-sm text-white/70">Total pagado</p>
              <p className="text-3xl font-bold text-white">
                {plan.price.toLocaleString("es-MX", {
                  style: "currency",
                  currency: plan.currency || "MXN",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="rounded-b-3xl bg-zinc-900 px-6 py-6 shadow-2xl">
          {/* Plan Info */}
          <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5b00]/10">
                <Tag className="h-5 w-5 text-[#ff5b00]" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Plan</p>
                <p className="font-semibold text-white">{plan.name}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">ID de pago</span>
              </div>
              <span className="font-mono text-sm text-zinc-300">
                {payment.payment_id.slice(0, 20)}...
              </span>
            </div>

            {cardDisplay && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Método</span>
                </div>
                <span className="text-sm text-zinc-300">
                  {cardDisplay.cardBrand}
                </span>
              </div>
            )}

            {formattedDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Fecha</span>
                </div>
                <span className="text-sm text-zinc-300">{formattedDate}</span>
              </div>
            )}

            {email && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </div>
                <span className="text-sm text-zinc-300">{email}</span>
              </div>
            )}
          </div>

          {/* Activities Included */}
          {plan.activitiesGroups && plan.activitiesGroups.length > 0 && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <p className="mb-3 text-sm font-medium text-zinc-400">
                Incluido en tu.plan:
              </p>
              <div className="space-y-2">
                {plan.activitiesGroups.map((group, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-white">
                      {group.name}
                    </p>
                    <ul className="ml-4 list-disc space-y-1">
                      {group.activities.map((act, j) => (
                        <li key={j} className="text-xs text-zinc-400">
                          {act}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3">
            {/* Download Receipt Button */}
            {payment.payment_id && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-transparent px-4 py-3.5 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {isDownloading ? "Descargando..." : "Descargar comprobante"}
              </button>
            )}

            {/* Continue Button */}
            <button
              onClick={() =>
                continueUrl && (window.location.href = continueUrl)
              }
              className="w-full rounded-xl bg-[#ff5b00] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b00]/25 transition-all hover:bg-[#ff4d00] hover:shadow-[#ff5b00]/40 active:scale-[0.98]"
            >
              Ir a Station24
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            ¿Necesitas ayuda? Contáctanos en soporte@station24.com.mx
          </p>
        </div>
      </div>
    </div>
  );
}

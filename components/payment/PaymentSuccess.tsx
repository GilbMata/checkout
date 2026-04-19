"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Dumbbell,
  Mail,
  Receipt,
  RefreshCcw,
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
  card_last_four?: string;
  cardholder_name?: string;
  payment_type_id?: string;
};

type SubscriptionData = {
  preapproval_id: string;
  status: string;
  transaction_amount?: number;
  start_date?: string;
  next_billing_date?: string;
  payer_email?: string;
  recurrence_interval?: string;
  description?: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval?: string;
  activitiesGroups?: {
    name: string;
    activities: string[];
  }[];
};

interface Props {
  payment?: PaymentData;
  subscription?: SubscriptionData;
  plan: Plan;
  email?: string;
  continueUrl?: string;
  receiptUrl?: string;
}

export default function PaymentSuccess({
  payment,
  subscription,
  plan,
  email,
  continueUrl,
  receiptUrl,
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Determine if this is a subscription or one-time payment
  const isSubscription = !!subscription;

  // Get the payment/subscription ID for display
  const paymentId = payment?.payment_id || subscription?.preapproval_id || "";

  // Format date for payments
  const formattedDate = useMemo(() => {
    if (payment?.date_approved) {
      return new Date(payment.date_approved).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (subscription?.start_date) {
      return new Date(subscription.start_date).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return null;
  }, [payment?.date_approved, subscription?.start_date]);

  // Format next billing date for subscriptions
  const formattedNextBilling = useMemo(() => {
    if (!subscription?.next_billing_date) return null;
    return new Date(subscription.next_billing_date).toLocaleDateString(
      "es-MX",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  }, [subscription?.next_billing_date]);

  // Get recurrence text
  const recurrenceText = useMemo(() => {
    if (!subscription?.recurrence_interval) return null;
    const intervals: Record<string, string> = {
      weekly: "Semanal",
      monthly: "Mensual",
      bimonthly: "Bimestral",
      yearly: "Anual",
    };
    return (
      intervals[subscription.recurrence_interval] ||
      subscription.recurrence_interval
    );
  }, [subscription?.recurrence_interval]);

  // Get status badge for subscription
  const statusBadge = useMemo(() => {
    if (!subscription) return null;
    const statusConfig: Record<string, { label: string; color: string }> = {
      active: {
        label: "Activa",
        color: "bg-green-500/20 text-green-400 border-green-500/50",
      },
      pending: {
        label: "Pendiente",
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      },
      paused: {
        label: "Pausada",
        color: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      },
      cancelled: {
        label: "Cancelada",
        color: "bg-red-500/20 text-red-400 border-red-500/50",
      },
      expired: {
        label: "Expirada",
        color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
      },
    };
    return (
      statusConfig[subscription.status] || {
        label: subscription.status,
        color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
      }
    );
  }, [subscription]);

  const cardDisplay = useMemo(() => {
    if (!payment?.card_last_four) return null;

    const cardType =
      payment.payment_method_id === "debmaster"
        ? "Débito Mastercard"
        : payment.payment_method_id === "debvisa"
          ? "Débito Visa"
          : payment.payment_method_id === "visa"
            ? "Visa Crédito"
            : payment.payment_method_id === "master"
              ? "Mastercard Crédito"
              : "Tarjeta";

    return {
      cardBrand: cardType,
      lastFour: `•••• ${payment.card_last_four}`,
      cardholder: payment.cardholder_name || "",
    };
  }, [
    payment?.card_last_four,
    payment?.payment_type_id,
    payment?.payment_method_id,
    payment?.cardholder_name,
  ]);

  const handleDownload = () => {
    setIsDownloading(true);
    const url = `/api/receipt/${paymentId}`;
    window.open(url, "_blank");
    setTimeout(() => setIsDownloading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-zinc-800/20 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Success Header */}
        <div className="text-center mb-8">
          {/* Animated icon with glow */}
          <div className="relative inline-block mb-6">
            <div
              className="absolute inset-0 rounded-full bg-green-500/30 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <div
              className="absolute inset-0 rounded-full bg-green-500/20"
              style={{ animationDelay: "0.5s", animationDuration: "2s" }}
            />
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                <CheckCircle2
                  className="w-14 h-14 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            ¡Pago completado!
          </h1>
          <p className="text-lg text-zinc-400">
            Tu membresía Station24 está activa
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-2xl overflow-hidden">
          {/* Orange top border gradient */}
          <div className="h-1 bg-linear-to-r from-orange-500 via-orange-400 to-orange-600" />

          <CardContent className="p-6 space-y-6">
            {/* Plan Info */}
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">
                    Plan
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {plan.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-bold text-orange-400">
                  {plan.price.toLocaleString("es-MX", {
                    style: "currency",
                    currency: plan.currency || "MXN",
                  })}
                </p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {isSubscription
                  ? "Detalles de la suscripción"
                  : "Detalles del pago"}
              </p>

              {/* Subscription-specific details */}
              {isSubscription && (
                <>
                  {/* Status badge */}
                  {statusBadge && (
                    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                      <span className="text-sm text-zinc-400">Estado</span>
                      <Badge
                        variant="outline"
                        className={`border ${statusBadge.color}`}
                      >
                        {statusBadge.label}
                      </Badge>
                    </div>
                  )}

                  {/* Recurrence interval */}
                  {recurrenceText && (
                    <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                      <RefreshCcw className="w-4 h-4 text-orange-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Frecuencia</p>
                        <p className="text-sm text-zinc-300">
                          {recurrenceText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Next billing date */}
                  {formattedNextBilling && (
                    <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Próximo cobro</p>
                        <p className="text-sm text-zinc-300">
                          {formattedNextBilling}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                {formattedDate && !isSubscription && (
                  <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Fecha</p>
                      <p className="text-sm text-zinc-300">{formattedDate}</p>
                    </div>
                  </div>
                )}

                {cardDisplay && (
                  <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                    <CreditCard className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Tarjeta</p>
                      <p className="text-sm text-zinc-300">
                        {cardDisplay.lastFour}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <Receipt className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-xs text-zinc-500">
                      {isSubscription ? "Suscripción" : "Orden"}
                    </p>
                    <p className="text-sm text-zinc-300 font-mono">
                      {paymentId.slice(0, 12)}...
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentId);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Copiar ID"
                  >
                    {copiedId ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="text-xs text-zinc-500">
                        {isSubscription ? "Preapproval ID" : "Pago ID"}
                      </p>
                      <p className="text-sm text-zinc-300 font-mono">
                        {paymentId.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentId);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Copiar ID"
                  >
                    {copiedId ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>

                {email && (
                  <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                    <Mail className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Email</p>
                      <p className="text-sm text-zinc-300 truncate">{email}</p>
                    </div>
                  </div>
                )}
              </div>

              {cardDisplay && (
                <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">
                      Método de pago
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-orange-500/50 text-orange-400 bg-orange-500/10"
                  >
                    {cardDisplay.cardBrand}
                  </Badge>
                </div>
              )}
            </div>

            {/* Activities included */}
            {plan.activitiesGroups && plan.activitiesGroups.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Incluido en tu plan
                </p>
                <div className="space-y-2">
                  {plan.activitiesGroups.map((group, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 bg-zinc-800/30 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {group.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {group.activities.slice(0, 3).join(", ")}
                          {group.activities.length > 3 &&
                            ` +${group.activities.length - 3} más`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              {paymentId && (
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  variant="outline"
                  className="w-full h-12 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300 transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloading ? "Descargando..." : "Descargar recibo"}
                </Button>
              )}

              <Button
                onClick={() =>
                  continueUrl && (window.location.href = continueUrl)
                }
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Ir a Station24
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Mercado Pago badge */}
        <div className="flex items-center justify-center gap-3 mt-6 p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          {/* Mercado Pago Official Logo */}
          <img
            src="/MP_RGB_HANDSHAKE_pluma_horizontal.png"
            alt="Mercado Pago"
            className="h-13 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="h-6 w-px bg-zinc-600" />
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Procesado por
            </span>
            <span className="text-sm font-semibold text-white">
              Mercado Pago
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          ¿Necesitas ayuda? Escribe a soporte@station24.com.mx
        </p>
      </div>
    </div>
  );
}

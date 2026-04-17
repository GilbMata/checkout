"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Copy,
  CreditCard,
  Home,
  Mail,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentData = {
  success: boolean;
  rejected: boolean;
  status: string;
  status_detail?: string;
  order_id?: string;
  payment_id?: string;
  paymentId?: string;
  external_reference?: string;
  error?: string;
};

interface Props {
  payment: PaymentData;
  email?: string;
}

export default function PaymentFailure({ payment, email }: Props) {
  console.log("🚀 ~ PaymentFailure ~ payment:", payment);
  const [copiedId, setCopiedId] = useState(false);
  const router = useRouter();
  // Get friendly error message
  const getErrorMessage = (detail?: string) => {
    if (!detail) return "El pago fue rechazado";
    if (detail.includes("cc_rejected")) return "La tarjeta fue rechazada";
    if (detail.includes("cc_rejected_call_for_authorize"))
      return "La tarjeta requiere autorización";
    if (detail.includes("cc_rejected_insufficient_amount"))
      return "Fondos insuficientes";
    if (detail.includes("cc_rejected_other_reason"))
      return "La tarjeta fue rechazada";
    if (detail.includes("blacklisted")) return "La tarjeta está en lista negra";
    if (detail.includes("bad_filled_card_data"))
      return "Datos de tarjeta inválidos";
    return "El pago fue rechazado";
  };

  const errorMessage = payment.error || getErrorMessage(payment.status_detail);
  const displayPaymentId = payment.payment_id || payment.paymentId || "";

  const handleCopyId = () => {
    if (displayPaymentId) {
      navigator.clipboard.writeText(displayPaymentId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
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
        {/* Failure Header */}
        <div className="text-center mb-8">
          {/* Animated icon with glow */}
          <div className="relative inline-block mb-6">
            <div
              className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <div
              className="absolute inset-0 rounded-full bg-red-500/20"
              style={{ animationDelay: "0.5s", animationDuration: "2s" }}
            />
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
                <AlertCircle
                  className="w-14 h-14 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Pago rechazado
          </h1>
          <p className="text-lg text-zinc-400">{errorMessage}</p>
        </div>

        {/* Main Card */}
        <Card className="bg-zinc-900/80 backdrop-blur-xl border-zinc-800 shadow-2xl overflow-hidden">
          {/* Red top border gradient */}
          <div className="h-1 bg-linear-to-r from-red-500 via-red-400 to-red-600" />

          <CardContent className="p-6 space-y-6">
            {/* Error Info */}
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider">
                    Estado
                  </p>
                  <p className="text-lg font-semibold text-red-400">
                    Rechazado
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Detalles del intento
              </p>

              <div className="space-y-3">
                {payment.order_id && (
                  <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                    <Receipt className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Orden</p>
                      <p className="text-sm text-zinc-300 font-mono">
                        {payment.order_id}
                      </p>
                    </div>
                  </div>
                )}

                {displayPaymentId && (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-400" />
                      <div>
                        <p className="text-xs text-zinc-500">Pago ID</p>
                        <p className="text-sm text-zinc-300 font-mono">
                          {displayPaymentId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyId}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Copiar ID"
                    >
                      {copiedId ? (
                        <AlertCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                )}

                {email && (
                  <div className="flex items-center gap-2 p-3 bg-zinc-800/30 rounded-lg">
                    <Mail className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Email</p>
                      <p className="text-sm text-zinc-300 truncate">{email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Help Message */}
            <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
              <p className="text-sm text-zinc-300 mb-2">
                Por favor verifica los datos de tu tarjeta e intenta nuevamente.
              </p>
              <p className="text-xs text-zinc-500">
                Si el problema persiste, contacta a tu banco o intenta con otro
                método de pago.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              <Button
                onClick={() => router.back()}
                // onClick={() => (window.location.href = "/checkout")}
                className="w-full h-12 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar nuevamente
              </Button>

              <Button
                onClick={() =>
                  (window.location.href = "https://station24.com.mx/")
                }
                variant="outline"
                className="w-full h-12 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300 transition-all"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al inicio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mercado Pago badge */}
        <div className="flex items-center justify-center gap-3 mt-6 p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <img
            src="/MP_RGB_HANDSHAKE_pluma_horizontal.png"
            alt="Mercado Pago"
            className="h-12 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="h-6 w-px bg-zinc-600" />
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-zinc-300 uppercase tracking-wider">
              Procesado por
            </span>
            <span className="text-sm font-semibold text-white">
              Mercado Pago
            </span>
          </div>
        </div>

        {/* Footer */}
        {/* <p className="text-center text-xs text-zinc-600 mt-6">
          ¿Necesitas ayuda? Escribe a soporte@station24.com.mx
        </p> */}
      </div>
    </div>
  );
}

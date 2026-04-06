import { db } from "@/lib/db/index";
import { payments, prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { XCircle } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

export default async function FailurePage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; status_detail?: string }>;
}) {
  const params = await searchParams;
  const paymentId = params.payment_id;
  const statusDetail = params.status_detail;

  // Obtener payment de la base de datos
  let payment = null;
  let email: string | undefined;
  let planName = "Plan Station24";
  let planPrice = 0;

  if (paymentId) {
    const paymentData = await db
      .select()
      .from(payments)
      .where(eq(payments.mpPaymentId, paymentId))
      .limit(1);

    payment = paymentData[0];

    if (payment?.prospectId) {
      const prospectData = await db
        .select()
        .from(prospects)
        .where(eq(prospects.id, payment.prospectId))
        .limit(1);

      email = prospectData[0]?.email;
    }

    if (payment) {
      planName = payment.description || "Plan Station24";
      planPrice = payment.transactionAmount
        ? payment.transactionAmount / 100
        : 0;
    }
  }

  // Obtener mensaje de error amigable
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
    return "El pago fue rechazado";
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        {/* Animated XCircle with glow effect */}
        <div className="relative mb-6">
          {/* Pulsing glow rings */}
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          </div>
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <span
              className="absolute inset-0 rounded-full bg-red-500/20"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          {/* Main icon */}
          <div className="relative">
            <XCircle
              className="w-20 h-20 text-red-500 drop-shadow-lg"
              style={{
                filter: "drop-shadow(0 0 12px rgba(239, 68, 68, 0.5))",
              }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Pago Rechazado</h1>
        <p className="text-zinc-400 mt-2 text-base">
          {getErrorMessage(statusDetail)}
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 bg-zinc-900 border border-red-500/50 rounded-2xl p-6 shadow-sm">
        {/* Plan */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-zinc-400">Plan</p>
            <p className="text-xl font-semibold text-white">{planName}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Monto</p>
            <p className="text-xl font-bold text-red-400">
              {planPrice.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
              })}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-red-500/30" />

        {/* Payment Info */}
        <div className="space-y-3 text-sm">
          {paymentId && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">ID de preferencia</span>
              <span className="font-medium text-red-400 bg-zinc-800 px-2 py-1 rounded text-xs">
                {paymentId}
              </span>
            </div>
          )}

          {email && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Email</span>
              <span className="font-medium text-red-400">{email}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Estado</span>
            <span className="font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded">
              Rechazado
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-red-500/30" />

        {/* Message */}
        <div className="text-sm text-zinc-400 space-y-2">
          <p>
            Por favor verifica los datos de tu tarjeta e intenta nuevamente.
          </p>
          <p className="text-xs text-zinc-500">
            Si el problema persiste, contacta a tu banco o intenta con otro
            método de pago.
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="mt-6 space-y-3">
        <a
          href="/checkout"
          className="block w-full text-center bg-[#ff5b00] text-white py-3.5 rounded-xl font-medium hover:bg-[#ff4d00] active:scale-[0.98] transition-all shadow-lg shadow-[#ff5b00]/25"
        >
          Intentar nuevamente
        </a>

        <a
          href="https://station24.com.mx/"
          className="block w-full text-center py-3.5 border border-zinc-600 text-zinc-300 rounded-xl font-medium hover:bg-zinc-800 transition-all"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

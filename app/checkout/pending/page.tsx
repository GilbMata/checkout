import { prisma } from "@/lib/db/index";
import { Clock } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string }>;
}) {
  const params = await searchParams;
  const paymentId = params.payment_id;

  // Obtener payment de la base de datos usando Prisma
  let payment = null;
  let email: string | undefined;
  let planName = "Plan Station24";
  let planPrice = 0;

  if (paymentId) {
    payment = await prisma.payments.findFirst({
      where: { mpPaymentId: paymentId },
    });

    if (payment?.prospectId) {
      const prospect = await prisma.prospects.findUnique({
        where: { id: payment.prospectId },
      });
      email = prospect?.email;
    }

    if (payment) {
      planName = payment.description || "Plan Station24";
      planPrice = payment.transactionAmount
        ? payment.transactionAmount / 100
        : 0;
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        {/* Animated Clock with glow effect */}
        <div className="relative mb-6">
          {/* Pulsing glow rings */}
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full bg-yellow-500/30 animate-ping" />
          </div>
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <span
              className="absolute inset-0 rounded-full bg-yellow-500/20"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          {/* Main icon */}
          <div className="relative">
            <Clock
              className="w-20 h-20 text-yellow-500 drop-shadow-lg"
              style={{
                filter: "drop-shadow(0 0 12px rgba(234, 179, 8, 0.5))",
              }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Pago Pendiente</h1>
        <p className="text-zinc-400 mt-2 text-base">
          Tu pago está siendo procesado
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 bg-zinc-900 border border-[#ff5b00] rounded-2xl p-6 shadow-sm">
        {/* Plan */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-zinc-400">Plan</p>
            <p className="text-xl font-semibold text-white">{planName}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Monto</p>
            <p className="text-xl font-bold text-[#ff5b00]">
              {planPrice.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
              })}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-[#ff5b00]/30" />

        {/* Payment Info */}
        <div className="space-y-3 text-sm">
          {paymentId && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">ID de preferencia</span>
              <span className="font-medium text-[#ff5b00] bg-zinc-800 px-2 py-1 rounded text-xs">
                {paymentId}
              </span>
            </div>
          )}

          {email && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Email</span>
              <span className="font-medium text-[#ff5b00]">{email}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Estado</span>
            <span className="font-medium text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
              Pendiente
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-[#ff5b00]/30" />

        {/* Message */}
        <div className="text-sm text-zinc-400 space-y-2">
          <p>
            Te notificaremos cuando el pago sea aprobado. También puedes revisar
            el estado en tu correo electrónico.
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="mt-6 space-y-3">
        <a
          href="/checkout"
          className="block w-full text-center bg-[#ff5b00] text-white py-3.5 rounded-xl font-medium hover:bg-[#ff4d00] active:scale-[0.98] transition-all shadow-lg shadow-[#ff5b00]/25"
        >
          Volver al checkout
        </a>

        <a
          href="https://station24.com.mx/"
          className="block w-full text-center py-3.5 border border-[#ff5b00] text-[#ff5b00] rounded-xl font-medium hover:bg-[#ff5b00]/10 transition-all"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

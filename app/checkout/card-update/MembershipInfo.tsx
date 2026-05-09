"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MembershipInfoProps {
  planName: string;
  price?: number;
  frequency?: string;
  description?: string;
  features?: string[];
  status?: string;
  lastPaymentStatus?: string;
  nextBillingDate?: Date | string | null;
  lastBillingDate?: Date | string | null;
  failedAttempts?: number;
  totalInstallments?: number | null;
  pendingInstallments?: number | null;
  lastPaymentAttemptAt?: Date | string | null;
  transactionAmount?: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "text-green-400" },
  pending: { label: "Pendiente", color: "text-yellow-400" },
  paused: { label: "Pausada", color: "text-orange-400" },
  cancelled: { label: "Cancelada", color: "text-red-400" },
  expired: { label: "Expirada", color: "text-gray-400" },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  approved: { label: "Pagado", color: "text-green-400" },
  pending: { label: "Pendiente", color: "text-yellow-400" },
  failed: { label: "Fallido", color: "text-red-400" },
  cancelled: { label: "Cancelado", color: "text-gray-400" },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MembershipInfo({
  planName,
  price,
  frequency,
  description,
  features,
  status,
  lastPaymentStatus,
  nextBillingDate,
  lastBillingDate,
  failedAttempts,
  totalInstallments,
  pendingInstallments,
  lastPaymentAttemptAt,
  transactionAmount,
}: MembershipInfoProps) {
  const statusInfo = status
    ? statusLabels[status] || { label: status, color: "text-gray-400" }
    : null;
  const paymentInfo = lastPaymentStatus
    ? paymentStatusLabels[lastPaymentStatus] || {
        label: lastPaymentStatus,
        color: "text-gray-400",
      }
    : null;

  // Calcular pagos realizados
  const paidInstallments =
    totalInstallments != null && pendingInstallments != null
      ? totalInstallments - pendingInstallments
      : null;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <Card className="bg-linear-to-br from-[#1e1e1e] to-[#2a2a2a] border border-orange-500/30 rounded-2xl overflow-hidden">
        {/* Header - Estado de la membresía */}
        <div className="bg-orange-500/10 px-6 py-3 border-b border-orange-500/20 flex items-center justify-between">
          <p className="text-xs text-orange-400 uppercase tracking-wider font-medium">
            Membresía Contratada
          </p>
          {statusInfo && (
            <span className={`text-xs font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-white">
            {planName}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Precio */}
          {(price || transactionAmount) && (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-orange-500">
                ${(transactionAmount || price)?.toLocaleString("es-MX")}
              </span>
              {frequency && <span className="text-gray-400">/{frequency}</span>}
            </div>
          )}

          {/* Monto de cobro */}
          {transactionAmount && price !== transactionAmount && (
            <div className="text-sm text-gray-400">
              Monto de cobro: ${transactionAmount.toLocaleString("es-MX")}
            </div>
          )}

          {/* Estado del pago - más destacado si hay problemas */}
          {paymentInfo && (
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Estado del pago</span>
                <span className={`font-semibold ${paymentInfo.color}`}>
                  {paymentInfo.label}
                </span>
              </div>
              {/* Siempre mostrar la fecha del último intento */}
              {lastPaymentAttemptAt && (
                <div className="text-xs text-gray-500">
                  Último intento: {formatDate(lastPaymentAttemptAt)}
                </div>
              )}
              {failedAttempts && failedAttempts > 0 && (
                <div className="text-sm text-red-400 flex items-center gap-2">
                  <span className="text-red-500">⚠</span>
                  {failedAttempts} intento{failedAttempts > 1 ? "s" : ""}{" "}
                  fallido{failedAttempts > 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}

          {/* Pagos realizados */}
          {totalInstallments != null && (
            <div className="text-sm">
              <span className="text-gray-400">Pagos: </span>
              <span className="text-white font-medium">
                {paidInstallments != null ? `${paidInstallments}/` : ""}
                {totalInstallments}
              </span>
              {pendingInstallments != null && pendingInstallments > 0 && (
                <span className="text-gray-400">
                  {" "}
                  ({pendingInstallments} pendiente
                  {pendingInstallments > 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}

          {/* Próximo cobro */}
          {nextBillingDate && (
            <div className="text-sm">
              <span className="text-gray-400">Próximo cobro: </span>
              <span className="text-white">{formatDate(nextBillingDate)}</span>
            </div>
          )}

          {/* Último pago */}
          {lastBillingDate && (
            <div className="text-sm">
              <span className="text-gray-400">Último pago: </span>
              <span className="text-white">{formatDate(lastBillingDate)}</span>
            </div>
          )}

          {/* Descripción */}
          {description && (
            <p className="text-gray-400 text-sm leading-relaxed">
              {description}
            </p>
          )}

          {/* Características */}
          {features && features.length > 0 && (
            <ul className="space-y-2">
              {features.slice(0, 4).map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-300"
                >
                  <span className="text-orange-500 mt-0.5">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

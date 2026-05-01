"use client";

import VoucherInput from "@/app/checkout/_componentes/VoucherInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import {
  Calendar,
  Check,
  Clock,
  MapPin,
  Shield,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "../../../components/ui/card";
import { DialogContent, DialogHeader } from "../../../components/ui/dialog";

// Icon mapping for differentials
const differentialIcons: Record<string, React.ElementType> = {
  inscripción: Zap,
  inscripcion: Zap,
  multisucursal: MapPin,
  "acceso 24/7": Clock,
  "24/7": Clock,
  ilimitadas: Star,
  ilimitado: Star,
  invitados: Users,
  guest: Users,
  clases: Calendar,
};

function getIconForDifferential(title: string): React.ElementType {
  const lowerTitle = title.toLowerCase();
  for (const [key, icon] of Object.entries(differentialIcons)) {
    if (lowerTitle.includes(key)) return icon;
  }
  return Check;
}

function formatPrice(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PlanCheckout2() {
  const [open, setOpen] = useState(false);

  const { plan, voucherDiscount } = useCheckoutStore();

  if (!plan) return null;

  const sortedDifferentials = [...(plan.differentials || [])].sort(
    (a, b) => a.order - b.order,
  );

  let duration = "";
  if (plan.duration === 0) {
    duration = "Membresía mensual";
  } else {
    duration = `${plan.duration} meses`;
  }

  // Calcular valor base (promo o normal)
  let value = plan.value;
  let discount = 0;
  if (plan.valuePromotionalPeriod) {
    discount = plan.value - plan.valuePromotionalPeriod;
    value = plan.valuePromotionalPeriod;
  }

  // Aplicar descuento de voucher si existe
  let finalValue = value;
  let voucherDiscountValue = 0;
  if (voucherDiscount && voucherDiscount.totalFinalValue > 0) {
    voucherDiscountValue = value - voucherDiscount.totalFinalValue;
    finalValue = voucherDiscount.totalFinalValue;
  }

  const hasDiscount = discount > 0 || voucherDiscountValue > 0;

  return (
    <>
      {/* Plan Card Principal - Diseño Premium */}
      <Card className="w-full max-w-xl mx-auto bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 text-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Barra decorativa superior */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600" />

        <CardContent className="p-5 md:p-6 space-y-5">
          {/* Header del Plan */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
                {plan.displayName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-zinc-400 text-sm">
                <Clock className="w-4 h-4" />
                {duration}
              </CardDescription>
            </div>

            <Button
              variant="ghost"
              onClick={() => setOpen(true)}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all duration-200 text-sm"
            >
              Ver detalles
            </Button>
          </div>

          {/* Voucher Input */}
          <VoucherInput />

          {/* Sección de Precio - Diseño Destacado */}
          <div className="relative bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
            {/* Precio Anterior (si hay descuento) */}
            {hasDiscount && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-500 line-through">
                  Precio regular
                </span>
                <span className="text-sm text-zinc-500 line-through">
                  ${formatPrice(discount > 0 ? plan.value : value)}
                </span>
              </div>
            )}

            {/* Precio Principal */}
            <div className="flex items-end justify-between">
              <div>
                <span className="text-zinc-400 text-sm">Total a pagar</span>
                {hasDiscount && (
                  <span className="ml-2 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    -{formatPrice(discount + voucherDiscountValue)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl md:text-3xl font-bold text-white">
                  ${formatPrice(finalValue)}
                </span>
                <span className="text-xs md:text-sm text-zinc-500 block">
                  MXN al contado
                </span>
              </div>
            </div>
          </div>

          {/* Breve Diferenciales */}
          {sortedDifferentials.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Incluido
              </p>
              <div className="flex flex-wrap gap-2">
                {sortedDifferentials.slice(0, 4).map((item, index) => {
                  const Icon = getIconForDifferential(item.title);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 bg-zinc-800/40 px-3 py-1.5 rounded-full border border-zinc-700/50"
                    >
                      <Icon className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-xs text-zinc-300">
                        {item.title}
                      </span>
                    </div>
                  );
                })}
                {sortedDifferentials.length > 4 && (
                  <button
                    onClick={() => setOpen(true)}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    +{sortedDifferentials.length - 4} más
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actividades Preview */}
          {(plan.activitiesGroups ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Actividades incluidas
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {plan.activitiesGroups
                  ?.filter((a) => a.showOnMobile)
                  .slice(0, 4)
                  .map((activity) => (
                    <div
                      key={activity.idActivity}
                      className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden relative group"
                    >
                      <img
                        src={activity.photo}
                        alt={activity.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white truncate">
                        {activity.name}
                      </span>
                      <div
                        className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white/50"
                        style={{ backgroundColor: activity.color }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles - Diseño Premium */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white border-zinc-700 w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
          {/* Header del Modal */}
          <div className="relative p-6 pb-4 border-b border-zinc-800">
            {/* Barra decorativa */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600" />

            <DialogHeader>
              <DialogTitle className="text-2xl font-bold pr-8">
                {plan.displayName}
              </DialogTitle>
              <p className="flex items-center gap-2 text-zinc-400 mt-1">
                <Clock className="w-4 h-4" />
                {duration}
              </p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Precio en el Modal */}
            <div className="text-center py-6 bg-zinc-800/30 rounded-2xl border border-zinc-800">
              {discount > 0 && (
                <p className="text-lg text-zinc-500 line-through mb-1">
                  ${formatPrice(plan.value)}
                </p>
              )}
              <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
                ${formatPrice(value)}
              </p>
              {discount > 0 && (
                <p className="text-sm text-green-400 mt-2 flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4" />
                  Ahorras ${formatPrice(discount)} el primer mes
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                Precio final Membresía
              </p>
            </div>

            {/* Diferenciales - Grid de iconos */}
            {sortedDifferentials.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Beneficios incluidos
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedDifferentials.map((item, index) => {
                    const Icon = getIconForDifferential(item.title);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-zinc-800 hover:border-orange-500/30 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-sm text-zinc-200">
                          {item.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actividades - Grid visual */}
            {(plan.activitiesGroups ?? []).length > 0 && (
              <div>
                <p className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Actividades disponibles
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {plan.activitiesGroups
                    ?.filter((a) => a.showOnMobile)
                    .map((activity) => (
                      <div
                        key={activity.idActivity}
                        className="relative rounded-xl overflow-hidden border border-zinc-800 group hover:border-orange-500/50 transition-all duration-300"
                      >
                        {/* Imagen */}
                        <div className="relative">
                          <img
                            src={activity.photo}
                            alt={activity.name}
                            className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          {/* Color indicator */}
                          <div
                            className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white/30 shadow-lg"
                            style={{ backgroundColor: activity.color }}
                          />
                        </div>

                        {/* Nombre */}
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
                            {activity.name}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Detalle de precios */}
            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Desglose de pagos
              </p>
              <div className="bg-zinc-800/20 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Plan base</span>
                  <span>${formatPrice(value)}</span>
                </div>
                {voucherDiscountValue > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Descuento cupón</span>
                    <span>-${formatPrice(voucherDiscountValue)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-2 border-t border-zinc-700">
                  <span>Total</span>
                  <span>${formatPrice(finalValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer del Modal */}
          <div className="sticky bottom-0 p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
            <Button
              onClick={() => setOpen(false)}
              className="bg-orange-500 hover:bg-orange-600 px-8"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

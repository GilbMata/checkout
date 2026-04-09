"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { DialogContent, DialogHeader } from "../ui/dialog";

// type Differential = {
//   title: string;
//   order: number;
// };

// type Plan = {
//   displayName: string;
//   duration: number;
//   durationType: string;
//   value: number;
//   valuePromotionalPeriod: number;
//   differentials: Differential[];
//   activitiesGroups: Activity[];
// };
// type Activity = {
//   idActivity: number;
//   name: string;
//   photo: string;
//   color: string;
//   description: string;
//   showOnMobile: boolean;
// };

const mockActivities = [
  {
    idActivity: 1,
    name: "RIDEROLL",
    photo:
      "https://w12evostorage.w12app.com.br/evo/upload-imagem/27824/e75f2a23-10a0-49cc-873f-ce1c0541ae31.png",
    color: "#01a7a9",
    description: "Clase de cycling intensa",
    showOnMobile: true,
  },
  {
    idActivity: 2,
    name: "CrossNavy",
    photo:
      "https://w12evostorage.w12app.com.br/evo/upload-imagem/27824/63dca500-58aa-430a-b078-f4d61c6d01b1.png",
    color: "#0d2fc4",
    description: "Entrenamiento funcional",
    showOnMobile: true,
  },
  {
    idActivity: 3,
    name: "Yoga",
    photo:
      "https://w12evostorage.w12app.com.br/evo/upload-imagem/27824/6ed14901-ab94-4b3c-b400-53907c6dffc5.png",
    color: "#fdb100",
    description: "Relajación y movilidad",
    showOnMobile: true,
  },
  {
    idActivity: 4,
    name: "Yoga",
    photo:
      "https://w12evostorage.w12app.com.br/evo/upload-imagem/27824/6ed14901-ab94-4b3c-b400-53907c6dffc5.png",
    color: "#fdb100",
    description: "Relajación y movilidad",
    showOnMobile: true,
  },
];

export default function PlanCheckout() {
  // plan = {
  //   ...plan,
  //   activitiesGroups: plan.activitiesGroups ?? mockActivities,
  // };
  const [coupon, setCoupon] = useState("");
  const [open, setOpen] = useState(false);

  const { plan } = useCheckoutStore();
  // const [plan, setPlan] = useState<Membership | null>(null);
  //   const { displayName, durationType, value } = plan;

  // useEffect(() => {
  //   setPlan(plan);
  // }, [plan]);
  if (!plan) return null;

  const sortedDifferentials = [...(plan.differentials || [])].sort(
    (a, b) => a.order - b.order,
  );
  let duration = "";
  if (plan.duration === 0) {
    duration = "Recurrencia mensual";
  } else {
    duration = `Duración ${plan.duration} meses`;
  }
  let value = plan.value;
  let discount = 0;
  if (plan.valuePromotionalPeriod) {
    discount = plan.value - plan.valuePromotionalPeriod;
    value = plan.valuePromotionalPeriod;
  }
  return (
    <>
      <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white p-4 md:p-6 rounded-2xl shadow-xl space-y-6">
        {/* Header */}
        <CardHeader className="flex flex-row justify-between items-start gap-4 p-0">
          <div>
            <CardTitle className="text-base md:text-lg font-semibold">
              {plan.displayName}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-zinc-400 mt-1">
              {duration}
            </CardDescription>
          </div>

          <Button
            variant="link"
            onClick={() => setOpen(true)}
            className="text-xs md:text-sm underline text-zinc-300 hover:text-white p-0 h-auto"
          >
            Ver detalles
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Cupón */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm text-zinc-400">
              Código de cupón
            </label>
            <div className="flex gap-2">
              <Input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="flex-1 bg-transparent border-0 border-b border-zinc-600 outline-none py-1"
              />
              <Button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                APLICAR
              </Button>
            </div>
          </div>

          {/* Resumen */}
          <div className="border border-zinc-700 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Plan</span>
              <span className="text-orange-400 font-semibold">
                $
                {value.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total</span>
              <span className="font-semibold">
                $
                {value.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Cuotas */}
          <div className="space-y-1">
            <label className="text-xs md:text-sm text-zinc-400">
              Número de cuotas
            </label>
            <select className="w-full bg-transparent border-b border-zinc-600 text-sm py-1">
              <option>
                $
                {value.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                al contado
              </option>
            </select>
          </div>

          {/* Detalles */}
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">Cobros detallados:</p>

            <div className="border-t border-zinc-700 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Cobro</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Plan</span>
                <span>
                  $
                  {value.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm md:text-lg font-semibold">
              Total{" "}
              <span className="text-xs md:text-sm text-zinc-400">
                (al contado)
              </span>
            </span>
            <span className="text-lg md:text-xl font-bold">
              $
              {value.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </CardContent>

        {/* Botón */}
        {/* <Button className="w-full h-11 md:h-12 bg-orange-500 hover:bg-orange-600 text-sm md:text-base font-semibold rounded-lg">
          FINALIZAR
        </Button> */}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* <DialogContent
          className="bg-[#1e1e1e] text-white border-zinc-700 
    w-[95%] max-w-lg md:max-w-2xl 
    max-h-[90vh] overflow-y-auto
    rounded-2xl p-4 md:p-10"
        > */}
        <DialogContent
          className="
    bg-[#1e1e1e] text-white border-zinc-700 
    w-[95%] max-w-lg md:max-w-2xl 
    max-h-[90vh] overflow-y-auto
    rounded-2xl p-4 md:p-10
    flex flex-col "
        >
          {/* className="overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none]" */}
          {/* className="
    bg-[#1e1e1e] text-white border-zinc-700 
    w-[95%] max-w-lg md:max-w-2xl 
    max-h-[90vh] 
    flex flex-col 
    rounded-2xl p-4 md:p-10"
        > */}
          <DialogHeader className="shrink-0 order-first">
            <DialogTitle className="text-base md:text-lg font-semibold">
              {plan.displayName}
              <p className="text-xs md:text-sm text-zinc-400">{duration}</p>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto pr-2 ">
            {/* Precio */}
            {discount > 0 && (
              <p className="text-md md:text-xl font-bold text-orange-500 line-through">
                $
                {value.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            )}
            <p className="text-3xl md:text-5xl font-bold mt-2 pb-1 ">
              $
              {value.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {discount > 0 && (
              <p className="text-xs text-gray-400 pb-4">
                ( $
                {discount.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                descuento en el primer mes )
              </p>
            )}

            {/* BENEFICIOS
            <ul className="mt-4 space-y-2 text-sm text-zinc-300 ">
              <li>• Inscripción GRATIS</li>
              <li>• Multisucursal</li>
              <li>• Acceso 24/7</li>
              <li>• Clases ilimitadas</li>
              <li>• 5 invitados al mes</li>
            </ul> */}
            {/* DIFERENCIALES */}
            <div className="mt-6 pt-5">
              <p className="text-sm font-semibold mb-3"> Diferenciales</p>

              <div className="border border-zinc-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm order-2">
                {sortedDifferentials.map((item, index) => (
                  <p key={index} className="flex items-center gap-2">
                    <span className="text-primary">✔ </span> {item.title}
                  </p>
                ))}
              </div>
            </div>
            {/* ACTIVIDADES */}
            {(plan.activitiesGroups ?? []).length > 0 && (
              <div className="mt-6 order-3">
                <p className="text-sm font-semibold mb-3">Actividades</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {plan.activitiesGroups
                    ?.filter((a) => a.showOnMobile)
                    .map((activity) => (
                      <div
                        key={activity.idActivity}
                        className="relative rounded-xl overflow-hidden border border-zinc-700 group"
                      >
                        {/* Imagen */}
                        <img
                          src={activity.photo}
                          alt={activity.name}
                          className="w-full h-24 sm:h-28 object-cover"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition" />

                        {/* Nombre */}
                        <div className="absolute bottom-1 left-2 right-2">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate">
                            {activity.name}
                          </p>
                        </div>

                        {/* Indicador color */}
                        <div
                          className="absolute top-1 right-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: activity.color }}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
            {/* CLOSE */}
            <div className="flex justify-end mt-6 shrink-0 order-last">
              <Button
                onClick={() => setOpen(false)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

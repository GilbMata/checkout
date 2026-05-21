"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { checkProspectMemberStatusAction } from "@/app/actions/evoActions";
import { syncProspectToEvoAction } from "@/app/actions/evoSyncActions";
import { logoutAction } from "@/app/actions/logout";
import LoadComp from "@/app/checkout/_componentes/LoadComp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { AlertTriangle, Calendar, MapPin, Shield } from "lucide-react";

export default function StepPayment() {
  const router = useRouter();
  const { prospect } = useCheckoutStore();
  const [isLoading, setIsLoading] = useState(true);
  const [MemberMemberships, setMemberMemberships] = useState<any>({});
  const [showMembershipDialog, setShowMembershipDialog] = useState(false);
  const [memberInfo, setMemberInfo] = useState<{
    firstName: string;
    lastName: string;
    planInfo: any;
    branchName?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!prospect?.id) {
      setIsLoading(false);
      router.push("/checkout");
      return;
    }

    let cancelled = false;

    async function handleSync() {
      // 1. Verificar si ya es miembro antes de sincronizar con Evo
      const memberCheck = await checkProspectMemberStatusAction(prospect!.id);

      if (cancelled) return;

      if (
        memberCheck.isMember &&
        (memberCheck.MemberMemberships as any)?.statusMemberMembership === 1
      ) {
        setMemberInfo({
          firstName: memberCheck.firstName!,
          lastName: memberCheck.lastName!,
          planInfo: memberCheck.planInfo,
          branchName: memberCheck.branchName,
        });
        if (memberCheck.MemberMemberships) {
          console.log(
            "🚀 ~ handleSync ~ memberCheck:",
            memberCheck.MemberMemberships,
          );
          setMemberMemberships(memberCheck.MemberMemberships);
        }
        setShowMembershipDialog(true);
        setIsLoading(false);
        return;
      }

      try {
        const result = await syncProspectToEvoAction(prospect!.id);

        if (cancelled) return;

        if (result.success && result.cartCheckoutLink) {
          // Redirect externo al checkout de Evo/MP
          window.location.href = result.cartCheckoutLink;
        } else if (result.skipped) {
          toast.warning("Sincronización deshabilitada, redirigiendo...");
          router.push("/checkout");
        } else {
          toast.error(result.error || "No se pudo obtener el link de pago");
          router.push("/checkout");
        }
      } catch {
        if (!cancelled) {
          toast.error("Error al sincronizar con Evo");
          router.push("/checkout");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    handleSync();

    return () => {
      cancelled = true;
    };
  }, [prospect?.id, router]);

  const plan = memberInfo?.planInfo;
  const planName =
    plan?.displayName || plan?.nameMembership || plan?.name || "N/A";
  const membershipType = plan?.membershipType || "N/A";
  const duration = plan?.duration
    ? `${plan.duration} ${plan.durationType || "meses"}`
    : "N/A";

  return (
    <>
      <LoadComp
        isVisible={isLoading}
        title="Preparando tu pago"
        description="Conectando, por favor espera..."
      />

      <Dialog
        open={showMembershipDialog}
        onOpenChange={(open) => {
          // No permitir cerrar por clic fuera, Escape, etc.
          // Solo se cierra al navegar a /checkout
          if (!open) return;
          setShowMembershipDialog(open);
        }}
        disablePointerDismissal
      >
        <DialogContent
          showCloseButton={false}
          className="bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white border-zinc-700 max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 w-lg"
        >
          {/* Barra decorativa superior */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-orange-500 via-orange-400 to-orange-600 rounded-t-2xl" />

          {/* Header con icono de alerta */}
          <div className="relative p-4 pb-2 border-b border-zinc-800">
            <DialogHeader className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-orange-400" />
              </div>
              <DialogTitle className="text-xl font-bold pr-8">
                Ya tienes una membresía activa
              </DialogTitle>
              {/* <p className="text-sm text-zinc-400 mt-2">
                El usuario{" "}
                <span className="text-white font-medium">
                  {memberInfo?.firstName} {memberInfo?.lastName}
                </span>{" "}
                ya cuenta con una membresía activa en Station24.
              </p> */}
            </DialogHeader>
          </div>

          {/* Contenido del diálogo */}
          <div className="p-6 space-y-4">
            {/* Tarjeta de información del plan */}
            <div className="bg-zinc-800/40 rounded-xl border border-zinc-700/50 overflow-hidden">
              {/* Nombre del plan */}
              <div className="p-4 border-b border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      Plan actual
                    </p>
                    <p className="text-base font-semibold text-white">
                      {planName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tipo y duración */}
              <div className="grid grid-cols-2 divide-x divide-zinc-700/50">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      Tipo
                    </p>
                  </div>
                  <p className="text-sm text-zinc-200 font-medium">
                    {membershipType}
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      Duración
                    </p>
                  </div>
                  <p className="text-sm text-zinc-200 font-medium">
                    {duration}
                  </p>
                </div>
              </div>

              {/* Sucursal */}
              <div className="grid grid-cols-2 divide-x divide-zinc-700/50">
                {memberInfo?.branchName && (
                  <div className="p-4 border-t border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        Sucursal
                      </p>
                    </div>
                    <p className="text-sm text-zinc-200 font-medium mt-1">
                      {memberInfo.branchName}
                    </p>
                  </div>
                )}
                {MemberMemberships.membershipEnd && (
                  <div className="p-4 border-t border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        Terminacion
                      </p>
                    </div>
                    <p className="text-sm text-zinc-200 font-medium mt-1">
                      {MemberMemberships.membershipEnd.split("T")[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/30">
              <p className="text-sm text-zinc-400 text-center">
                No es posible realizar una nueva compra mientras tengas una
                membresía activa. Si necesitas ayuda, contacta a soporte.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-4 bg-zinc-900 border-t border-zinc-800">
            <Button
              onClick={async () => {
                await logoutAction();
                router.push("/");
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-10 rounded-xl transition-all duration-200"
            >
              Volver al inicio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

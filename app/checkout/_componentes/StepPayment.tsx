"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  checkProspectMemberStatusAction,
  type ActiveMemberResult,
} from "@/app/actions/evoActions";
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
  const [activeMembers, setActiveMembers] = useState<ActiveMemberResult[]>([]);
  const [showMembershipDialog, setShowMembershipDialog] = useState(false);

  useEffect(() => {
    if (!prospect?.id) {
      setIsLoading(false);
      router.push("/checkout");
      return;
    }

    let cancelled = false;

    async function handleSync() {
      // 1. Verificar si ya es miembro activo en Evo (por teléfono, todas las sucursales)
      const activeMembers = await checkProspectMemberStatusAction(
        prospect!.phone,
      );
      console.log("🚀 ~ handleSync ~ activeMembers:", activeMembers);

      if (cancelled) return;

      if (activeMembers.length > 0) {
        setActiveMembers(activeMembers);
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

  const firstActive = activeMembers[0];

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
          if (!open) return;
          setShowMembershipDialog(open);
        }}
        disablePointerDismissal
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] flex-col rounded-2xl border-zinc-700 bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-0 text-white sm:max-w-lg gap-0"
        >
          {/* Barra decorativa superior */}
          <div className="absolute top-0 left-0 right-0 z-10 h-1.5 shrink-0 rounded-t-2xl bg-linear-to-r from-orange-500 via-orange-400 to-orange-600" />

          {/* Header con icono de alerta — fijo, no scroll */}
          <div className="shrink-0 border-b border-zinc-800 px-6 pb-2 pt-6">
            <DialogHeader className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                <AlertTriangle className="h-7 w-7 text-orange-400" />
              </div>
              <DialogTitle className="pr-8 text-xl font-bold">
                Ya tienes una membresía activa
              </DialogTitle>
              <p className="mt-2 text-sm text-zinc-400">
                El usuario{" "}
                <span className="font-medium text-white">
                  {firstActive?.name}
                </span>{" "}
                ya cuenta con{" "}
                {activeMembers.length > 1
                  ? `${activeMembers.length} membresías activas`
                  : "una membresía activa"}{" "}
                en Station24.
              </p>
            </DialogHeader>
          </div>

          {/* Contenido del diálogo — scrollable */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            {activeMembers.map((member, idx) => (
              <div
                key={`${member.idMember}-${member.idMembership}`}
                className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/40"
              >
                {/* Nombre del plan */}
                <div className="border-b border-zinc-700/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                      <Shield className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        {activeMembers.length > 1
                          ? `Plan #${idx + 1}`
                          : "Plan actual"}
                      </p>
                      <p className="text-base font-semibold text-white">
                        {member.nameMembership}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sucursal y terminación */}
                <div className="grid grid-cols-2 divide-x divide-zinc-700/50">
                  <div className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        Sucursal
                      </p>
                    </div>
                    <p className="text-sm font-medium text-zinc-200">
                      {member.branch
                        ? `${member.branch.name}`
                        : `ID: ${member.idBranch}`}
                    </p>
                  </div>
                  <div className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <p className="text-xs uppercase tracking-wider text-zinc-500">
                        Terminación
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-200">
                      {member.membershipEnd?.split("T")[0] ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Mensaje informativo */}
            <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
              <p className="text-center text-sm text-zinc-400">
                No es posible realizar una nueva compra mientras tengas una
                membresía activa. Si necesitas ayuda, contacta a soporte.
              </p>
            </div>
          </div>

          {/* Footer — fijo abajo */}
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-4">
            <Button
              onClick={async () => {
                await logoutAction();
                router.push("/");
              }}
              className="h-10 w-full rounded-xl bg-orange-500 font-semibold text-white transition-all duration-200 hover:bg-orange-600"
            >
              Volver al inicio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

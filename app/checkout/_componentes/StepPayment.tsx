"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { syncProspectToEvoAction } from "@/app/actions/evoSyncActions";
import LoadComp from "@/app/checkout/_componentes/LoadComp";
import { useCheckoutStore } from "@/store/useCheckoutStore";

export default function StepPayment() {
  const router = useRouter();
  const { prospect, plan } = useCheckoutStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!prospect?.id) {
      setIsLoading(false);
      router.push("/checkout");
      return;
    }

    let cancelled = false;

    async function handleSync() {
      try {
        const result = await syncProspectToEvoAction(
          prospect!.id,
          plan!.idMembership,
          plan!.idBranch,
        );

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

  return (
    <LoadComp
      isVisible={isLoading}
      title="Preparando tu pago"
      description="Conectando, por favor espera..."
    />
  );
}

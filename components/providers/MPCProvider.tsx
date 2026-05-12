"use client";

import { ensureMercadoPagoInitialized } from "@/lib/mercadoPagoInit";
import { useEffect } from "react";

interface MPCProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que inicializa Mercado Pago UNA SOLA VEZ en toda la app.
 * Usa null como placeholder key para no interferir con la inicialización
 * específica de cada componente (orders vs subscriptions).
 * Cada CardPaymentBrick se encarga de su propia inicialización
 * con la key correcta via ensureMercadoPagoInitialized.
 */
export default function MPCProvider({ children }: MPCProviderProps) {
  useEffect(() => {
    // Placeholder init — never sets _isInitialized, so it won't block
    // component-level ensureMercadoPagoInitialized calls.
    ensureMercadoPagoInitialized(null).catch((error) => {
      console.error("[MPCProvider] Error inicializando Mercado Pago:", error);
    });
  }, []);

  return <>{children}</>;
}
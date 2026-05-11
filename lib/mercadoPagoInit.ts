import { initMercadoPago } from "@mercadopago/sdk-react";

let initializationPromise: Promise<void> | null = null;
let _isInitialized = false;
let _initializedKey: string | null = null;

// Exportar estado para consulta externa
export const isMercadoPagoReady = () => _isInitialized;
export const getInitializedKey = () => _initializedKey;

export async function ensureMercadoPagoInitialized(
  publicKey: string,
): Promise<void> {
  // Si ya está inicializado con la misma key, retornar inmediatamente
  if (_isInitialized && _initializedKey === publicKey) return;

  // Si ya está inicializado con otra key, no re-inicializar (evitar múltiples inicializaciones)
  if (_isInitialized && _initializedKey !== publicKey) return;

  if (!initializationPromise) {
    initializationPromise = new Promise<void>((resolve, reject) => {
      try {
        initMercadoPago(publicKey, { locale: "es-MX" });
        _isInitialized = true;
        _initializedKey = publicKey;
        console.log("[mercadoPagoInit] initMercadoPago() completado exitosamente");
        resolve();
      } catch (error) {
        console.error("[mercadoPagoInit] Error en initMercadoPago:", error);
        // No reseteamos initializationPromise para evitar retry loops inmediatos
        reject(error);
      }
    });
  }

  return initializationPromise;
}

export function resetMercadoPagoInitialization(): void {
  initializationPromise = null;
  _isInitialized = false;
  _initializedKey = null;
}

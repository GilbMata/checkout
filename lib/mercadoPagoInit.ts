import { initMercadoPago } from "@mercadopago/sdk-react";

let initializationPromise: Promise<void> | null = null;
let _isInitialized = false;
let _initializedKey: string | null = null;

export const isMercadoPagoReady = () => _isInitialized;
export const getInitializedKey = () => _initializedKey;

/**
 * Inicializa MercadoPago SDK
 * @param publicKey - La public key de MP
 * @param trackingId - Optional tracking ID para debug
 */
export async function ensureMercadoPagoInitialized(
  publicKey: string,
): Promise<void> {
  // Si ya está inicializado con la misma key, no hacer nada
  if (_isInitialized && _initializedKey === publicKey) {
    console.log("[MP] Already initialized with same key, skipping");
    return;
  }

  // Key diferente — hacer reset completo antes de reinicializar
  if (_isInitialized && _initializedKey !== publicKey) {
    console.log("[MP] Key changed, resetting...");
    initializationPromise = null;
    _isInitialized = false;
    _initializedKey = null;
  }

  if (!initializationPromise) {
    console.log("[MP] Initializing with key:", publicKey.substring(0, 20) + "...");
    initializationPromise = new Promise<void>((resolve, reject) => {
      try {
        // Usar configuración básica sin opciones adicionales
        // que puedan causar conflictos
        initMercadoPago(publicKey, { 
          locale: "es-MX",
        });
        
        _isInitialized = true;
        _initializedKey = publicKey;
        console.log("[MP] Initialization successful");
        resolve();
      } catch (error) {
        console.error("[MP] Initialization failed:", error);
        initializationPromise = null;
        _isInitialized = false;
        _initializedKey = null;
        reject(error);
      }
    });
  }

  return initializationPromise;
}

/**
 * Resetea la inicialización de MP
 * Útil cuando hay problemas con el estado del componente
 */
export function resetMercadoPagoInitialization(): void {
  console.log("[MP] Resetting initialization state");
  initializationPromise = null;
  _isInitialized = false;
  _initializedKey = null;
}

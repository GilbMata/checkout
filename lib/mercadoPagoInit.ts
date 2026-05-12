import { initMercadoPago } from "@mercadopago/sdk-react";

let initializationPromise: Promise<void> | null = null;
let _isInitialized = false;
let _initializedKey: string | null = null;

export const isMercadoPagoReady = () => _isInitialized;
export const getInitializedKey = () => _initializedKey;

export async function ensureMercadoPagoInitialized(
  publicKey: string | null,
): Promise<void> {
  // ✅ No-op for placeholder/null key — component-level init will handle it
  if (!publicKey) {
    return;
  }

  // ✅ Ya inicializado con la misma key — no hacer nada
  if (_isInitialized && _initializedKey === publicKey) {
    return;
  }

  // ✅ Ya inicializado, pero con key diferente
  // No podemos cambiar la key sin recargar la página (limitación del SDK)
  // Simplemente esperamos a que termine la inicialización actual
  if (_isInitialized && _initializedKey !== publicKey) {
    console.warn(
      `[MercadoPago] Ya inicializado con key diferente: ${_initializedKey} vs ${publicKey}`,
    );
    // Esperamos al promise existente en lugar de reinicializar
    if (initializationPromise) {
      return initializationPromise;
    }
    // Si promise es null por alguna razón, dejamos que se re-inicialice
  }

  if (!initializationPromise) {
    initializationPromise = new Promise<void>((resolve, reject) => {
      try {
        // ✅ Solo inicializamos si NO está ya inicializado
        initMercadoPago(publicKey, { locale: "es-MX" });
        _isInitialized = true;
        _initializedKey = publicKey;
        resolve();
      } catch (error) {
        initializationPromise = null;
        _isInitialized = false;
        _initializedKey = null;
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

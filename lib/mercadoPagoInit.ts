import { initMercadoPago } from "@mercadopago/sdk-react";

let initializationPromise: Promise<void> | null = null;
let _isInitialized = false;
let _initializedKey: string | null = null;

export const isMercadoPagoReady = () => _isInitialized;
export const getInitializedKey = () => _initializedKey;

export async function ensureMercadoPagoInitialized(
  publicKey: string,
): Promise<void> {
  if (_isInitialized && _initializedKey === publicKey) return;

  // Key diferente — reset para reinicializar
  if (_isInitialized && _initializedKey !== publicKey) {
    initializationPromise = null;
    _isInitialized = false;
    _initializedKey = null;
  }

  if (!initializationPromise) {
    initializationPromise = new Promise<void>((resolve, reject) => {
      try {
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

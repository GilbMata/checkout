import { initMercadoPago } from "@mercadopago/sdk-react";

let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

export async function ensureMercadoPagoInitialized(
  publicKey: string,
): Promise<void> {
  if (isInitialized) return;

  if (!initializationPromise) {
    initializationPromise = new Promise((resolve, reject) => {
      try {
        initMercadoPago(publicKey, { locale: "es-MX" });
        isInitialized = true;
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        initializationPromise = null;
      }
    });
  }

  return initializationPromise;
}

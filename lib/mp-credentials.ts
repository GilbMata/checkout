/**
 * Utilidad para obtener las credenciales correctas de MercadoPago
 * según el entorno (desarrollo o producción)
 */

/**
 * Detecta si estamos en entorno de producción
 * Returns true solo si:
 * - NODE_ENV es "production" Y la variable MP_ENV está configurada como "production"
 * Esto evita que el build (NODE_ENV=production) use credenciales de prod automáticamente
 */
export function isProductionEnvironment(): boolean {
  // Solo producción si ambas condiciones se cumplen
  if (
    process.env.NODE_ENV === "production" &&
    process.env.MP_ENV === "PRODUCTION"
  ) {
    return true;
  }

  // En cualquier otro caso (development, test, o build)
  return false;
}

/**
 * Obtiene la Public Key correcta para el frontend
 * - Producción: usa las credenciales de producción (si están definidas)
 * - Desarrollo: usa las credenciales de prueba
 */
export function getMPPublicKey(type: "orders" | "subscriptions"): string {
  const isProd = isProductionEnvironment();

  // Intentar obtener credenciales de producción primero
  let prodKey: string | undefined;
  if (type === "orders") {
    prodKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_ORDERS_PRODUCTION;
  } else {
    prodKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_SUBSCRIPTIONS_PRODUCTION;
  }

  // Si estamos en prod Y hay credenciales de prod, usarlas
  if (isProd && prodKey) {
    return prodKey;
  }

  // Sino, usar credenciales de prueba
  if (type === "orders") {
    return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_ORDERS!;
  }
  return process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_SUBSCRIPTIONS!;
}

/**
 * Obtiene el Access Token correcto para el backend
 * - Producción: usa las credenciales de producción (si están definidas)
 * - Desarrollo: usa las credenciales de prueba
 */
export function getMPAccessToken(type: "orders" | "subscriptions"): string {
  const isProd = isProductionEnvironment();

  // Intentar obtener credenciales de producción primero
  let prodToken: string | undefined;
  if (type === "orders") {
    prodToken = process.env.MP_ACCESS_TOKEN_ORDERS_PRODUCTION;
  } else {
    prodToken = process.env.MP_ACCESS_TOKEN_SUBSCRIPTIONS_PRODUCTION;
  }

  // Si estamos en prod Y hay credenciales de prod, usarlas
  if (isProd && prodToken) {
    return prodToken;
  }

  // Sino, usar credenciales de prueba
  if (type === "orders") {
    return process.env.MP_ACCESS_TOKEN_ORDERS!;
  }
  return process.env.MP_ACCESS_TOKEN_SUBSCRIPTIONS!;
}

/**
 * Obtiene la configuración de entorno de MP
 * "test" para desarrollo, "production" para prod
 */
export function getMPEnvironment(): string {
  return isProductionEnvironment() ? "production" : "test";
}

/**
 * Obtiene el nombre descriptivo del entorno actual
 */
export function getEnvironmentName(): string {
  return isProductionEnvironment() ? "PRODUCCIÓN" : "DESARROLLO";
}

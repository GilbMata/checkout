"use server";

import { syncProspectToEvo, createSaleInEvoForProspect } from "@/lib/evoSync";

/**
 * Server Action — Sincroniza un prospecto local con Evo.
 * Crea el prospecto en Evo y lo convierte en miembro.
 *
 * @param prospectId - UUID del prospecto en BD local
 */
export async function syncProspectToEvoAction(prospectId: string) {
  return await syncProspectToEvo(prospectId);
}

/**
 * Server Action — Registra una venta en Evo (futuro).
 * El prospecto debe estar previamente sincronizado (tener idMember).
 *
 * @param prospectId - UUID del prospecto en BD local
 * @param saleData - Datos de la venta
 */
export async function createSaleInEvoAction(
  prospectId: string,
  saleData: Record<string, unknown> = {},
) {
  return await createSaleInEvoForProspect(prospectId, saleData);
}

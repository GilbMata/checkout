"use server";

import { syncProspectToEvo } from "@/lib/evoSync";

/**
 * Server Action — Sincroniza un prospecto local con Evo.
 * Crea el prospecto en Evo y lo convierte en miembro.
 *
 * @param prospectId - UUID del prospecto en BD local
 */
export async function syncProspectToEvoAction(prospectId: string) {
  return await syncProspectToEvo(prospectId);
}

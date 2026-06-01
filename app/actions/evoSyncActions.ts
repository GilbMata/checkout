"use server";

import { syncProspectToEvo } from "@/lib/evoSync";

/**
 * Server Action — Sincroniza un prospecto local con Evo.
 *
 * @param prospectId - UUID del prospecto en BD local
 * @param idMembership - ID de la membresía (del plan, desde la página)
 * @param idBranch - ID de la sucursal (del plan, desde la página)
 */
export async function syncProspectToEvoAction(
  prospectId: string,
  idMembership: number,
  idBranch: number,
) {
  return await syncProspectToEvo(prospectId, { idMembership, idBranch });
}

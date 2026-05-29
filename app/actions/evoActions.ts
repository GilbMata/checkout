"use server";

import { getProspectByEmail } from "@/lib/auth/prospect";
import {
  getBranchId,
  getBranchInfo,
  getMemberByEmail,
  getMemberByPhone,
  getMemberMemberships,
  getMembership,
  getVouchers,
} from "@/lib/evoApi";

export async function getMemberAction(email: string) {
  if (!email) {
    throw new Error("Email requerido");
  }

  return await getMemberByEmail(email);
}
export async function getEvoMemberbyPhoneAction(phone: string) {
  if (!phone) {
    throw new Error("phone requerido");
  }

  return await getMemberByPhone(phone);
}

export async function getMembershipAction(membershipId: string) {
  if (!membershipId) {
    throw new Error("El ID de membresía es requerido");
  }

  try {
    const data = await getMembership(membershipId);

    return data;
  } catch (error) {
    console.error("Error en getMembershipAction:", error);
    throw new Error("No se pudo obtener la información del plan");
  }
}

export async function getBranchAction(id: string) {
  // Convertimos a string por si el JSON de la API de Station 24 viene como número
  const branchId = id;

  if (!branchId || branchId === "undefined") {
    throw new Error("El ID de sucursal es requerido para la consulta");
  }

  try {
    const data = await getBranchId(branchId);
    return data;
  } catch (error) {
    console.error("Error en getBranchAction:", error);
    throw new Error("No se pudo obtener la información de la sucursal");
  }
}

export async function getProspectByEmailAction(email: string) {
  // Convertimos a string por si el JSON de la API de Station 24 viene como número
  const prospect = email;

  if (!email || email === "undefined") {
    throw new Error("El ID de sucursal es requerido para la consulta");
  }

  try {
    const data = await getProspectByEmail(prospect);
    console.debug("🚀 ~ getProspectByEmailAction ~ data:", data);
    const exists = Array.isArray(data) ? data.length > 0 : Boolean(data);

    return exists;
    return data;
  } catch (error) {
    console.error("Error en getProspectByEmailAction:", error);
    throw new Error("No se pudo obtener la información ");
  }
}

/**
 * Obtiene los vouchers/cupones disponibles de Evo
 * @param idBranch - ID de sucursal (opcional)
 * @returns Array de vouchers normalizados
 */
export async function getVouchersAction(idBranch?: string) {
  try {
    const data = await getVouchers({ idBranch });
    return data;
  } catch (error) {
    console.error("Error en getVouchersAction:", error);
    throw new Error("No se pudo obtener los vouchers");
  }
}

// ============================================================================
// Resultado de checkProspectMemberStatusAction
// ============================================================================

export interface ActiveMemberBranch {
  name: string;
  city: string;
}

export interface ActiveMemberResult {
  idMember: number;
  name: string;
  idMembership: number;
  nameMembership: string;
  membershipStart: string;
  membershipEnd: string;
  idBranch: number;
  branch: ActiveMemberBranch | null;
}

/**
 * Busca todos los miembros activos por teléfono en todas las sucursales.
 *
 * 1. Obtiene todos los miembros por teléfono (getMemberByPhone)
 * 2. Para cada miembro, obtiene sus memberships activas (status=1)
 * 3. Para cada membership activa, obtiene info de la sucursal
 * 4. Retorna solo los que tienen status activo
 *
 * @param phone - Número de teléfono (sin código de área)
 * @returns Array de miembros activos con info de plan y sucursal
 */
export async function checkProspectMemberStatusAction(
  phone: string,
): Promise<ActiveMemberResult[]> {
  // 1. Obtener todos los miembros por teléfono
  const members = await getMemberByPhone(phone, "1");
  if (members.length === 0) return [];

  const results: ActiveMemberResult[] = [];

  // 2. Para cada miembro, obtener memberships activas
  for (const member of members) {
    try {
      const memberships = await getMemberMemberships(member.idMember, 1); // solo activas

      if (memberships.length === 0) continue;

      for (const membership of memberships) {
        // 3. Obtener info de la sucursal
        let branchInfo: ActiveMemberBranch | null = null;
        try {
          const branch = await getBranchInfo(membership.idBranch);
          if (branch) {
            branchInfo = {
              name: branch.name,
              city: branch.city,
            };
          }
        } catch (error) {
          console.error(
            `[checkProspectMemberStatus] Error getBranchInfo(${membership.idBranch}):`,
            error,
          );
        }

        results.push({
          idMember: membership.idMember,
          name: member.firstName
            ? `${member.firstName} ${member.lastName ?? ""}`.trim()
            : membership.name,
          idMembership: membership.idMembership,
          nameMembership: membership.nameMembership,
          membershipStart: membership.membershipStart,
          membershipEnd: membership.membershipEnd,
          idBranch: membership.idBranch,
          branch: branchInfo,
        });
      }
    } catch (error) {
      console.error(
        `[checkProspectMemberStatus] Error getMemberMemberships(${member.idMember}):`,
        error,
      );
      // Continuar con el siguiente miembro
      continue;
    }
  }

  return results;
}

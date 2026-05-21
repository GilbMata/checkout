"use server";

import { getProspectByEmail } from "@/lib/auth/prospect";
import { prisma } from "@/lib/db/index";
import {
  getBranchId,
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

/**
 * Verifica si un prospecto ya tiene un ID de miembro y estatus "member" en BD.
 * Si es miembro, consulta la información del plan vía Evo.
 */
export async function checkProspectMemberStatusAction(prospectId: string) {
  const prospect = await prisma.prospects.findUnique({
    where: { id: prospectId },
    select: {
      idMember: true,
      status: true,
      planId: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!prospect || !prospect.idMember || prospect.status !== "member") {
    return { isMember: false as const };
  }

  let planInfo = null;
  let MemberMemberships = null;
  let branchName: string | null = null;

  if (prospect.planId) {
    try {
      planInfo = await getMembership(prospect.planId);
      planInfo = planInfo?.list?.[0];

      // Obtener nombre de sucursal desde el plan
      const idBranch = planInfo?.idBranch;
      if (idBranch) {
        try {
          const branchData = await getBranchId(String(idBranch));
          if (Array.isArray(branchData) && branchData.length > 0) {
            branchName =
              branchData[0]?.name || branchData[0]?.branchName || null;
          } else if (branchData?.branch && Array.isArray(branchData.branch)) {
            branchName =
              branchData.branch[0]?.name ||
              branchData.branch[0]?.branchName ||
              null;
          }
        } catch (error) {
          console.error("Error getBranchId:", error);
        }
      }

      MemberMemberships = await getMemberMemberships(prospect.idMember);
    } catch (error) {
      console.error("Error en getMembership:", error);
    }
  }

  return {
    isMember: true as const,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    planInfo,
    branchName,
    MemberMemberships,
  };
}

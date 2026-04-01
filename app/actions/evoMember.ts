
"use server";

import { getProspectByEmail } from '@/lib/auth/prospect';
import { getBranchId, getMemberByEmail, getMemberByPhone, getMembership } from "@/lib/evoApi";

export async function getMemberAction(email: string) {
    if (!email) {
        throw new Error("Email requerido");
    }

    return await getMemberByEmail(email);
}
export async function getMemberbyPhoneAction(phone: string) {
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
        console.debug("🚀 ~ getProspectByEmailAction ~ data:", data)
        const exists = Array.isArray(data)
            ? data.length > 0
            : Boolean(data);

        return exists;
        return data;
    } catch (error) {
        console.error("Error en getProspectByEmailAction:", error);
        throw new Error("No se pudo obtener la información ");
    }
}
"use server";

import { prisma } from "@/lib/db/index";
import { assertNotDisposableEmail } from "@/lib/email/disposable-email";
import { normalizeGender } from "@/lib/gender";
import { DocumentType, Gender, MembershipStatus } from "@/src/generated/prisma";

type CreateProspectData = {
  email: string;
  curp: string;
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string | Date | null;
  areaCode?: string;
  phone: string;
  planId?: string;

  idMember?: number;
  idBranch?: number;
  branchName?: string;
  accessBlocked?: boolean;
  blockedReason?: string | null;
  documentType?: string;
  documentNumber?: string;
  documentId?: string;
  status?: string;
  membershipStatus?: string;

  // Address fields
  address?: string;
  number?: string;
  state?: string;
  city?: string;
  zipCode?: string;
};

export async function createProspectAction(data: CreateProspectData) {
  try {
    assertNotDisposableEmail(data.email);

    const email = data.email.toLowerCase().trim();
    const phone = data.phone.replace(/\D/g, "");

    // Convert birthDate to Date if provided
    let birthDate: Date | null = null;
    if (data.birthDate) {
      birthDate =
        data.birthDate instanceof Date
          ? data.birthDate
          : new Date(data.birthDate);
    }

    // Normalizar género al enum Prisma
    const gender: Gender = normalizeGender(data.gender) ?? Gender.other;

    // Convertir documentType a enum Prisma
    const rawDocType = data.documentType?.toUpperCase().trim();
    const documentTypeEnum: DocumentType = Object.values(DocumentType).includes(
      rawDocType as DocumentType,
    )
      ? (rawDocType as DocumentType)
      : DocumentType.CURP;

    // Convertir status a Prisma enum
    const normalizedStatus = data.membershipStatus?.toLowerCase().trim();
    const statusEnum: MembershipStatus = Object.values(
      MembershipStatus,
    ).includes(normalizedStatus as MembershipStatus)
      ? (normalizedStatus as MembershipStatus)
      : MembershipStatus.prospect;

    const prospect = await prisma.prospects.create({
      data: {
        email,
        curp: data.curp,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: gender,
        birthDate,
        areaCode: data.areaCode,
        phone,
        idMember: data.idMember ?? null,
        idBranch: data.idBranch ?? null,
        branchName: data.branchName ?? null,
        accessBlocked: data.accessBlocked ?? false,
        blockedReason: data.blockedReason ?? null,
        documentType: documentTypeEnum,
        documentNumber: data.documentNumber ?? data.curp,
        documentId: data.documentId ?? null,
        status: statusEnum,
        membershipStatus: data.membershipStatus ?? null,
        paymentPending: true,
        planId: data.planId ?? null,

        // Address fields
        address: data.address ?? null,
        number: data.number ?? null,
        state: data.state ?? null,
        city: data.city ?? null,
        zipCode: data.zipCode ?? null,
      },
    });

    return prospect;
  } catch (error: any) {
    console.error("Error creating prospect:", error);

    // Check for Prisma unique constraint violation (P2002)
    const prismaError = error as { code?: string; message?: string };
    if (prismaError.code === "P2002") {
      // Parse constraint fields from error message
      const message = prismaError.message || "";
      const match = message.match(/Unique constraint failed on the fields: \(`(.*?)`\)/);
      const target = match ? match[1].split("`, `") : [];
      console.log("Unique constraint violation on:", target);

      if (target.some((f) => f.includes("email"))) {
        throw new Error("El correo electrónico ya está registrado");
      }
      if (target.some((f) => f.includes("phone"))) {
        throw new Error("El teléfono ya está registrado");
      }
      if (target.some((f) => f.includes("curp"))) {
        throw new Error("El CURP ya está registrado");
      }
    }

    throw new Error("No se pudo crear el prospecto");
  }
}

export async function getProspectByPhoneAction(phone: string) {
  try {
    const prospect = await prisma.prospects.findFirst({
      where: { phone },
    });

    return prospect;
  } catch (error) {
    console.error("Error obtener prospecto con teléfono:", error);
    throw new Error("No se pudo obtener el prospecto");
  }
}

export async function getProspectByEmailAction(email: string) {
  try {
    // Buscar por email con findFirst (ya que email no es único)
    const prospect = await prisma.prospects.findFirst({
      where: { email: email.toLowerCase().trim() },
      orderBy: { createdAt: 'desc' }, // Obtener el más reciente
    });

    return prospect;
  } catch (error) {
    console.error("Error obtener prospecto con email:", error);
    throw new Error("No se pudo obtener el prospecto");
  }
}

export async function getProspectByCurpAction(curp: string) {
  try {
    const prospect = await prisma.prospects.findUnique({
      where: { curp },
    });

    return prospect;
  } catch (error) {
    console.error("Error getting prospect by CURP:", error);
    throw new Error("No se pudo obtener el prospecto");
  }
}

export async function updateProspectToMemberAction(id: string) {
  try {
    await prisma.prospects.update({
      where: { id },
      data: {
        paymentPending: false,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating prospect to member:", error);
    throw new Error("No se pudo actualizar el prospecto");
  }
}

/**
 * Actualiza el CURP de un prospecto existente.
 * Útil cuando el miembro de Evo no tenía CURP y se collecta después del OTP.
 */
export async function updateProspectCurpAction(id: string, curp: string) {
  try {
    // Validar que el CURP no esté ya en uso por otro prospecto
    const existing = await prisma.prospects.findUnique({
      where: { curp },
    });

    if (existing && existing.id !== id) {
      throw new Error("El CURP ya está registrado por otro prospecto");
    }

    const updated = await prisma.prospects.update({
      where: { id },
      data: {
        curp,
        documentNumber: curp,
      },
    });

    return { success: true, prospect: updated };
  } catch (error: any) {
    console.error("Error updating prospect CURP:", error);
    if (error.message.includes("ya está registrado")) {
      throw error;
    }
    throw new Error("No se pudo actualizar el CURP");
  }
}

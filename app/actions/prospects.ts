"use server";

import { prisma } from "@/lib/db/index";
import { assertNotDisposableEmail } from "@/lib/email/disposable-email";
import { Prisma } from "@prisma/client";

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
};

export async function createProspectAction(data: CreateProspectData) {
  try {
    // Validate email is not from a disposable provider
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

    const prospect = await prisma.prospects.create({
      data: {
        email,
        curp: data.curp,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        birthDate,
        areaCode: data.areaCode,
        phone,
        idMember: data.idMember ?? null,
        idBranch: data.idBranch ?? null,
        branchName: data.branchName ?? null,
        accessBlocked: data.accessBlocked ?? false,
        blockedReason: data.blockedReason ?? null,
        documentType: data.documentType ?? "CURP",
        documentNumber: data.documentNumber ?? data.curp,
        documentId: data.documentId ?? null,
        status: data.status ?? "prospect",
        membershipStatus: data.membershipStatus ?? "pending",
        paymentPending: true,
        planId: data.planId ?? null,
      },
    });

    return prospect;
  } catch (error: any) {
    console.error("Error creating prospect:", error);

    // Handle Prisma unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint failed
        const target = (error.meta?.target as string[]) || [];
        if (target.includes("email")) {
          throw new Error("El correo electrónico ya está registrado");
        }
        if (target.includes("phone")) {
          throw new Error("El teléfono ya está registrado");
        }
        if (target.includes("curp")) {
          throw new Error("El CURP ya está registrado");
        }
      }
    }

    if (
      error?.message?.includes("UNIQUE") ||
      error?.message?.includes("already exists")
    ) {
      throw new Error("El correo electrónico ya está registrado");
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
    const prospect = await prisma.prospects.findUnique({
      where: { email },
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

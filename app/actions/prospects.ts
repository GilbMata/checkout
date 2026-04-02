"use server";

import { db } from "@/lib/db/index";
import { prospects } from "@/lib/db/schema";
import { assertNotDisposableEmail } from "@/lib/email/disposable-email";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface CreateProspectData {
  email: string;
  curp: string;
  firstName: string;
  lastName: string;
  genero?: string;
  birthDate?: string;
  areaCode?: string;
  phone: string;
  planId?: string;
}

export async function createProspectAction(data: CreateProspectData) {
  try {
    // Validate email is not from a disposable provider
    assertNotDisposableEmail(data.email);

    const id = uuidv4();
    const now = Date.now();

    await db.insert(prospects).values({
      id,
      email: data.email,
      curp: data.curp,
      firstName: data.firstName,
      lastName: data.lastName,
      genero: data.genero || null,
      birthDate: data.birthDate || null,
      areaCode: data.areaCode || null,
      phone: data.phone,
      planId: data.planId || null,
      paymentPending: true,
      isMember: false,
      createdAt: now,
      updatedAt: now,
    });

    // Return the created prospect
    const result = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, id))
      .limit(1);

    return result[0];
  } catch (error: any) {
    console.error("Error creating prospect:", error);
    if (error?.message?.includes("UNIQUE constraint failed")) {
      throw new Error(
        "El correo electrónico ya está registrado con otro número",
      );
    }
    if (error?.message?.includes("already exists")) {
      throw new Error(
        "El correo electrónico ya está registrado con otro número",
      );
    }
    throw new Error("No se pudo crear el prospecto");
  }
}

export async function getProspectByPhoneAction(phone: string) {
  try {
    const result = await db
      .select()
      .from(prospects)
      .where(eq(prospects.phone, phone.slice(3, phone.length)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error obtener prospecto con teléfono:", error);
    throw new Error("No se pudo obtener el prospecto");
  }
}

export async function getProspectByEmailAction(email: string) {
  try {
    const result = await db
      .select()
      .from(prospects)
      .where(eq(prospects.email, email))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error obtener prospecto con email:", error);
    throw new Error("No se pudo obtener el prospecto");
  }
}

export async function getProspectByCurpAction(curp: string) {
  try {
    const result = await db
      .select()
      .from(prospects)
      .where(eq(prospects.curp, curp))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting prospect by CURP:", error);
    throw new Error("No se pudo obtener el prospecto");
  }
}

export async function updateProspectToMemberAction(id: string) {
  try {
    await db
      .update(prospects)
      .set({
        paymentPending: false,
        isMember: true,
        updatedAt: Date.now(),
      })
      .where(eq(prospects.id, id));

    return { success: true };
  } catch (error) {
    console.error("Error updating prospect to member:", error);
    throw new Error("No se pudo actualizar el prospecto");
  }
}

// lib/evo.ts
import "server-only";

const baseUrl = process.env.EVO_API_URL!;
const auth = Buffer.from(
  `${process.env.EVO_USER}:${process.env.EVO_PASS}`,
).toString("base64");

// Interfaz para el miembro raw de EVO
interface EvoMemberRaw {
  idMember: number;
  photo: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  status: string;
  contacts: Array<{
    idPhone: number;
    idMember: number;
    idEmployee: number | null;
    idProspect: number | null;
    idProvider: number | null;
    idContactType: number;
    contactType: string;
    ddi: string | null;
    description: string;
  }>;
}

// Interfaz para el miembro normalizado
export interface EvoMember {
  idMember: number;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  phone: string;
  email: string;
}

// Normalizar datos del miembro de EVO
function normalizeEvoMember(data: EvoMemberRaw): EvoMember {
  // Buscar teléfono en contacts
  const phoneContact = data.contacts?.find(
    (c) => c.contactType === "Cellphone",
  );
  const phone = phoneContact
    ? `${phoneContact.ddi || "52"}${phoneContact.description}`
    : "";

  // Buscar email en contacts
  const emailContact = data.contacts?.find((c) => c.contactType === "E-mail");
  const email = emailContact?.description || "";

  // Normalizar género
  const genderMap: Record<string, string> = {
    Male: "Masculino",
    Female: "Femenino",
  };
  const gender = genderMap[data.gender] || data.gender;

  return {
    idMember: data.idMember,
    firstName: data.firstName,
    lastName: data.lastName,
    gender,
    birthDate: data.birthDate,
    phone,
    email,
  };
}

export async function getMemberByEmail(email: string) {
  const baseUrl = process.env.EVO_API_URL!;
  const auth = Buffer.from(
    `${process.env.EVO_USER}:${process.env.EVO_PASS}`,
  ).toString("base64");

  const url = new URL("/api/v2/members", baseUrl);
  url.searchParams.set("email", email);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`EVO error: ${res.status}`);
  }
  const rawData = await res.json();

  // Si es un array, tomar el primer elemento
  const data: EvoMemberRaw = Array.isArray(rawData) ? rawData[0] : rawData;
  return normalizeEvoMember(data);
}

export async function getMemberByPhone(phone: string) {
  const baseUrl = process.env.EVO_API_URL!;
  const auth = Buffer.from(
    `${process.env.EVO_USER}:${process.env.EVO_PASS}`,
  ).toString("base64");

  const url = new URL("/api/v2/members", baseUrl);
  url.searchParams.set("phone", phone);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`EVO error: ${res.status}`);
  }
  const rawData = await res.json();

  if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
    return null;
  }

  const data: EvoMemberRaw = Array.isArray(rawData) ? rawData[0] : rawData;
  return normalizeEvoMember(data);
}

export async function getMembership(membershipId: string) {
  const url = new URL("/api/v2/membership", baseUrl);
  url.searchParams.set("idMembership", membershipId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`EVO error: ${res.status}`);
  }
  return res.json();
}

export async function getBranchId(idBranch: string) {
  const url = new URL("/api/v1/configuration", baseUrl);
  // console.debug("🚀 ~ getBranchId ~ url:", url)
  url.searchParams.set("idBranch", idBranch);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`EVO error: ${res.status}`);
  }
  return res.json();
}

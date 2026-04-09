// lib/evo.ts
import "server-only";

const baseUrl = process.env.EVO_API_URL!;
const auth = Buffer.from(
  `${process.env.EVO_USER}:${process.env.EVO_PASS}`,
).toString("base64");

// Interfaz para el miembro raw de EVO
type EvoMemberRaw = {
  idMember: number;
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  document?: string;
  documentId?: string;

  idBranch?: number;
  branchName?: string;

  accessBlocked?: boolean;
  blockedReason?: string | null;

  status?: string;
  membershipStatus?: string;

  contacts?: Array<{
    contactType: string;
    ddi?: string | null;
    description: string;
  }>;

  [key: string]: unknown;
};

// Interfaz para el miembro normalizado
export interface EvoMemberNormalized {
  email: string;
  curp: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  areaCode: string;
  phone?: string;
  planId?: string | null;

  idMember: number;
  idBranch?: number;
  branchName?: string;

  accessBlocked: boolean;
  blockedReason: string | null;

  documentType: string;
  documentNumber: string;
  documentId: string;

  status: string;
  membershipStatus: string;

  paymentPending: boolean;
}

// Normalizar datos del miembro de EVO
function normalizeEvoMember(data: EvoMemberRaw): EvoMemberNormalized {
  // Buscar teléfono en contacts
  const phoneContact = data.contacts?.find(
    (c) => c.contactType === "Cellphone",
  );

  const areaCode = phoneContact?.ddi || "52";
  const phone = phoneContact?.description;

  // Buscar email en contacts
  const emailContact = data.contacts?.find((c) => c.contactType === "E-mail");
  const email = (emailContact?.description || "").toLowerCase().trim();

  // Normalizar género
  const genderMap: Record<string, string> = {
    Male: "Masculino",
    Female: "Femenino",
  };
  const gender = data.gender ? genderMap[data.gender] || data.gender : "";

  const birthDate = data.birthDate ? data.birthDate.split("T")[0] : "";

  const documentNumber = data.document || "";
  const documentId = data.documentId || "";
  const documentType = data.document ? "CURP" : "";

  return {
    email,
    curp: documentNumber,

    firstName: data.firstName?.trim(),
    lastName: data.lastName?.trim(),

    gender,
    birthDate,

    areaCode,
    phone: phone || undefined,

    planId: null, // luego lo llenas desde memberships

    idMember: data.idMember,
    idBranch: data.idBranch,
    branchName: data.branchName,

    accessBlocked: Boolean(data.accessBlocked),
    blockedReason: data.blockedReason || null,

    documentType,
    documentNumber,
    documentId,

    status: data.status || "",
    membershipStatus: data.membershipStatus || "",

    paymentPending: true, // default lógica negocio
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

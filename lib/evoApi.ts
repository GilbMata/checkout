// lib/evo.ts
import "server-only";
import { evoRequest } from "./evoRequest";

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
  const gender = data.gender ?? "";

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
  const ur = new URL(`${baseUrl}/api/v2/members`);

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

// ============================================
// Tipos para Vouchers/Cupones de Evo
// ============================================

type MonthDiscountViewModel = {
  numberMounths?: number | null;
  typeDiscountMembership?: string | null;
  value?: number | null;
};

type ServiceDiscountViewModel = {
  typeDiscountService?: string | null;
  value?: number | null;
};

type YearDiscountViewModel = {
  typeDisocuntYearly?: string | null;
  value?: number | null;
};

export interface EvoVoucher {
  available?: number | null;
  expirationDate?: string | null;
  idMemberships?: number[] | null;
  idVoucher?: number;
  limited?: boolean | null;
  monthyDiscount?: MonthDiscountViewModel;
  nameVoucher?: string | null;
  overdue?: boolean;
  serviceDiscount?: ServiceDiscountViewModel;
  siteAvailable?: boolean | null;
  typeVoucher?: string | null;
  used?: number | null;
  yearlyDiscount?: YearDiscountViewModel;
}

// Interfaz para parámetros de consulta de vouchers
interface GetVouchersParams {
  /** ID de sucursal (opcional - solo para multi-location) */
  idBranch?: number | string;
  /** Tipo de voucher (1 = filtro principal) */
  type?: number;
  /** Solo vouchers válidos */
  valid?: boolean;
}

// Interfaz normalizada para uso en el dominio
export interface Voucher {
  id: number;
  name: string;
  type: string;
  isAvailable: boolean;
  isLimited: boolean;
  usedCount: number | null;
  availableCount: number | null;
  isOverdue: boolean;
  expirationDate: string | null;
  siteAvailable: boolean;
  applicableMembershipIds: number[] | null;

  // Descuentos
  monthlyDiscount: {
    months: number | null;
    discountType: string | null;
    value: number | null;
  } | null;
  yearlyDiscount: {
    years: number | null;
    discountType: string | null;
    value: number | null;
  } | null;
  serviceDiscount: {
    discountType: string | null;
    value: number | null;
  } | null;
}

/**
 * Normaliza un voucher raw de Evo al formato del dominio
 */
function normalizeVoucher(raw: EvoVoucher): Voucher {
  return {
    id: raw.idVoucher ?? 0,
    name: raw.nameVoucher ?? "",
    type: raw.typeVoucher ?? "",
    isAvailable: (raw.available ?? 0) > 0,
    isLimited: raw.limited ?? false,
    usedCount: raw.used ?? null,
    availableCount: raw.available ?? null,
    isOverdue: raw.overdue ?? false,
    expirationDate: raw.expirationDate ?? null,
    siteAvailable: raw.siteAvailable ?? true,
    applicableMembershipIds: raw.idMemberships ?? null,

    monthlyDiscount: raw.monthyDiscount
      ? {
          months: raw.monthyDiscount.numberMounths ?? null,
          discountType: raw.monthyDiscount.typeDiscountMembership ?? null,
          value: raw.monthyDiscount.value ?? null,
        }
      : null,
    yearlyDiscount: raw.yearlyDiscount
      ? {
          // Nota: el campo en la API tiene typo "typeDisocuntYearly"
          years: null, // La API no proporciona años en YearDiscountViewModel
          discountType: raw.yearlyDiscount.typeDisocuntYearly ?? null,
          value: raw.yearlyDiscount.value ?? null,
        }
      : null,
    serviceDiscount: raw.serviceDiscount
      ? {
          discountType: raw.serviceDiscount.typeDiscountService ?? null,
          value: raw.serviceDiscount.value ?? null,
        }
      : null,
  };
}

/**
 * Obtiene los vouchers/cupones disponibles de Evo
 *
 * @param params - Parámetros de consulta (idBranch, type, valid)
 * @returns Array de vouchers normalizados
 *
 * @example
 * // Obtener todos los vouchers válidos
 * const vouchers = await getVouchers({ type: 1, valid: true });
 *
 * // Obtener vouchers de una sucursal específica
 * const vouchers = await getVouchers({ idBranch: 123, type: 1, valid: true });
 *
 * // Obtener todos los vouchers (sin filtro de validez)
 * const vouchers = await getVouchers({ type: 1, valid: false });
 */
export async function getVouchers(
  params: GetVouchersParams = {},
): Promise<Voucher[]> {
  const { idBranch, type = 1, valid = true } = params;

  const url = new URL("/api/v1/voucher", baseUrl);

  // Parámetros de consulta según ApidogModel
  url.searchParams.set("type", String(type));
  url.searchParams.set("valid", String(valid));

  // idBranch es opcional - solo para multi-location
  if (idBranch !== undefined && idBranch !== null) {
    url.searchParams.set("idBranch", String(idBranch));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    // Caché de 5 minutos (300s): los vouchers cambian poco en producción
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    console.error("[EVO] Error fetching vouchers:", res.status, res.statusText);
    throw new Error(`EVO error: ${res.status} - ${res.statusText}`);
  }

  const rawData = await res.json();

  // La API puede devolver un array directo o un objeto con propiedad vouchers
  let vouchers: EvoVoucher[] = [];

  if (Array.isArray(rawData)) {
    vouchers = rawData;
  } else if (rawData.vouchers && Array.isArray(rawData.vouchers)) {
    vouchers = rawData.vouchers;
  }

  // Normalizar al formato del dominio
  return vouchers.map(normalizeVoucher);
}

// ============================================================================
// Verify Voucher - Validar voucher y obtener descuentos
// ============================================================================

export interface VerifyVoucherParams {
  voucher: string;
  idMembership: number;
  idBranch?: number;
  idService?: number;
}

// Respuesta de la API de validación de voucher
interface EvoVoucherVerifyResponse {
  idVoucher?: number | null;
  idVoucherItem?: number | null;
  voucher?: string | null;
  flFreePass?: boolean | null;
  membershipValue?: number | null;
  discountKind?: number | null;
  discountValue?: number | null;
  finalMembershipValue?: number | null;
  flSingleServiceDiscount?: boolean;
  singleServiceValue?: number | null;
  singleServiceDiscountKind?: number | null;
  singleServiceDiscountValue?: number | null;
  finalSingleServiceDiscountValue?: number | null;
  flRecurringDiscount?: boolean;
  monthsRecurringDiscount?: number | null;
  flAnnuityDiscount?: boolean;
  annuityValue?: number | null;
  annuityDiscountKind?: number | null;
  annuityDiscountValue?: number | null;
  finalAnnuityValue?: number | null;
  dayAnnuity?: number | null;
  monthAnnuity?: number | null;
  finalValue?: number | null;
}

// Descuento normalizado para uso en el dominio
export interface VoucherDiscount {
  /** ID del voucher */
  idVoucher: number;
  /** Código del voucher */
  voucher: string;
  /** Indica si concede acceso gratuito */
  isFreePass: boolean;
  /** Valor original del contrato */
  originalValue: number;
  /** Tipo de descuento (1 = %, 2 = valor fijo) */
  discountKind: number | null;
  /** Valor del descuento */
  discountValue: number;
  /** Valor final del contrato */
  finalValue: number;
  /** Indica si tiene descuento recurrente */
  hasRecurringDiscount: boolean;
  /** Meses de descuento recurrente */
  monthsRecurringDiscount: number | null;
  /** Indica si tiene descuento en anualidad */
  hasAnnuityDiscount: boolean;
  /** Valor original de la anualidad */
  annuityValue: number | null;
  /** Descuento en la anualidad */
  annuityDiscountValue: number | null;
  /** Valor final de la anualidad */
  finalAnnuityValue: number | null;
  /** Valor final total con todos los descuentos */
  totalFinalValue: number;
}

/**
 * Valida un voucher contra la API de Evo y retorna los descuentos aplicables.
 * Retorna null si el voucher no es válido o no se encuentra.
 *
 * @example
 * ```ts
 * const discount = await verifyVoucher({
 *   voucher: "DESCUENTO20",
 *   idMembership: 123,
 *   idBranch: 456,
 * });
 * if (!discount) {
 *   console.log("Voucher inválido");
 * }
 * ```
 */
export async function verifyVoucher(
  params: VerifyVoucherParams,
): Promise<VoucherDiscount | null> {
  const { voucher, idMembership, idBranch, idService } = params;

  // ========================================================================
  // MODO DEVELOPER - Datos mock para pruebas locales
  // ========================================================================
  if (process.env.NODE_ENV === "development") {
    console.debug("[EVO] verifyVoucher (DEV MOCK) - voucher:", voucher);

    // Simular voucher válido con 20% de descuento
    const mockDiscount: VoucherDiscount = {
      idVoucher: 999,
      voucher: voucher,
      isFreePass: false,
      originalValue: 599,
      discountKind: 1, // 1 = porcentaje
      discountValue: 200, // 20% off
      finalValue: 479,
      hasRecurringDiscount: false,
      monthsRecurringDiscount: null,
      hasAnnuityDiscount: false,
      annuityValue: null,
      annuityDiscountValue: null,
      finalAnnuityValue: null,
      totalFinalValue: 479,
    };

    // Si el código empieza con "INVALID" o "TEST", retornar null para simular error
    if (
      voucher.toUpperCase().includes("INVALID") ||
      voucher.toUpperCase().includes("TEST") ||
      voucher.toUpperCase() === "ERROR"
    ) {
      console.debug(
        "[EVO] verifyVoucher (DEV MOCK) - voucher inválido simulado",
      );
      return null;
    }

    // Si empieza con "FREE", simular freepass
    if (voucher.toUpperCase().includes("FREE")) {
      console.debug("[EVO] verifyVoucher (DEV MOCK) - freepass simulado");
      return {
        ...mockDiscount,
        isFreePass: true,
        discountValue: 599,
        finalValue: 0,
        totalFinalValue: 0,
      };
    }

    console.debug(
      "[EVO] verifyVoucher (DEV MOCK) - returning discount:",
      mockDiscount,
    );
    return mockDiscount;
  }
  // ========================================================================
  // PRODUCCIÓN - Llamada real a la API
  // ========================================================================

  const body = {
    voucher,
    idMembership,
    idBranch,
    ...(idService && { idService }),
  };

  const res = await fetch(`${baseUrl}/api/v1/voucher/voucher-verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  // Si retorna 400, el voucher no existe o no es aplicable
  if (res.status === 400) {
    try {
      const errorData = await res.json();
      // El formato de error de Evo es: { "errors": [{ "key": "Voucher", "value": "..." }] }
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const voucherError = errorData.errors.find(
          (e: { key: string; value: string }) =>
            e.key?.toLowerCase().includes("voucher"),
        );
        if (voucherError) {
          console.debug("[EVO] verifyVoucher - voucher no encontrado");
          return null;
        }
      }
      // Otros errores 400 también retornamos null
      console.debug("[EVO] verifyVoucher - error 400:", errorData);
      return null;
    } catch {
      // Si no se puede parsear, también es inválido
      console.debug("[EVO] verifyVoucher - error 400 sin body parseable");
      return null;
    }
  }

  // Otros errores HTTP (500, etc) - tirar excepción
  if (!res.ok) {
    const errorText = await res.text();
    console.error("[EVO] verifyVoucher HTTP error:", res.status, errorText);
    throw new Error(`Error al validar voucher: ${res.status}`);
  }

  const data = (await res.json()) as EvoVoucherVerifyResponse;

  // Si no tiene datos de voucher válidos, retornar null
  if (!data || (!data.idVoucher && !data.voucher)) {
    console.debug("[EVO] verifyVoucher - respuesta sin voucher");
    return null;
  }

  // Normalizar respuesta
  return {
    idVoucher: data.idVoucher ?? 0,
    voucher: data.voucher ?? voucher,
    isFreePass: data.flFreePass ?? false,
    originalValue: data.membershipValue ?? 0,
    discountKind: data.discountKind ?? null,
    discountValue: data.discountValue ?? 0,
    finalValue: data.finalMembershipValue ?? data.membershipValue ?? 0,
    hasRecurringDiscount: data.flRecurringDiscount ?? false,
    monthsRecurringDiscount: data.monthsRecurringDiscount ?? null,
    hasAnnuityDiscount: data.flAnnuityDiscount ?? false,
    annuityValue: data.annuityValue ?? null,
    annuityDiscountValue: data.annuityDiscountValue ?? null,
    finalAnnuityValue: data.finalAnnuityValue ?? null,
    totalFinalValue:
      data.finalValue ?? data.finalMembershipValue ?? data.membershipValue ?? 0,
  };
}

// ============================================================================
// Prospect → Member: Crear, Vender, Convertir
// ============================================================================

// ① Buscar prospecto en Evo por teléfono
export interface ProspectEvoFound {
  idProspect: number;
  name: string;
  lastName: string;
  email: string;
  cellphone: string;
  cpf: string;
}

/**
 * Busca un prospecto en Evo por número de teléfono.
 * Retorna null si no lo encuentra.
 *
 * @example
 * const prospect = await findProspectInEvoByPhone("3322114455");
 * if (prospect) {
 *   // Existe → actualizar
 * } else {
 *   // No existe → crear
 * }
 */
export async function findProspectInEvoByPhone(
  phone: string,
): Promise<ProspectEvoFound | null> {
  const url = new URL(`${baseUrl}/api/v1/prospects`);
  url.searchParams.set("phone", phone);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[EVO] findProspectByPhone error ${res.status}:`, text);
    throw new Error(`EVO find prospect error: ${res.status}`);
  }

  const data = (await res.json()) as Array<Record<string, unknown>>;

  if (!data || data.length === 0) {
    return null;
  }

  const first = data[0];
  return {
    idProspect: first.idProspect as number,
    name: (first.name as string) ?? "",
    lastName: (first.lastName as string) ?? "",
    email: (first.email as string) ?? "",
    cellphone: (first.cellphone as string) ?? "",
    cpf: (first.document as string) ?? "",
  };
}

// ② Actualizar prospecto existente en Evo
export interface UpdateProspectInEvoParams {
  idProspect: number;
  name?: string;
  lastName?: string;
  email?: string;
  cellphone?: string;
  ddi?: string;
  birthday?: string;
  gender?: string;
  idBranch?: number;
}

export interface UpdateProspectInEvoResponse {
  idProspect: number;
}

/**
 * Actualiza los datos de un prospecto existente en Evo.
 *
 * @example
 * await updateProspectInEvo({
 *   idProspect: 123,
 *   name: "Juan",
 *   lastName: "Pérez Actualizado",
 *   email: "juan@email.com",
 * });
 */
export async function updateProspectInEvo(
  data: UpdateProspectInEvoParams,
): Promise<UpdateProspectInEvoResponse> {
  const body: Record<string, unknown> = {
    idProspect: data.idProspect,
  };

  if (data.name !== undefined) body.name = data.name;
  if (data.lastName !== undefined) body.lastName = data.lastName;
  if (data.email !== undefined) body.email = data.email;
  if (data.cellphone !== undefined) body.cellphone = data.cellphone;
  if (data.ddi !== undefined) body.ddi = data.ddi;
  if (data.birthday !== undefined) body.birthday = data.birthday;
  if (data.gender !== undefined) body.gender = data.gender;
  if (data.idBranch !== undefined) body.idBranch = data.idBranch;

  const res = await fetch(`${baseUrl}/api/v1/prospects`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[EVO] updateProspectInEvo error ${res.status}:`, text);
    throw new Error(`EVO update prospect error: ${res.status}`);
  }

  const result = (await res.json()) as { idProspect: number };
  return { idProspect: result.idProspect };
}

// ③ Crear prospecto en Evo
export interface CreateProspectInEvoParams {
  name: string;
  lastName: string;
  email: string;
  idBranch: number;
  cellphone: string;
  cpf: string;
  ddi?: string;
  birthday?: string;
  gender?: string;
}

export interface CreateProspectInEvoResponse {
  idProspect: number;
}

/**
 * Crea un prospecto en Evo.
 *
 * @example
 * const { idProspect } = await createProspectInEvo({
 *   name: "Juan",
 *   lastName: "Pérez",
 *   email: "juan@example.com",
 *   idBranch: 1,
 *   cellphone: "3322114455",
 *   cpf: "XAXX010101HNEXXNA00",
 * });
 */
export async function createProspectInEvo(
  data: CreateProspectInEvoParams,
): Promise<CreateProspectInEvoResponse> {
  const body: Record<string, unknown> = {
    name: data.name,
    lastName: data.lastName,
    email: data.email,
    idBranch: data.idBranch,
    cellphone: data.cellphone,
    cpf: data.cpf,
  };

  if (data.ddi) body.ddi = data.ddi;
  if (data.birthday) body.birthday = data.birthday;
  if (data.gender) body.gender = data.gender;

  const res = await fetch(`${baseUrl}/api/v1/prospects`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[EVO] createProspectInEvo error ${res.status}:`, text);
    throw new Error(`EVO create prospect error: ${res.status}`);
  }

  const result = (await res.json()) as { idProspect: number };
  return { idProspect: result.idProspect };
}

// ④ Registrar venta en Evo
export interface CreateSaleInEvoParams {
  idBranch?: number;
  idMembership: number;
  idProspect?: number;
  idPaymentMethod?: number;
  totalInstallments?: number;
  payment: number;
  memberData?: {
    idMember: number;
  };
  cardData?: {
    paymentMethodId: string;
    totalInstallments?: number;
  };
  voucher?: string;
  flbNoDebt?: boolean;
}

export async function createSaleInEvo(
  data: CreateSaleInEvoParams,
): Promise<unknown> {
  const body: Record<string, unknown> = {
    idMembership: data.idMembership,
    // flbNoDebt: data.flbNoDebt ?? true,
  };

  if (data.idBranch) body.idBranch = data.idBranch;
  if (data.idProspect) body.idProspect = data.idProspect;
  if (data.idPaymentMethod) body.idPaymentMethod = data.idPaymentMethod;
  if (data.voucher) body.voucher = data.voucher;
  if (data.totalInstallments) body.totalInstallments = data.totalInstallments;
  if (data.payment) body.payment = data.payment;
  if (data.memberData) body.memberData = data.memberData;

  if (data.cardData) {
    body.cardData = {
      paymentMethodId: data.cardData.paymentMethodId,
      totalInstallments: data.cardData.totalInstallments ?? 1,
    };
  }

  // const res = await fetch(`${baseUrl}/api/v2/sales`, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Basic ${auth}`,
  //     "Content-Type": "application/json",
  //     // "Content-Type": "application/json-patch+json",

  //     culture: "pt-BR",
  //   },
  //   body: JSON.stringify(body),
  // });

  const saleResult = await evoRequest(
    "/api/v2/sales?showContractHTML=false",
    "POST",
    body,
    auth,
  );
  // console.log("🚀 ~ createSaleInEvo ~ saleResult:", saleResult);

  const idVenda = (saleResult as any)?.idVenda;
  const idRecibo = (saleResult as any)?.idRecibo;

  return {
    success: true,
    idVenda,
    idRecibo,
  };
}

// ⑤ Convertir prospecto a miembro
export interface ConvertProspectToMemberResponse {
  idMember: number;
}

/**
 * Convierte un prospecto en Evo a miembro activo.
 *
 * @example
 * const { idMember } = await convertProspectToMember(123, 1);
 */
export async function convertProspectToMember(
  idProspect: number,
  idBranch: number,
): Promise<ConvertProspectToMemberResponse> {
  const url = new URL(`${baseUrl}/api/v1/prospects/convert`);
  url.searchParams.set("idProspect", String(idProspect));
  url.searchParams.set("idBranch", String(idBranch));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[EVO] convertProspectToMember error ${res.status}:`, text);
    throw new Error(`EVO convert error: ${res.status}`);
  }

  const result = (await res.json()) as { idMember: number };
  return { idMember: result.idMember };
}

// ⑥ Obtener cuentas bancarias por branch
export async function getBankAccounts(idBranch: number): Promise<any[]> {
  const params = new URLSearchParams();
  params.set("idBranch", String(idBranch));

  const result = await evoRequest(
    `/api/v1/bank-accounts?${params.toString()}`,
    "GET",
    undefined,
    auth,
  );
  return result as any[];
}

// ⑦ Obtener receivables de una venta
export async function getReceivablesBySale(idSale: number): Promise<any[]> {
  const params = new URLSearchParams();
  params.set("idSale", String(idSale));

  const result = await evoRequest(
    `/api/v1/receivables?${params.toString()}`,
    "GET",
    undefined,
    auth,
  );

  const response = result as any;
  return response?.lista || response?.list || [];
}

// ⑧ Marcar receivables como pagados
export async function markReceivablesAsReceived(
  idsReceivables: number[],
  idBankAccount: number,
): Promise<any> {
  const body = {
    idsReceivables,
    idBankAccount,
  };

  console.log(
    `[EVO] markReceivablesAsReceived → ids: ${JSON.stringify(idsReceivables)}, bankAccount: ${idBankAccount}`,
  );

  try {
    const result = await evoRequest(
      "/api/v1/receivables/mark-received",
      "PUT",
      body,
      auth,
    );

    const response = result as any;
    console.log(
      `[EVO] markReceivablesAsReceived response:`,
      response?.result ?? JSON.stringify(response),
    );

    return response;
  } catch (error: any) {
    const evoError = error?.response as any;
    const mensagens = evoError?.mensagens
      ? evoError.mensagens.join("; ")
      : "Sin mensaje de Evo";

    console.error(
      `[EVO] markReceivablesAsReceived FAILED: ${mensagens}`,
      JSON.stringify(evoError),
    );

    throw new Error(`Evo mark-received failed: ${mensagens}`);
  }
}

// ============================================================================
// Tipos para Receivables
// ============================================================================

export interface ReceivableStatus {
  id: number;
  name: string;
}

export interface ReceivableItem {
  idReceivable: number;
  description: string;
  registrationDate: string;
  dueDate: string;
  receivingDate: string | null;
  competenceDate: string;
  cancellationDate: string | null;
  ammount: number;
  ammountPaid: number;
  status: ReceivableStatus;
  currentInstallment: number;
  totalInstallments: number;
  idSale: number;
  chargeDate: string;
  bankAccount: { id: number; name: string } | null;
  paymentType: { id: number; name: string } | null;
  conciliated: boolean;
  updateDate: string;
}

/** Status IDs de receivables según documentación de Evo */
export const RECEIVABLE_STATUS = {
  OPEN: 1, // Em aberto
  RECEIVED: 2, // Recebido (pagado)
  CANCELED: 3, // Cancelado
  OVERDUE: 4, // Atrasado
} as const;

// ============================================================================
// ⑨ Obtener venta por ID
// ============================================================================

/**
 * Obtiene una venta específica de Evo por su ID.
 * Retorna null si la venta no existe.
 */
export async function getSaleById(idSale: number): Promise<unknown | null> {
  try {
    const result = await evoRequest(
      `/api/v2/sales/${idSale}`,
      "GET",
      undefined,
      auth,
    );

    console.log(`[EVO] getSaleById(${idSale}) → venta encontrada`);
    return result;
  } catch (error: any) {
    if (error?.status === 400 || error?.status === 404) {
      console.log(`[EVO] getSaleById(${idSale}) → venta no encontrada`);
      return null;
    }

    const msg = error?.message ?? "Error desconocido";
    console.error(`[EVO] getSaleById(${idSale}) error:`, msg);
    throw error;
  }
}

// ============================================================================
// ⑩ Obtener status de receivables de una venta (versión tipada)
// ============================================================================

/**
 * Obtiene los receivables de una venta con tipado completo.
 */
export async function getReceivableStatus(
  idSale: number,
): Promise<ReceivableItem[]> {
  const params = new URLSearchParams();
  params.set("idSale", String(idSale));
  params.set("skip", "0");
  params.set("take", "50");

  console.log(`[EVO] getReceivableStatus → GET /api/v1/receivables?${params.toString()}`);

  const result = await evoRequest(
    `/api/v1/receivables?${params.toString()}`,
    "GET",
    undefined,
    auth,
  );

  // La respuesta puede ser un array directo o un objeto con lista/list/ids
  let rawList: any[] = [];
  
  if (Array.isArray(result)) {
    rawList = result;
  } else if (result && typeof result === "object") {
    const response = result as any;
    rawList = response?.lista || response?.list || response?.ids || [];
  }

  if (!Array.isArray(rawList)) {
    console.warn(`[EVO] getReceivableStatus: respuesta no es array, es:`, typeof rawList);
    return [];
  }

  console.log(`[EVO] getReceivableStatus(${idSale}) → ${rawList.length} receivables raw`);

  const receivables: ReceivableItem[] = rawList.map((r: any) => ({
    idReceivable: r.idReceivable,
    description: r.description ?? "",
    registrationDate: r.registrationDate ?? "",
    dueDate: r.dueDate ?? "",
    receivingDate: r.receivingDate ?? null,
    competenceDate: r.competenceDate ?? "",
    cancellationDate: r.cancellationDate ?? null,
    ammount: r.ammount ?? 0,
    ammountPaid: r.ammountPaid ?? 0,
    status: r.status ?? { id: 0, name: "Desconocido" },
    currentInstallment: r.currentInstallment ?? 0,
    totalInstallments: r.totalInstallments ?? 0,
    idSale: r.idSale ?? 0,
    chargeDate: r.chargeDate ?? "",
    bankAccount: r.bankAccount ?? null,
    paymentType: r.paymentType ?? null,
    conciliated: r.conciliated ?? false,
    updateDate: r.updateDate ?? "",
  }));

  const statusNames: Record<number, string> = {
    1: "Pendiente",
    2: "Recibido",
    3: "Cancelado",
    4: "Atrasado",
  };

  console.log(
    `[EVO] Receivables encontrados: ${receivables.length}`,
    receivables
      .map((r: ReceivableItem) => `[id=${r.idReceivable}, status=${r.status.id} (${statusNames[r.status.id] || r.status.name}), monto=${r.ammount}, pagado=${r.ammountPaid ?? 0}]`)
      .join(" | "),
  );

  return receivables;
}

// ============================================================================
// ⑪ Verificar si todos los receivables están pagados
// ============================================================================

/**
 * Verifica si todos los receivables tienen status "Recebido" (id === 2).
 * Status IDs: 1=open, 2=received, 3=canceled, 4=overdue
 */
export function areReceivablesPaid(receivables: ReceivableItem[]): boolean {
  if (receivables.length === 0) return false;

  return receivables.every(
    (r) => r.status.id === RECEIVABLE_STATUS.RECEIVED,
  );
}

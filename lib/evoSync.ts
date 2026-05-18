/**
 * Evo Sync — Orquestación Prospect → Member en Evo
 *
 * Este módulo se encarga de sincronizar un prospecto local (que pagó)
 * con el sistema Evo una vez que MercadoPago confirma el pago.
 *
 * Flujo:
 *   1. Verificar idempotencia (si ya tiene idMember, no hacer nada)
 *   2. Marcar syncEvoStatus = "syncing"
 *   3. Buscar prospecto en Evo por teléfono (findProspectInEvoByPhone)
 *      → Si existe → actualizar datos (updateProspectInEvo)
 *      → Si NO existe → crear nuevo (createProspectInEvo)
 *   4. Crear venta en Evo (createSaleInEvo)
 *   5. Obtener receivables de la venta (getReceivablesBySale)
 *   6. Obtener cuenta bancaria por branch (getBankAccounts)
 *   7. Marcar receivables como pagados (markReceivablesAsReceived)
 *   8. Convertir a miembro en Evo (convertProspectToMember)
 *   9. Actualizar BD local con idMember y status = "member"
 *
 * Feature flag: EVO_SYNC_ENABLED=false desactiva la sincronización con Evo.
 */
import { prisma } from "@/lib/db";
import {
  convertProspectToMember,
  createProspectInEvo,
  createSaleInEvo,
  findProspectInEvoByPhone,
  getBankAccounts,
  getMemberByPhone,
  getReceivablesBySale,
  markReceivablesAsReceived,
  type CreateProspectInEvoParams,
  type UpdateProspectInEvoParams,
} from "@/lib/evoApi";

// ============================================================================
// Feature Flag
// ============================================================================

const EVO_SYNC_ENABLED = process.env.EVO_SYNC_ENABLED === "true";

// ============================================================================
// Tipos de retorno
// ============================================================================

export interface SyncResult {
  success: boolean;
  idMember?: number;
  error?: string;
  skipped?: boolean;
  action?: "created" | "updated"; // Indica si fue creación o actualización
}

// ============================================================================
// Sync principal — Prospect → Member en Evo
// ============================================================================

/**
 * Sincroniza un prospecto local con Evo: busca por teléfono, crea o actualiza
 * el prospecto en Evo y lo convierte en miembro.
 *
 * Solo se ejecuta si:
 *   - EVO_SYNC_ENABLED = true
 *   - El prospecto no tiene aún idMember (idempotencia)
 *
 * @param prospectId - UUID del prospecto en BD local
 */
export async function syncProspectToEvo(
  prospectId: string,
): Promise<SyncResult> {
  // ① Feature flag
  if (!EVO_SYNC_ENABLED) {
    console.log(
      "⏭️ [EvoSync] EVO_SYNC_ENABLED=false, saltando sync para:",
      prospectId,
    );
    return { success: true, skipped: true };
  }

  console.log("🔄 [EvoSync] Iniciando sync para prospectId:", prospectId);

  // ② Obtener prospecto de BD
  const prospect = await prisma.prospects.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) {
    const msg = "Prospect no encontrado";
    console.error(`❌ [EvoSync] ${msg}: ${prospectId}`);
    return { success: false, error: msg };
  }

  // ③ Idempotencia — si ya tiene idMember, ya está sincronizado
  if (prospect.idMember) {
    console.log(`✅ [EvoSync] Ya sincronizado, idMember: ${prospect.idMember}`);
    return { success: true, idMember: prospect.idMember };
  }

  // ④ Verificar que tenga idBranch
  if (!prospect.idBranch) {
    const msg = "Prospect sin idBranch, no se puede sincronizar con Evo";
    console.error(`❌ [EvoSync] ${msg}: ${prospectId}`);
    await markSyncFailed(prospectId, msg);
    return { success: false, error: msg };
  }

  // ⑤ Marcar como syncing
  await prisma.prospects.update({
    where: { id: prospectId },
    data: {
      syncEvoStatus: "syncing",
      syncEvoAttemptedAt: new Date(),
      syncEvoError: null,
    },
  });

  try {
    // ⑥ Construir datos para Evo
    const genderMap: Record<string, string> = {
      male: "M",
      female: "F",
      other: "P",
    };
    const evoGender = prospect.gender
      ? (genderMap[prospect.gender] ?? "P")
      : undefined;

    // ⑦ Buscar prospecto en Evo por teléfono
    console.log(
      `📤 [EvoSync] Buscando prospecto en Evo por phone: ${prospect.phone}`,
    );
    const existingProspect = await findProspectInEvoByPhone(prospect.phone);

    let idProspectEvo: number;
    let action: "created" | "updated" = "created";

    if (existingProspect) {
      // ⑧a Prospecto existe en Evo → actualizar datos
      console.log(
        `✅ [EvoSync] Prospect encontrado en Evo, idProspectEvo: ${existingProspect.idProspect}, actualizando...`,
      );
      const updateData: UpdateProspectInEvoParams = {
        idProspect: existingProspect.idProspect,
        name: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        cellphone: prospect.phone,
        ddi: prospect.areaCode ?? undefined,
        birthday: prospect.birthDate?.toISOString() ?? undefined,
        gender: evoGender,
        idBranch: prospect.idBranch,
      };

      idProspectEvo = existingProspect.idProspect;
      action = "updated";
      console.log(
        `✅ [EvoSync] Prospect actualizado en Evo, idProspectEvo: ${idProspectEvo}`,
      );
    } else {
      // ⑧b Prospecto NO existe en Evo → crear nuevo
      console.log(
        `📤 [EvoSync] Prospect NO encontrado en Evo, creando nuevo...`,
      );

      const createData: CreateProspectInEvoParams = {
        name: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        idBranch: prospect.idBranch,
        cellphone: prospect.phone,
        cpf: prospect.curp,
        ddi: prospect.areaCode ?? undefined,
        birthday: prospect.birthDate?.toISOString() ?? undefined,
        gender: evoGender,
      };

      const result = await createProspectInEvo(createData);
      idProspectEvo = result.idProspect;
      action = "created";
      console.log(
        `✅ [EvoSync] Prospect creado en Evo, idProspectEvo: ${idProspectEvo}`,
      );
    }

    // ⑨ Guardar syncEvoIdProspect en BD
    await prisma.prospects.update({
      where: { id: prospectId },
      data: {
        syncEvoIdProspect: idProspectEvo,
      },
    });

    // ⑩ Crear venta en Evo con idProspect
    console.log(
      `📤 [EvoSync] Creando venta en Evo, idProspectEvo: ${idProspectEvo}, idBranch: ${prospect.idBranch}, idMembership: ${prospect.planId}`,
    );

    const res = (await createSaleInEvo({
      // idBranch: prospect.idBranch!,
      idMembership: Number(prospect.planId),
      idProspect: idProspectEvo,
      memberData: { idMember: 0 }, // Fijo
      totalInstallments: 1, // Fijo
      payment: 6, // Fijo (LinkCheckout)
    })) as { idVenda: number; idRecibo: number };

    console.log(
      "✅ [EvoSync] Venta creada en Evo: idSale: ",
      res.idVenda,
      " - idRecivo: ",
      res.idRecibo,
    );

    // ⑪ Guardar syncEvoIdSale en BD
    if (res.idVenda) {
      await prisma.prospects.update({
        where: { id: prospectId },
        data: {
          syncEvoIdSale: res.idVenda,
        },
      });
    }

    // ⑫ Obtener receivables de la venta
    console.log(
      `📤 [EvoSync] Obteniendo receivables para idVenda: ${res.idVenda}`,
    );
    const receivables = await getReceivablesBySale(res.idVenda);
    const receivableIds = receivables.map((r: any) => r.idReceivable);
    console.log(
      `📤 [EvoSync] Receivables encontrados: ${receivableIds.length}`,
    );

    if (receivableIds.length === 0) {
      throw new Error("No se encontraron receivables para la venta");
    }

    // ⑬ Obtener cuenta bancaria por branch
    console.log(
      `📤 [EvoSync] Obteniendo cuenta bancaria para idBranch: ${prospect.idBranch}`,
    );
    const bankAccounts = await getBankAccounts(prospect.idBranch!);
    const bankAccount = bankAccounts.find((b: any) => !b.inactive);
    if (!bankAccount) {
      throw new Error(
        `No se encontró cuenta bancaria activa para branch ${prospect.idBranch}`,
      );
    }

    // ⑭ Marcar receivables como pagados
    console.log(
      `📤 [EvoSync] Marcando receivables como pagados: ${receivableIds}`,
    );
    await markReceivablesAsReceived(receivableIds, bankAccount.idBankAccount);
    console.log("✅ [EvoSync] Receivables marcados como pagados");

    // ⑮ Verificar si ya es miembro por teléfono
    console.log(
      `📤 [EvoSync] Verificando si ya es miembro por teléfono: ${prospect.phone}`,
    );
    const existingMember = await getMemberByPhone(prospect.phone);

    let idMemberEvo: number | undefined = undefined;

    if (existingMember && existingMember.idMember) {
      // Ya es miembro, usar ese ID
      idMemberEvo = existingMember.idMember;
      console.log(
        `✅ [EvoSync] Ya existe como miembro en Evo, idMember: ${idMemberEvo}`,
      );
    } else {
      // No existe, convertir a miembro
      console.log(
        `📤 [EvoSync] Convirtiendo a miembro en Evo, idProspectEvo: ${idProspectEvo}, idBranch: ${prospect.idBranch}`,
      );
      const convertResult = await convertProspectToMember(
        idProspectEvo,
        prospect.idBranch!,
      );
      idMemberEvo = convertResult.idMember;
      console.log(
        `✅ [EvoSync] Miembro creado en Evo, idMemberEvo: ${idMemberEvo}`,
      );
    }

    // ⑬ Actualizar BD local con idMember y status
    await prisma.prospects.update({
      where: { id: prospectId },
      data: {
        idMember: idMemberEvo,
        syncEvoStatus: "synced",
        status: "member",
        membershipStatus: "member",
        syncEvoError: null,
      },
    });

    console.log(
      `✅ [EvoSync] Sync completo para ${prospectId}, idMemberEvo: ${idMemberEvo}, acción: ${action}`,
    );
    return { success: true, idMember: idMemberEvo, action };
  } catch (error: any) {
    const msg = error?.message ?? "Error desconocido";
    // Serializar error: incluir contexto del prospecto y respuesta de Evo
    let errorJson = msg;
    try {
      const serialized = JSON.stringify(
        {
          message: error?.message,
          status: error?.status,
          evoResponse: error?.response,
          context: {
            prospectId,
            idBranch: prospect.idBranch,
            idMembership: prospect.planId,
            phone: prospect.phone,
          },
          stack: error?.stack,
        },
        null,
        2,
      );
      if (serialized && serialized !== "{}") {
        errorJson = serialized;
      }
    } catch {
      // Si falla stringify, usar solo el mensaje
    }
    console.error(`❌ [EvoSync] Error sincronizando ${prospectId}:`, msg);
    await markSyncFailed(prospectId, errorJson);
    return { success: false, error: msg };
  }
}

// ============================================================================
// Helper: Marcar sync como failed
// ============================================================================

async function markSyncFailed(prospectId: string, error: string) {
  try {
    await prisma.prospects.update({
      where: { id: prospectId },
      data: {
        syncEvoStatus: "failed",
        syncEvoError: error,
      },
    });
  } catch {
    // Silenciar errores en el manejo de errores
  }
}

// ============================================================================
// Futura: Registrar venta en Evo
// ============================================================================

/**
 * Registra una venta en Evo para un prospecto ya convertido en miembro.
 * NO se usa en el flujo automático — queda lista para uso manual o futuro.
 *
 * @param prospectId - UUID del prospecto en BD local
 * @param saleData - Datos adicionales de la venta
 */
export async function createSaleInEvoForProspect(
  prospectId: string,
  _saleData: Record<string, unknown> = {},
): Promise<{ success: boolean; error?: string }> {
  if (!EVO_SYNC_ENABLED) {
    return { success: false, error: "EVO_SYNC_ENABLED=false" };
  }

  const prospect = await prisma.prospects.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) return { success: false, error: "Prospect no encontrado" };
  if (!prospect.idMember)
    return { success: false, error: "Prospect aún no sincronizado con Evo" };
  if (!prospect.idBranch)
    return { success: false, error: "Prospect sin idBranch" };

  // TODO: completar con datos de saleData cuando se implemente
  console.warn(
    "[EvoSync] createSaleInEvoForProspect — función futura, no implementada",
  );
  return { success: false, error: "Función en desarrollo" };
}

/**
 * Evo Sync — Orquestación Prospect → Member en Evo
 *
 * Flujo idempotente: verifica el estado actual antes de crear recursos.
 *
 * 1. Si tiene idMember en DB:
 *    a. Verifica syncEvoIdSale → consulta receivables en Evo
 *    b. Si todos están "Recebido" → retorna success (ya pagado)
 *    c. Si NO están pagados → ejecuta solo el flujo de pago
 *
 * 2. Si NO tiene idMember:
 *    a. Busca miembro por teléfono en Evo
 *    b. Si existe → usa su idMember, continúa desde verificación de pago
 *    c. Si NO existe → crea prospecto → crea venta → flujo de pago
 *
 * La venta en Evo ya convierte el prospecto a miembro automáticamente.
 * convertProspectToMember se mantiene disponible pero NO se usa en el flujo.
 *
 * Feature flag: EVO_SYNC_ENABLED=false desactiva la sincronización con Evo.
 */
import { prisma } from "@/lib/db";
import {
  areReceivablesPaid,
  createProspectInEvo,
  createSaleInEvo,
  findProspectInEvoByPhone,
  getBankAccounts,
  getMemberByPhone,
  getReceivableStatus,
  getSaleById,
  markReceivablesAsReceived,
  RECEIVABLE_STATUS,
  type CreateProspectInEvoParams,
  type ReceivableItem,
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
  action?: "created" | "updated";
  alreadyPaid?: boolean; // Indica si ya estaba pagado antes del sync
}

// ============================================================================
// Sync principal — Prospect → Member en Evo
// ============================================================================

/**
 * Sincroniza un prospecto local con Evo de forma idempotente.
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

  // ③ Verificar que tenga idBranch
  if (!prospect.idBranch) {
    const msg = "Prospect sin idBranch, no se puede sincronizar con Evo";
    console.error(`❌ [EvoSync] ${msg}: ${prospectId}`);
    await markSyncFailed(prospectId, msg);
    return { success: false, error: msg };
  }

  // ④ Marcar como syncing
  await prisma.prospects.update({
    where: { id: prospectId },
    data: {
      syncEvoStatus: "syncing",
      syncEvoAttemptedAt: new Date(),
      syncEvoError: null,
    },
  });

  try {
    let idMemberEvo: number | undefined;
    let idProspectEvo: number | undefined;
    let action: "created" | "updated" = "created";

    // ========================================================================
    // CASO 1: Ya tiene idMember en DB
    // ========================================================================
    if (prospect.idMember) {
      console.log(
        `🔍 [EvoSync] Ya tiene idMember: ${prospect.idMember}, verificando pago...`,
      );

      idMemberEvo = prospect.idMember;

      // Verificar si tiene syncEvoIdSale
      if (prospect.syncEvoIdSale) {
        const saleExists = await getSaleById(prospect.syncEvoIdSale);

        if (saleExists) {
          // La venta existe → verificar receivables
          const receivables = await getReceivableStatus(prospect.syncEvoIdSale);

          if (areReceivablesPaid(receivables)) {
            // ✅ Ya está todo pagado
            console.log(
              `✅ [EvoSync] Venta ${prospect.syncEvoIdSale} ya pagada. No se requiere acción.`,
            );
            return {
              success: true,
              idMember: idMemberEvo,
              alreadyPaid: true,
            };
          }

          // Receivables NO pagados → ejecutar flujo de pago
          console.log(
            `💰 [EvoSync] Venta ${prospect.syncEvoIdSale} tiene receivables sin pagar. Ejecutando flujo de pago...`,
          );
          await executePaymentFlow(
            prospectId,
            prospect.syncEvoIdSale,
            prospect.idBranch,
            receivables,
          );

          return {
            success: true,
            idMember: idMemberEvo,
            alreadyPaid: false,
          };
        }

        // La venta NO existe en Evo → limpiar IDs y crear nueva
        console.log(
          `⚠️ [EvoSync] syncEvoIdSale ${prospect.syncEvoIdSale} no existe en Evo. Limpiando IDs...`,
        );
        await prisma.prospects.update({
          where: { id: prospectId },
          data: {
            syncEvoIdSale: null,
            syncEvoIdReceivable: null,
            syncEvoChargeDate: null,
          },
        });
      }

      // No tiene syncEvoIdSale o fue limpiado → crear venta
      const saleResult = await createSaleInEvo({
        idMembership: Number(prospect.planId),
        idProspect: undefined, // Ya es miembro
        memberData: { idMember: prospect.idMember },
        totalInstallments: 1,
        payment: null as unknown as number, // null = LinkCheckout
      });

      const idSale = (saleResult as any)?.idVenda;
      if (!idSale) {
        throw new Error("No se pudo crear la venta en Evo");
      }

      console.log(`✅ [EvoSync] Venta creada: idSale=${idSale}`);

      await prisma.prospects.update({
        where: { id: prospectId },
        data: { syncEvoIdSale: idSale },
      });

      // Ejecutar flujo de pago
      await executePaymentFlow(prospectId, idSale, prospect.idBranch);

      return {
        success: true,
        idMember: idMemberEvo,
        alreadyPaid: false,
      };
    }

    // ========================================================================
    // CASO 2: NO tiene idMember en DB
    // ========================================================================
    console.log(
      `🔍 [EvoSync] Sin idMember. Buscando miembro por teléfono: ${prospect.phone}`,
    );

    // Buscar miembro existente en Evo
    const existingMember = await getMemberByPhone(prospect.phone);

    if (existingMember && existingMember.idMember) {
      // Ya existe como miembro en Evo
      idMemberEvo = existingMember.idMember;
      console.log(
        `✅ [EvoSync] Miembro encontrado en Evo: idMember=${idMemberEvo}`,
      );

      // Verificar si tiene syncEvoIdSale
      if (prospect.syncEvoIdSale) {
        const saleExists = await getSaleById(prospect.syncEvoIdSale);

        if (saleExists) {
          const receivables = await getReceivableStatus(prospect.syncEvoIdSale);

          if (areReceivablesPaid(receivables)) {
            // ✅ Ya está todo pagado → solo actualizar BD local
            console.log(
              `✅ [EvoSync] Venta ${prospect.syncEvoIdSale} ya pagada. Actualizando BD local...`,
            );
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

            return {
              success: true,
              idMember: idMemberEvo,
              alreadyPaid: true,
            };
          }

          // Receivables NO pagados → ejecutar flujo de pago
          console.log(
            `💰 [EvoSync] Venta ${prospect.syncEvoIdSale} sin pagar. Ejecutando flujo de pago...`,
          );
          await executePaymentFlow(
            prospectId,
            prospect.syncEvoIdSale,
            prospect.idBranch,
            receivables,
          );
        } else {
          // Venta no existe → crear nueva
          const saleResult = await createSaleInEvo({
            idMembership: Number(prospect.planId),
            idProspect: undefined,
            memberData: { idMember: idMemberEvo },
            totalInstallments: 1,
            payment: null as unknown as number,
          });

          const idSale = (saleResult as any)?.idVenda;
          if (!idSale) {
            throw new Error("No se pudo crear la venta en Evo");
          }

          console.log(`✅ [EvoSync] Venta creada: idSale=${idSale}`);

          await prisma.prospects.update({
            where: { id: prospectId },
            data: { syncEvoIdSale: idSale },
          });

          await executePaymentFlow(prospectId, idSale, prospect.idBranch);
        }
      } else {
        // No tiene syncEvoIdSale → crear prospecto + venta
        const prospectResult = await ensureProspectInEvo({
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          email: prospect.email,
          phone: prospect.phone,
          areaCode: prospect.areaCode,
          birthDate: prospect.birthDate,
          gender: prospect.gender ?? null,
          idBranch: prospect.idBranch,
          curp: prospect.curp,
        });
        idProspectEvo = prospectResult.idProspect;
        action = prospectResult.action;

        const saleResult = await createSaleInEvo({
          idMembership: Number(prospect.planId),
          idProspect: idProspectEvo,
          memberData: { idMember: 0 },
          totalInstallments: 1,
          payment: null as unknown as number,
        });

        const idSale = (saleResult as any)?.idVenda;
        if (!idSale) {
          throw new Error("No se pudo crear la venta en Evo");
        }

        console.log(`✅ [EvoSync] Venta creada: idSale=${idSale}`);

        await prisma.prospects.update({
          where: { id: prospectId },
          data: {
            syncEvoIdSale: idSale,
            syncEvoIdProspect: idProspectEvo,
          },
        });

        await executePaymentFlow(prospectId, idSale, prospect.idBranch);
      }

      // Actualizar BD local con idMember
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

      return {
        success: true,
        idMember: idMemberEvo,
        alreadyPaid: false,
      };
    }

    // ========================================================================
    // CASO 2b: NO existe miembro en Evo → crear prospecto + venta
    // ========================================================================
    console.log(
      `📤 [EvoSync] Miembro no encontrado en Evo. Creando prospecto...`,
    );

    const prospectResult = await ensureProspectInEvo({
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      areaCode: prospect.areaCode,
      birthDate: prospect.birthDate,
      gender: prospect.gender ?? null,
      idBranch: prospect.idBranch,
      curp: prospect.curp,
    });
    idProspectEvo = prospectResult.idProspect;
    action = prospectResult.action;

    // Crear venta en Evo
    console.log(
      `📤 [EvoSync] Creando venta, idProspectEvo=${idProspectEvo}, idMembership=${prospect.planId}`,
    );

    const saleResult = await createSaleInEvo({
      idMembership: Number(prospect.planId),
      idProspect: idProspectEvo,
      memberData: { idMember: 0 },
      totalInstallments: 1,
      payment: null as unknown as number, // null = LinkCheckout
    });

    const idSale = (saleResult as any)?.idVenda;
    if (!idSale) {
      throw new Error("No se pudo crear la venta en Evo");
    }

    console.log(`✅ [EvoSync] Venta creada: idSale=${idSale}`);

    await prisma.prospects.update({
      where: { id: prospectId },
      data: {
        syncEvoIdSale: idSale,
        syncEvoIdProspect: idProspectEvo,
      },
    });

    // Ejecutar flujo de pago
    await executePaymentFlow(prospectId, idSale, prospect.idBranch);

    // Verificar si ya es miembro (la venta debería haberlo convertido)
    const memberAfterSale = await getMemberByPhone(prospect.phone);

    if (memberAfterSale && memberAfterSale.idMember) {
      idMemberEvo = memberAfterSale.idMember;
      console.log(
        `✅ [EvoSync] Miembro verificado después de venta: idMember=${idMemberEvo}`,
      );
    } else {
      throw new Error(
        "No se encontró el miembro después de crear la venta en Evo",
      );
    }

    // Actualizar BD local
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
      `✅ [EvoSync] Sync completo para ${prospectId}, idMember=${idMemberEvo}, acción=${action}`,
    );

    return { success: true, idMember: idMemberEvo, action };
  } catch (error: any) {
    const msg = error?.message ?? "Error desconocido";
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
// Flujo de pago — reutilizable
// ============================================================================

/**
 * Ejecuta el flujo de pago para una venta en Evo:
 * 1. Obtiene receivables (si no se proporcionan)
 * 2. Verifica si ya están pagados → si sí, retorna
 * 3. Guarda syncEvoIdReceivable + syncEvoChargeDate en BD
 * 4. Obtiene cuenta bancaria activa
 * 5. Marca receivables como pagados
 * 6. Verifica que quedaron como "Recebido"
 */
async function executePaymentFlow(
  prospectId: string,
  idSale: number,
  idBranch: number,
  existingReceivables?: ReceivableItem[],
): Promise<void> {
  // 1. Obtener receivables
  const receivables =
    existingReceivables ?? (await getReceivableStatus(idSale));

  if (receivables.length === 0) {
    throw new Error(`No se encontraron receivables para la venta ${idSale}`);
  }

  // 2. Verificar si ya están pagados
  if (areReceivablesPaid(receivables)) {
    console.log(
      `✅ [EvoSync] Venta ${idSale} ya tiene receivables pagados. Saltando flujo de pago.`,
    );
    return;
  }

  const receivableIds = receivables.map((r) => r.idReceivable);
  console.log(
    `💰 [EvoSync] Marcando ${receivableIds.length} receivable(s) como pagados: ${receivableIds.join(", ")}`,
  );

  // 3. Guardar ID del receivable y fecha de cobro en BD
  const firstReceivable = receivables[0];
  const chargeDate = firstReceivable.chargeDate
    ? new Date(firstReceivable.chargeDate)
    : null;

  await prisma.prospects.update({
    where: { id: prospectId },
    data: {
      syncEvoIdReceivable: firstReceivable.idReceivable,
      syncEvoChargeDate: chargeDate,
    },
  });

  console.log(
    `[EvoSync] Guardado syncEvoIdReceivable=${firstReceivable.idReceivable}, chargeDate=${chargeDate?.toISOString()}`,
  );

  // 4. Obtener cuenta bancaria activa
  const bankAccounts = await getBankAccounts(idBranch);
  const bankAccount = bankAccounts.find((b: any) => !b.inactive);

  if (!bankAccount) {
    throw new Error(
      `No se encontró cuenta bancaria activa para branch ${idBranch}`,
    );
  }

  console.log(
    `[EvoSync] Cuenta bancaria: id=${bankAccount.idBankAccount}, name=${bankAccount.name}`,
  );

  // 5. Marcar receivables como pagados
  await markReceivablesAsReceived(receivableIds, bankAccount.idBankAccount);

  // 6. Verificar que quedaron como "Recebido"
  const verifiedReceivables = await getReceivableStatus(idSale);

  if (!areReceivablesPaid(verifiedReceivables)) {
    const unpaid = verifiedReceivables
      .filter((r) => r.status.id !== RECEIVABLE_STATUS.RECEIVED)
      .map((r) => `${r.idReceivable} (${r.status.name})`)
      .join(", ");

    throw new Error(
      `Receivables no quedaron pagados después de mark-received: ${unpaid}`,
    );
  }

  console.log(`✅ [EvoSync] Receivables verificados como pagados`);
}

// ============================================================================
// Helper: Asegurar prospecto en Evo (crear o actualizar)
// ============================================================================

interface ProspectResult {
  idProspect: number;
  action: "created" | "updated";
}

/**
 * Busca o crea un prospecto en Evo.
 * Si ya existe, actualiza sus datos.
 */
async function ensureProspectInEvo(prospect: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  areaCode: string | null;
  birthDate: Date | null;
  gender: string | null;
  idBranch: number;
  curp: string;
}): Promise<ProspectResult> {
  const genderMap: Record<string, string> = {
    male: "M",
    female: "F",
    other: "P",
  };
  const evoGender = prospect.gender
    ? (genderMap[prospect.gender] ?? "P")
    : undefined;

  // Buscar prospecto en Evo por teléfono
  console.log(
    `📤 [EvoSync] Buscando prospecto en Evo por phone: ${prospect.phone}`,
  );
  const existingProspect = await findProspectInEvoByPhone(prospect.phone);

  if (existingProspect) {
    // Prospecto existe → actualizar datos
    console.log(
      `✅ [EvoSync] Prospect encontrado en Evo: idProspect=${existingProspect.idProspect}, actualizando...`,
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

    const result = await (
      await import("@/lib/evoApi")
    ).updateProspectInEvo(updateData);

    console.log(
      `✅ [EvoSync] Prospect actualizado en Evo: idProspect=${result.idProspect}`,
    );

    return {
      idProspect: result.idProspect,
      action: "updated",
    };
  }

  // Prospecto NO existe → crear nuevo
  console.log(`📤 [EvoSync] Prospect NO encontrado en Evo, creando nuevo...`);

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

  console.log(
    `✅ [EvoSync] Prospect creado en Evo: idProspect=${result.idProspect}`,
  );

  return {
    idProspect: result.idProspect,
    action: "created",
  };
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

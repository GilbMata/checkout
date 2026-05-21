/**
 * Evo Sync — Orquestación Prospect → Member en Evo (Flow basado en Carts)
 *
 * Flujo idempotente: verifica el estado actual antes de crear recursos.
 *
 * 1. Si tiene idMember en DB:
 *    a. Buscar miembro por idMember, si no encuentra buscar por phone
 *    b. Si existe → verificar si tiene cart
 *       - Si tiene cart → guardar en DB → devolver checkoutLink
 *       - Si NO tiene cart → crear cart → guardar en DB → devolver checkoutLink
 *    c. Si NO existe → crear prospecto → convertir a member → crear cart → devolver checkoutLink
 *
 * 2. Si NO tiene idMember:
 *    a. Buscar miembro por phone en Evo
 *    b. Si existe → actualizar DB con idMember → mismo flujo de cart
 *    c. Si NO existe → crear prospecto → convertir a member → crear cart → devolver checkoutLink
 *
 * Feature flag: EVO_SYNC_ENABLED=false desactiva la sincronización con Evo.
 */
import { prisma } from "@/lib/db";
import {
  convertProspectToMember,
  createCart,
  createProspectInEvo,
  findProspectInEvoByPhone,
  getCartByMember,
  getMemberById,
  getMemberByPhone,
  type CreateCartParams,
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
  idCartToken?: string;
  cartCheckoutLink?: string;
  error?: string;
  skipped?: boolean;
  action?: "created" | "updated";
}

// ============================================================================
// Sync principal — Prospect → Member en Evo (Flow Cart)
// ============================================================================

/**
 * Sincroniza un prospecto local con Evo de forma idempotente.
 * Retorna: { success, idMember, idCartToken, cartCheckoutLink }
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

  console.log(
    "🔄 [EvoSync] Iniciando sync (flow Cart) para prospectId:",
    prospectId,
  );

  // ② Obtener prospecto de BD
  const prospect = await prisma.prospects.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) {
    const msg = "Prospect no encontrado";
    console.error(`❌ [EvoSync] ${msg}: ${prospectId}`);
    return { success: false, error: msg };
  }

  // ③ Verificar que tenga idBranch y planId
  if (!prospect.idBranch) {
    const msg = "Prospect sin idBranch, no se puede sincronizar con Evo";
    console.error(`❌ [EvoSync] ${msg}: ${prospectId}`);
    await markSyncFailed(prospectId, msg);
    return { success: false, error: msg };
  }

  if (!prospect.planId) {
    const msg = "Prospect sin planId, no se puede crear cart";
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
    let cartToken: string | undefined;
    let checkoutLink: string | undefined;

    // ========================================================================
    // CASO 1: Ya tiene idMember en DB
    // ========================================================================
    if (prospect.idMember) {
      console.log(`🔍 [EvoSync] Ya tiene idMember: ${prospect.idMember} en DB`);

      // 1a. Buscar miembro por idMember
      let member = await getMemberById(prospect.idMember);

      // 1b. Si no encuentra, buscar por phone
      if (!member) {
        console.log(
          `🔍 [EvoSync] idMember ${prospect.idMember} no encontrado, buscando por phone...`,
        );
        member = await getMemberByPhone(prospect.phone);
      }

      // 1c. ¿Existe el miembro?
      if (member && member.idMember) {
        idMemberEvo = member.idMember;
        console.log(
          `✅ [EvoSync] Miembro encontrado en Evo: idMember=${idMemberEvo}`,
        );

        // 2. Verificar si tiene cart
        const existingCart = await getCartByMember(idMemberEvo);
        console.log("🚀 ~ syncProspectToEvo ~ existingCart:", existingCart);

        if (existingCart && existingCart.idCartToken) {
          // Ya tiene cart → guardar en DB y devolver
          console.log(
            `✅ [EvoSync] Miembro ya tiene cart: idCartToken=${existingCart.idCartToken}`,
          );
          cartToken = existingCart.idCartToken;
          checkoutLink = existingCart.checkoutLink;

          await prisma.prospects.update({
            where: { id: prospectId },
            data: {
              syncEvoIdCartToken: cartToken,
              syncEvoCartCheckoutLink: checkoutLink,
              syncEvoStatus: "synced",
              syncEvoError: null,
            },
          });

          return {
            success: true,
            idMember: idMemberEvo,
            idCartToken: cartToken,
            cartCheckoutLink: checkoutLink,
          };
        }

        // NO tiene cart → crear uno nuevo
        console.log(`🛒 [EvoSync] Miembro NO tiene cart, creando nuevo...`);
        const cartParams: CreateCartParams = {
          idMember: idMemberEvo,
          idMembership: Number(prospect.planId),
          idBranch: prospect.idBranch,
        };

        const newCart = await createCart(cartParams);
        cartToken = newCart.idCartToken;
        checkoutLink = newCart.checkoutLink;

        console.log(
          `✅ [EvoSync] Cart creado: idCartToken=${cartToken}, checkoutLink=${checkoutLink}`,
        );

        // Guardar en DB
        await prisma.prospects.update({
          where: { id: prospectId },
          data: {
            syncEvoIdCartToken: cartToken,
            syncEvoCartCheckoutLink: checkoutLink,
            syncEvoStatus: "synced",
            syncEvoError: null,
          },
        });

        return {
          success: true,
          idMember: idMemberEvo,
          idCartToken: cartToken,
          cartCheckoutLink: checkoutLink,
        };
      }

      // El miembro NO existe en Evo → crear prospecto → convertir → crear cart
      console.log(
        `⚠️ [EvoSync] idMember ${prospect.idMember} no existe en Evo. Creando prospecto...`,
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
      action = "created";

      // Convertir prospecto a miembro
      console.log(
        `🔄 [EvoSync] Convirtiendo prospecto ${idProspectEvo} a miembro...`,
      );
      console.log("🚀 ~ syncProspectToEvo ~ idProspectEvo:", idProspectEvo);

      const convertResult = await convertProspectToMember(
        idProspectEvo,
        prospect.idBranch,
      );
      idMemberEvo = convertResult.idMember;

      console.log(
        `✅ [EvoSync] Prospecto convertido a miembro: idMember=${idMemberEvo}`,
      );

      // Crear cart para el nuevo miembro
      console.log(`🛒 [EvoSync] Creando cart para nuevo miembro...`);
      const cartParams: CreateCartParams = {
        idMember: idMemberEvo,
        idMembership: Number(prospect.planId),
        idBranch: prospect.idBranch,
      };

      const newCart = await createCart(cartParams);
      cartToken = newCart.idCartToken;
      checkoutLink = newCart.checkoutLink;

      console.log(
        `✅ [EvoSync] Cart creado: idCartToken=${cartToken}, checkoutLink=${checkoutLink}`,
      );

      // Guardar en DB
      await prisma.prospects.update({
        where: { id: prospectId },
        data: {
          idMember: idMemberEvo,
          syncEvoIdProspect: idProspectEvo,
          syncEvoIdCartToken: cartToken,
          syncEvoCartCheckoutLink: checkoutLink,
          syncEvoStatus: "synced",
          status: "member",
          membershipStatus: "member",
          syncEvoError: null,
        },
      });

      return {
        success: true,
        idMember: idMemberEvo,
        idCartToken: cartToken,
        cartCheckoutLink: checkoutLink,
        action,
      };
    }

    // ========================================================================
    // CASO 2: NO tiene idMember en DB
    // ========================================================================
    console.log(
      `🔍 [EvoSync] Sin idMember. Buscando miembro por teléfono: ${prospect.phone}`,
    );

    // Buscar miembro existente en Evo por teléfono
    const existingMember = await getMemberByPhone(prospect.phone);

    if (existingMember && existingMember.idMember) {
      // Ya existe como miembro en Evo
      idMemberEvo = existingMember.idMember;
      console.log(
        `✅ [EvoSync] Miembro encontrado en Evo: idMember=${idMemberEvo}`,
      );

      // Actualizar BD con idMember
      await prisma.prospects.update({
        where: { id: prospectId },
        data: { idMember: idMemberEvo },
      });

      // Verificar si tiene cart
      const existingCart = await getCartByMember(idMemberEvo);

      if (existingCart && existingCart.idCartToken) {
        // Ya tiene cart
        console.log(
          `✅ [EvoSync] Miembro ya tiene cart: idCartToken=${existingCart.idCartToken}`,
        );
        cartToken = existingCart.idCartToken;
        checkoutLink = existingCart.checkoutLink;

        await prisma.prospects.update({
          where: { id: prospectId },
          data: {
            syncEvoIdCartToken: cartToken,
            syncEvoCartCheckoutLink: checkoutLink,
            syncEvoStatus: "synced",
            syncEvoError: null,
          },
        });

        return {
          success: true,
          idMember: idMemberEvo,
          idCartToken: cartToken,
          cartCheckoutLink: checkoutLink,
        };
      }

      // NO tiene cart → crear uno
      console.log(`🛒 [EvoSync] Miembro NO tiene cart, creando nuevo...`);
      const cartParams: CreateCartParams = {
        idMember: idMemberEvo,
        idMembership: Number(prospect.planId),
        idBranch: prospect.idBranch,
      };

      const newCart = await createCart(cartParams);
      cartToken = newCart.idCartToken;
      checkoutLink = newCart.checkoutLink;

      console.log(
        `✅ [EvoSync] Cart creado: idCartToken=${cartToken}, checkoutLink=${checkoutLink}`,
      );

      // Guardar en DB
      await prisma.prospects.update({
        where: { id: prospectId },
        data: {
          syncEvoIdCartToken: cartToken,
          syncEvoCartCheckoutLink: checkoutLink,
          syncEvoStatus: "synced",
          status: "member",
          membershipStatus: "member",
          syncEvoError: null,
        },
      });

      return {
        success: true,
        idMember: idMemberEvo,
        idCartToken: cartToken,
        cartCheckoutLink: checkoutLink,
      };
    }

    // ========================================================================
    // CASO 2b: NO existe miembro en Evo → crear prospecto → convertir → crear cart
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
    console.log("🚀 ~ syncProspectToEvo ~ prospectResult:", prospectResult);
    idProspectEvo = prospectResult.idProspect;
    action = prospectResult.action;

    // Convertir prospecto a miembro
    console.log(
      `🔄 [EvoSync] Convirtiendo prospecto ${idProspectEvo} a miembro...`,
    );
    const convertResult = await convertProspectToMember(
      idProspectEvo,
      prospect.idBranch,
    );
    idMemberEvo = convertResult.idMember;

    console.log(
      `✅ [EvoSync] Prospecto convertido a miembro: idMember=${idMemberEvo}`,
    );

    // Crear cart para el nuevo miembro
    console.log(`🛒 [EvoSync] Creando cart para nuevo miembro...`);
    const cartParams: CreateCartParams = {
      idMember: idMemberEvo,
      idMembership: Number(prospect.planId),
      idBranch: prospect.idBranch,
    };

    const newCart = await createCart(cartParams);
    cartToken = newCart.idCartToken;
    checkoutLink = newCart.checkoutLink;

    console.log(
      `✅ [EvoSync] Cart creado: idCartToken=${cartToken}, checkoutLink=${checkoutLink}`,
    );

    // Guardar todo en DB
    await prisma.prospects.update({
      where: { id: prospectId },
      data: {
        idMember: idMemberEvo,
        syncEvoIdProspect: idProspectEvo,
        syncEvoIdCartToken: cartToken,
        syncEvoCartCheckoutLink: checkoutLink,
        syncEvoStatus: "synced",
        status: "member",
        membershipStatus: "member",
        syncEvoError: null,
      },
    });

    console.log(
      `✅ [EvoSync] Sync completo para ${prospectId}, idMember=${idMemberEvo}, acción=${action}`,
    );

    return {
      success: true,
      idMember: idMemberEvo,
      idCartToken: cartToken,
      cartCheckoutLink: checkoutLink,
      action,
    };
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
    console.error(`❌ [EvoSync] Error sincronizando ${prospectId}:`, error);
    await markSyncFailed(prospectId, errorJson);
    return { success: false, error: msg };
  }
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

    const { updateProspectInEvo } = await import("@/lib/evoApi");
    const result = await updateProspectInEvo({
      idProspect: existingProspect.idProspect,
      name: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      cellphone: prospect.phone,
      ddi: prospect.areaCode ?? undefined,
      birthday: prospect.birthDate?.toISOString() ?? undefined,
      gender: evoGender,
      idBranch: prospect.idBranch,
    });

    console.log(
      `✅ [EvoSync] Prospect actualizado en Evo: idProspect=${existingProspect.idProspect}`,
    );

    return {
      idProspect: existingProspect.idProspect,
      action: "updated",
    };
  }

  // Prospecto NO existe → crear nuevo
  console.log(`📤 [EvoSync] Prospect NO encontrado en Evo, creando nuevo...`);

  const result = await createProspectInEvo({
    name: prospect.firstName,
    lastName: prospect.lastName,
    email: prospect.email,
    idBranch: prospect.idBranch,
    cellphone: prospect.phone,
    cpf: prospect.curp,
    ddi: prospect.areaCode ?? undefined,
    birthday: prospect.birthDate?.toISOString() ?? undefined,
    gender: evoGender,
  });

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

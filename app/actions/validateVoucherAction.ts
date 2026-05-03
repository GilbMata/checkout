"use server";

import { verifyVoucher, type VoucherDiscount } from "@/lib/evoApi";

interface ValidateVoucherParams {
  voucher: string;
  idMembership: number;
  idBranch: number;
  idService?: number;
}

interface ValidateVoucherResult {
  success: boolean;
  discount: VoucherDiscount | null;
  error?: string;
}

/**
 * Server action para validar un código de voucher.
 * Llama a la API de Evo para verificar el voucher.
 *
 * @example
 * ```ts
 * const result = await validateVoucherAction({
 *   voucher: "DESCUENTO20",
 *   idMembership: 123,
 *   idBranch: 456,
 * });
 * ```
 */
export async function validateVoucherAction(
  params: ValidateVoucherParams,
): Promise<ValidateVoucherResult> {
  const { voucher, idMembership, idBranch, idService } = params;

  // Validar parámetros requeridos
  if (!voucher || voucher.trim().length === 0) {
    return {
      success: false,
      discount: null,
      error: "Código de voucher requerido",
    };
  }

  if (!idMembership || !idBranch) {
    return {
      success: false,
      discount: null,
      error: "ID de membresía y sucursal requeridos",
    };
  }

  try {
    const discount = await verifyVoucher({
      voucher: voucher.trim().toUpperCase(),
      idMembership,
      idBranch,
      ...(idService && { idService }),
    });

    // Si verifyVoucher retornó null, el voucher no existe o no es aplicable
    if (!discount) {
      return {
        success: false,
        discount: null,
        error: "Voucher inválido o no aplicable a este plan",
      };
    }

    // Verificar que el voucher tenga descuento aplicable (el valor final debe ser menor)
    if (discount.totalFinalValue >= discount.originalValue) {
      return {
        success: false,
        discount: null,
        error: "Voucher sin descuento aplicable",
      };
    }

    return {
      success: true,
      discount,
    };
  } catch (error) {
    console.error("[validateVoucherAction] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Error al validar voucher";

    return {
      success: false,
      discount: null,
      error: errorMessage,
    };
  }
}

"use client";

import { validateVoucherAction } from "@/app/actions/validateVoucherAction";
import { cn } from "@/lib/utils";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { motion } from "framer-motion";
import { Check, Loader2, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface VoucherInputProps {
  /** Clase adicional para el contenedor */
  className?: string;
}

/**
 * Componente de input para código de voucher.
 * Valida el código contra la API de Evo y guarda el descuento en el store.
 *
 * @example
 * ```tsx
 * <VoucherInput className="mt-4" />
 * ```
 */
export default function VoucherInput({ className }: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const {
    voucherCode,
    voucherDiscount,
    setVoucherCode,
    setVoucherDiscount,
    clearVoucher,
    plan,
  } = useCheckoutStore();

  // Si ya hay un voucher aplicado, mostrar estado "aplicado"
  const showApplied = isApplied || !!voucherDiscount;

  const handleValidate = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      toast.error("Ingresa un código de voucher");
      return;
    }

    if (!plan?.idMembership) {
      toast.error("Selecciona un plan primero");
      return;
    }

    setIsValidating(true);

    try {
      const result = await validateVoucherAction({
        voucher: trimmedCode,
        idMembership: plan.idMembership,
        idBranch: plan.idBranch,
      });

      if (result.success && result.discount) {
        setVoucherCode(trimmedCode);
        setVoucherDiscount(result.discount);

        // Mostrar mensaje de éxito
        const { discountValue, totalFinalValue, originalValue } =
          result.discount;
        const savings = originalValue - totalFinalValue;
        const savingsText =
          savings > 0 ? ` - Ahorras $${savings.toFixed(2)}` : "";

        toast.success(`Voucher aplicado${savingsText}`);
        setIsApplied(true);
      } else {
        toast.error(result.error || "Voucher inválido o no aplicable");
        clearVoucher();
        setIsApplied(false);
      }
    } catch (err) {
      console.error("Voucher validation error:", err);
      toast.error("Error al validar voucher");
      clearVoucher();
      setIsApplied(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setCode("");
    clearVoucher();
    setIsApplied(false);
    toast.info("Voucher eliminado");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isValidating && !showApplied) {
        handleValidate();
      }
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
        <Tag className="w-4 h-4" />
        ¿Tienes código de cupon?
      </label>

      {showApplied && voucherDiscount ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">
                {voucherDiscount.voucher}
              </p>
              <p className="text-xs text-gray-400">
                Descuento: ${voucherDiscount.discountValue.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Eliminar voucher"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Código de voucher"
              disabled={isValidating}
              className={cn(
                "w-full h-12 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3",
                "text-white placeholder:text-gray-500",
                "focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors",
              )}
            />
            {isValidating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || !code.trim() || showApplied}
            className={cn(
              "h-12 px-4 rounded-lg font-medium transition-colors",
              "bg-orange-500 hover:bg-orange-600 text-white font-semibold",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900",
            )}
          >
            {isValidating ? "Validando..." : "Aplicar"}
          </button>
        </div>
      )}

      {showApplied && voucherDiscount && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-400"
        >
          Precio final: ${voucherDiscount.totalFinalValue.toFixed(2)} (antes $
          {voucherDiscount.originalValue.toFixed(2)})
        </motion.p>
      )}
    </div>
  );
}

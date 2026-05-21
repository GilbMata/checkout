"use client";

import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { getProspectByCurpAction, updateProspectCurpAction } from "@/app/actions/prospects";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { normalizeCURP, validateCURP, validateCURPStructrual } from "@/lib/curp2";
import { useCheckoutStore } from "@/store/useCheckoutStore";

const CURP_LENGTH = 18;
const CURP_DEBOUNCE_MS = 500;

export default function StepCurp() {
  const { setStep, prospect, setProspect } = useCheckoutStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      curp: "",
    },
  });

  const { watch, setValue } = form;
  const curpValue = watch("curp");

  // Validación de CURP con debounce (mismo patrón que FullFormFields)
  const handleCURPValidate = useCallback(
    async (curp: string) => {
      const normalized = normalizeCURP(curp);

      // Validar estructura
      if (!validateCURPStructrual(normalized)) {
        setError(
          "CURP inválida. Formato: 4 letras + 6 dígitos + 6 letras + 2 dígitos",
        );
        return;
      }

      // Validar dígito verificador y fecha
      if (!validateCURP(normalized)) {
        setError("CURP inválida");
        return;
      }

      // Verificar duplicado en BD
      try {
        const existing = await getProspectByCurpAction(normalized);
        if (existing) {
          toast.warning("Este CURP ya está registrado");
          setError("Este CURP ya está registrado");
        } else {
          setError(null);
        }
      } catch (err) {
        console.error(
          "[StepCurp] Error validando CURP:",
          err instanceof Error ? err.message : err,
        );
      }
    },
    [],
  );

  // Debounce para evitar múltiples llamadas mientras escribe
  useEffect(() => {
    if (curpValue?.length !== CURP_LENGTH) {
      if (curpValue?.length === 0) {
        setError(null);
      } else if (curpValue?.length < CURP_LENGTH) {
        setError("La CURP debe tener 18 caracteres");
      }
      return;
    }

    const timer = setTimeout(() => {
      handleCURPValidate(curpValue);
    }, CURP_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [curpValue, handleCURPValidate]);

  const handleCurpChange = (value: string) => {
    const normalized = normalizeCURP(value);
    setValue("curp", normalized, { shouldValidate: true });
  };

  const isCurpValid = curpValue?.length === CURP_LENGTH && error === null;

  const onSubmit = async () => {
    if (!prospect?.id) {
      toast.error("Error: no se pudo obtener el ID del prospecto");
      return;
    }

    if (!isCurpValid || !curpValue) {
      setError("Por favor ingresa una CURP válida");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateProspectCurpAction(prospect.id, curpValue);

      if (result.success) {
        toast.success("CURP guardada correctamente");

        setProspect({
          ...prospect,
          curp: curpValue,
        });

        setStep("payment");
      }
    } catch (err: any) {
      console.error("Error updating CURP:", err);
      toast.error(err.message || "Error al guardar CURP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Card className="mx-auto border-none shadow-none bg-[#1e1e1e] p-5">
        {/* Header */}
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-white pb-2">
            Ingresa tu CURP
          </CardTitle>
          <CardDescription className="text-sm text-gray-400">
            Para completar tu registro, necesitamos tu CURP
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 mt-4">
          <div className="space-y-6">
            {/* CURP Input */}
            <div className="flex flex-col items-start">
              <FloatingInput
                label="CURP *"
                value={curpValue || ""}
                onChange={(e) => handleCurpChange(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={18}
                name="curp"
                className="uppercase tracking-widest"
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            {/* Helper text */}
            <div className="text-xs text-gray-400 space-y-1">
              <p>La CURP tiene 18 caracteres:</p>
              <p>• 4 letras (apellidos y nombre)</p>
              <p>• 6 dígitos (fecha de nacimiento AAAAMMDD)</p>
              <p>• 6 letras (datos de registro)</p>
              <p>• 2 dígitos (verificador)</p>
            </div>

            {/* Button */}
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!isCurpValid || isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Guardando..." : "Continuar"}
            </Button>
          </div>

          {/* Skip button - optional, for testing */}
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("payment")}
              className="text-zinc-400 hover:text-white"
            >
              Omitir por ahora
            </Button>
          </div>
        </CardContent>
      </Card>
    </FormProvider>
  );
}

"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProspectCurpAction } from "@/app/actions/prospects";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { validateCURP, validateCURPStructrual } from "@/lib/curp2";

export default function StepCurp() {
  const { setStep, prospect, setProspect } = useCheckoutStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      curp: "",
    },
  });

  const { watch, reset } = form;
  const curpValue = watch("curp");

  // Validate CURP on change
  const handleCurpChange = (value: string) => {
    const upperValue = value.toUpperCase();
    form.setValue("curp", upperValue, { shouldValidate: true });
    
    if (upperValue.length === 0) {
      setError(null);
    } else if (upperValue.length < 18) {
      setError("La CURP debe tener 18 caracteres");
    } else if (!validateCURPStructrual(upperValue)) {
      setError("CURP inválida. Formato: 4 letras + 6 dígitos + 6 letras + 2 dígitos");
    } else if (!validateCURP(upperValue)) {
      setError("CURP inválida");
    } else {
      setError(null);
    }
  };

  const isCurpValid = curpValue?.length === 18 && error === null;

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
        
        // Update the prospect in the store with the new CURP
        if (prospect) {
          setProspect({
            ...prospect,
            curp: curpValue,
          });
        }
        
        setStep("payment");
      }
    } catch (error: any) {
      console.error("Error updating CURP:", error);
      toast.error(error.message || "Error al guardar CURP");
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
                placeholder="XAAA010101HNEXXXA0"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={18}
                name="curp"
                className="uppercase tracking-widest"
              />
              {error && (
                <p className="text-red-400 text-sm mt-1">
                  {error}
                </p>
              )}
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
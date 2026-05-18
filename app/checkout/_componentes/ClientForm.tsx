"use client";

import { useState } from "react";

import { FullFormFields, PhoneForm } from "./ClientFormFields";
import StepOTP from "./StepOTP";

type FormStep = "phone" | "full" | "otp";

/**
 * ClientForm - Orquestador del formulario de registro
 *
 * Maneja la transición entre:
 * - PhoneForm (Form 1): Teléfono + Turnstile → buscar Evo/local
 * - FullFormFields (Form 2): Datos restantes + Turnstile → crear prospecto
 * - StepOTP: Verificación de código
 *
 * Flujo:
 * 1. Usuario ve PhoneForm
 * 2. Completa teléfono → Turnstile valida → busca en Evo/local
 * 3. Si encuentra prospecto → StepOTP
 * 4. Si NO encuentra → FullFormFields
 * 5. Completa datos → Turnstile valida → crea prospecto → StepOTP
 *
 * Nota: Este componente usa estado LOCAL para manejar sus pasos internos.
 * NO interactúa con el store global (useCheckoutStore) para evitar conflictos
 * con otros componentes que también usan el store.
 */
export default function ClientForm({ initialData }: { initialData?: any }) {
  const [step, setStep] = useState<FormStep>("phone");
  const [phoneData, setPhoneData] = useState<{
    phone: string;
    areaCode: string;
  } | null>(null);

  // Callback cuando el teléfono no se encuentra en Evo ni prospectos locales
  const handlePhoneNotFound = (phone: string, areaCode: string) => {
    setPhoneData({ phone, areaCode });
    setStep("full");
  };

  // Callback cuando se crea el prospecto exitosamente
  const handleProspectCreated = (prospect: any) => {
    setStep("otp");
  };

  // Render según el paso actual
  const renderStep = () => {
    switch (step) {
      case "phone":
        return <PhoneForm onNotFound={handlePhoneNotFound} />;

      case "full":
        if (!phoneData) {
          // Safety check - si no hay datos del teléfono, volver al paso 1
          setStep("phone");
          return null;
        }
        return (
          <FullFormFields
            phone={phoneData.phone}
            areaCode={phoneData.areaCode}
            onSubmitSuccess={handleProspectCreated}
          />
        );

      case "otp":
        return <StepOTP />;

      default:
        return <PhoneForm onNotFound={handlePhoneNotFound} />;
    }
  };

  return <div className="w-full">{renderStep()}</div>;
}
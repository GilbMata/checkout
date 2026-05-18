"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { getMemberbyPhoneAction } from "@/app/actions/evoActions";
import {
  createProspectAction,
  getProspectByPhoneAction,
} from "@/app/actions/prospects";
import { sendOTP } from "@/app/actions/send-otp";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FloatingInput } from "@/components/ui/FloatingInput";
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/lib/validations";
import { useCheckoutStore, type Prospect } from "@/store/useCheckoutStore";

// @ts-ignore
import PhoneInput from "react-phone-number-input/react-hook-form";
// @ts-ignore
import "react-phone-number-input/style.css";

interface PhoneFormProps {
  onNotFound: (phone: string, areaCode: string) => void;
}

/**
 * PhoneForm - Formulario 1: Solo teléfono
 *
 * Flujo:
 * 1. Usuario ingresa teléfono (10 dígitos)
 * 2. Submit → consulta Evo → busca prospecto local
 * 3. Si encuentra → enviar OTP + avanzar
 * 4. Si NO encuentra → onNotFound() para mostrar formulario completo
 */
export function PhoneForm({ onNotFound }: PhoneFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(false);

  const { setStep, setProspect, setPhone, plan } = useCheckoutStore();

  const form = useForm<Pick<RegistrationFormData, "phone">>({
    resolver: zodResolver(registrationSchema.pick({ phone: true })),
    mode: "onChange",
    defaultValues: {
      phone: "",
    },
  });

  const { control, watch, formState, setError, clearErrors } = form;
  const phoneValue = watch("phone");

  // Ref para evitar múltiples submissions
  const isSubmittingRef = useRef(false);

  const handleSubmitPhone = useCallback(async () => {
    // Prevenir múltiples submissions
    if (isSubmittingRef.current || isVerifying) return;
    if (!phoneValue) return;

    const phoneClean = phoneValue.replace(/\D/g, "");
    if (phoneClean.length < 12) return;

    setIsVerifying(true);
    isSubmittingRef.current = true;
    toast.loading("Validando telefono...", { id: "phone-validation" });

    const phoneNor = phoneClean.slice(2); // Quitar "52" → "3345678988"
    const phoneArea = phoneClean.slice(0, 2); // "52"

    try {
      // Buscar miembro en Evo API
      const member = await getMemberbyPhoneAction(phoneNor);

      if (member) {
        // Miembro encontrado en Evo
        let prospect: Prospect;

        const existingProspect = await getProspectByPhoneAction(phoneNor);

        if (existingProspect) {
          prospect = existingProspect as Prospect;
        } else {
          const newProspect = await createProspectAction({
            email: member.email,
            curp: member.curp || "",
            firstName: member.firstName,
            lastName: member.lastName,
            gender: member.gender,
            birthDate: member.birthDate,
            areaCode: phoneArea,
            phone: phoneNor,
            planId: String(plan?.idMembership),
            idMember: member.idMember,
            idBranch: member.idBranch,
            branchName: member.branchName,
            accessBlocked: member.accessBlocked,
            blockedReason: member.blockedReason,
            documentType: member.documentType,
            documentNumber: member.documentNumber,
            documentId: member.documentId,
            status: member.status,
            membershipStatus: member.membershipStatus,
          });

          prospect = newProspect as unknown as Prospect;
        }

        setProspect(prospect);
        setPhone(phoneValue);

        await sendOTP({ prospectId: prospect.id });

        toast.dismiss("phone-validation");
        toast.success("Código enviado correctamente");
        setStep("otp");
        return;
      }

      // Si no hay miembro, buscar prospecto local
      const localProspect = await getProspectByPhoneAction(phoneNor);

      if (localProspect) {
        setProspect(localProspect as unknown as Prospect);
        setPhone(phoneValue);

        await sendOTP({ prospectId: localProspect.id });

        toast.dismiss("phone-validation");
        toast.success("Código enviado correctamente");
        setStep("otp");
        return;
      }

      // Ninguno encontrado → mostrar formulario completo
      toast.dismiss("phone-validation");
      onNotFound(phoneValue, phoneArea);
    } catch (error) {
      console.error("[PhoneForm] Error:", error);
      toast.dismiss("phone-validation");
      toast.error("Error al procesar. Intenta de nuevo.");
    } finally {
      setIsVerifying(false);
      isSubmittingRef.current = false;
    }
  }, [
    phoneValue,
    isVerifying,
    plan,
    setProspect,
    setPhone,
    setStep,
    onNotFound,
  ]);

  // Validar teléfono cuando está completo
  useEffect(() => {
    if (isVerifying || isSubmittingRef.current) return;

    const phone = phoneValue?.replace(/\D/g, "") || "";
    const hasValidPhone = phone.length >= 12; // 52 + 10 dígitos

    if (hasValidPhone) {
      handleSubmitPhone();
    }
  }, [phoneValue, isVerifying, handleSubmitPhone]);

  // Permitir submit manual también
  const onSubmit = (data: Pick<RegistrationFormData, "phone">) => {
    handleSubmitPhone();
  };

  const phone = phoneValue?.replace(/\D/g, "") || "";
  const isPhoneComplete = phone.length >= 12;

  return (
    <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white p-4 md:p-6 rounded-2xl shadow-xl space-y-6">
      <CardHeader className="space-y-4 px-6 pt-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Ingresa tu teléfono
          </h1>
          <p className="text-sm md:text-base text-zinc-400">
            Te enviaremos un código de verificación
          </p>
        </div>
      </CardHeader>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-8">
          {/* Teléfono */}
          <div className="flex flex-col items-start">
            <PhoneInput
              autoFocus
              defaultCountry="MX"
              value={phoneValue || ""}
              onChange={(value?: string | undefined) => {
                form.setValue("phone", value || "", { shouldValidate: true });
              }}
              autoComplete="on"
              name="phone"
              className="w-full"
              inputComponent={FloatingInput}
              label="Teléfono *"
            />
            {form.formState.errors.phone && (
              <p className="text-red-400 text-sm mt-1">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {/* Botón submit */}
          <Button
            type="submit"
            disabled={!isPhoneComplete || isVerifying || isPending}
            className="w-full h-12 mt-4 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying
              ? "Verificando..."
              : isPending
                ? "Procesando..."
                : "Continuar"}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Tus datos están seguros.
          </p>
        </form>
      </FormProvider>
    </Card>
  );
}

export default PhoneForm;

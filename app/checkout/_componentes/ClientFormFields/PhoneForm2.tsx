"use client";

import { getEvoMemberbyPhoneAction } from "@/app/actions/evoActions";
import {
  createProspectAction,
  getProspectByPhoneAction,
} from "@/app/actions/prospects";
import { sendOTP } from "@/app/actions/send-otp";
import { Button } from "@/components/ui/button";
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/lib/validations";
import { useCheckoutStore, type Prospect } from "@/store/useCheckoutStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

// @ts-ignore
import { LockIcon } from "lucide-react";
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

  const { setStep, setProspect, setPhone, setNeedsCurp, plan } =
    useCheckoutStore();

  const countries = [
    { code: "MX", flag: "🇲🇽", dial: "+52", digits: 10 },
    { code: "US", flag: "🇺🇸", dial: "+1", digits: 10 },
    { code: "ES", flag: "🇪🇸", dial: "+34", digits: 9 },
    { code: "CO", flag: "🇨🇴", dial: "+57", digits: 10 },
    { code: "AR", flag: "🇦🇷", dial: "+54", digits: 10 },
    { code: "CL", flag: "🇨🇱", dial: "+56", digits: 9 },
    { code: "PE", flag: "🇵🇪", dial: "+51", digits: 9 },
  ];

  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showCountries, setShowCountries] = useState(false);

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
      const members = await getEvoMemberbyPhoneAction(phoneNor);
      const member = members[0] ?? null;
      console.log("🚀 ~ PhoneForm2 ~ members:", members);

      if (member) {
        // Miembro encontrado en Evo
        let prospect: Prospect;

        const existingProspect = await getProspectByPhoneAction(phoneNor);

        if (existingProspect) {
          prospect = existingProspect as Prospect;
          // Check if prospect already has CURP, if not set needsCurp flag
          const hasValidCurp =
            existingProspect.curp &&
            existingProspect.curp.startsWith("TEMP_") === false;
          if (!hasValidCurp) {
            setNeedsCurp(true);
          }
        } else {
          // Check if member has a valid CURP
          const hasValidCurp = member.curp && member.curp.length > 5;

          // Generate placeholder CURP if missing (to satisfy DB constraint)
          const curpValue = hasValidCurp
            ? member.curp
            : `TEMP_${Date.now()}_${phoneNor}`;

          const newProspect = await createProspectAction({
            email: member.email,
            curp: curpValue,
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

          // Set needsCurp flag if member didn't have valid CURP
          if (!hasValidCurp) {
            setNeedsCurp(true);
          }
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
        // Check if local prospect has valid CURP
        const hasValidCurp =
          localProspect.curp && !localProspect.curp.startsWith("TEMP_");
        if (!hasValidCurp) {
          setNeedsCurp(true);
        }

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
    setNeedsCurp,
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
    <div className="flex flex-col space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-orange-500">
          Verificación
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Ingresa tu teléfono
        </h1>
        <p className="text-sm text-zinc-600">
          para{" "}
          <span className="text-zinc-400">
            iniciar sesión o crear tu cuenta
          </span>
          .
        </p>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Input mejorado */}
          <div>
            <div className="relative">
              <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-[14px] overflow-hidden transition-all duration-200 focus-within:border-orange-600 focus-within:bg-[#161616]">
                {/* Botón país */}
                <button
                  type="button"
                  onClick={() => setShowCountries((p) => !p)}
                  className="flex items-center gap-1.5 px-4 h-[58px] border-r border-[#222] text-sm text-zinc-400 hover:bg-[#1a1a1a] transition-colors flex-shrink-0"
                >
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <span className="text-zinc-600 text-xs">
                    {showCountries ? "▴" : "▾"}
                  </span>
                </button>

                <span className="text-zinc-500 text-sm px-3 border-r border-[#222] h-[58px] flex items-center">
                  {selectedCountry.dial}
                </span>

                {/* Input */}
                <div className="relative flex-1">
                  <input
                    autoFocus
                    type="tel"
                    id="phone"
                    placeholder=" "
                    autoComplete="tel"
                    value={phoneValue || ""}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, selectedCountry.digits);
                      form.setValue("phone", digits, { shouldValidate: true });
                    }}
                    className="peer w-full bg-transparent border-none outline-none px-4 pt-6 pb-2 text-white text-[15px] caret-orange-500"
                  />
                  <label
                    htmlFor="phone"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none transition-all duration-150
          peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-orange-500 peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-widest
          peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-zinc-500 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest"
                  >
                    Teléfono
                  </label>
                </div>
              </div>

              {/* Dropdown países */}
              {showCountries && (
                <div className="absolute z-50 top-15.5 left-0 w-56 bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowCountries(false);
                        form.setValue("phone", "", { shouldValidate: false });
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-300 hover:bg-[#222] transition-colors"
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1 text-left">{country.code}</span>
                      <span className="text-zinc-500">{country.dial}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-white-600 mt-2 px-1">
              <svg className="w-3.5 h-3.5 text-white-500" /* whatsapp icon */ />
              Recibirás un mensaje de WhatsApp con tu código de acceso
            </p>
          </div>

          <Button
            type="submit"
            disabled={!isPhoneComplete || isVerifying || isPending}
            className="w-full h-[54px] bg-orange-700 hover:bg-orange-600 active:scale-[0.985] text-white font-bold text-[15px] rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isVerifying
              ? "Verificando..."
              : isPending
                ? "Procesando..."
                : "Continuar"}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-zinc-700">
            <LockIcon className="w-3 h-3" />
            Solo usamos tu número para verificar tu identidad
          </p>
        </form>
      </FormProvider>
    </div>

    // <div className="flex flex-col space-y-6 mt-5">
    //   {/* Header */}
    //   <div className="space-y-2">
    //     <p className="text-xs font-bold tracking-widest uppercase text-orange-500">
    //       Verificación
    //     </p>
    //     <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
    //       Ingresa tu teléfono
    //     </h1>
    //     <p className="text-sm md:text-base text-zinc-400">
    //       para{" "}
    //       <span className="text-zinc-300">
    //         iniciar sesión o crear tu cuenta
    //       </span>
    //       .
    //     </p>
    //   </div>

    //   <FormProvider {...form}>
    //     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    //       <div className="flex flex-col items-start">
    //         <PhoneInput
    //           autoFocus
    //           defaultCountry="MX"
    //           value={phoneValue || ""}
    //           onChange={(value?: string | undefined) => {
    //             form.setValue("phone", value || "", { shouldValidate: true });
    //           }}
    //           autoComplete="on"
    //           name="phone"
    //           className="w-full"
    //           inputComponent={FloatingInput}
    //           label="Teléfono *"
    //         />
    //         <p className="text-xs text-zinc-500 mt-2 ml-1">
    //           Recibirás un mensaje de WhatsApp con tu código de acceso
    //         </p>
    //       </div>

    //       <Button
    //         type="submit"
    //         disabled={!isPhoneComplete || isVerifying || isPending}
    //         className="w-full h-12 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    //       >
    //         {isVerifying
    //           ? "Verificando..."
    //           : isPending
    //             ? "Procesando..."
    //             : "Continuar"}
    //       </Button>

    //       <p className="text-xs text-zinc-500 text-center flex items-center justify-center gap-1">
    //         <LockIcon className="w-3 h-3" />
    //         Solo usamos tu número para verificar tu identidad
    //       </p>
    //     </form>
    //   </FormProvider>
    // </div>

    // <Card className="bg-[#1e1e1e] text-white p-2 md:p-4 rounded-2xl shadow-xl space-y-6">
    //   <CardHeader className="space-y-4 px-6 pt-6">
    //     <div className="space-y-1">
    //       <p className="text-xs font-bold tracking-widest uppercase text-orange-500">
    //         Verificación
    //       </p>
    //       <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
    //         Ingresa tu teléfono
    //       </h1>
    //       <p className="text-sm md:text-base text-zinc-400">
    //         para{" "}
    //         <span className="text-zinc-300">
    //           iniciar sesión o crear tu cuenta
    //         </span>
    //         .
    //       </p>
    //     </div>
    //   </CardHeader>

    //   <FormProvider {...form}>
    //     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-8">
    //       <div className="flex flex-col items-start">
    //         <PhoneInput
    //           autoFocus
    //           defaultCountry="MX"
    //           value={phoneValue || ""}
    //           onChange={(value?: string | undefined) => {
    //             form.setValue("phone", value || "", { shouldValidate: true });
    //           }}
    //           autoComplete="on"
    //           name="phone"
    //           className="w-full"
    //           inputComponent={FloatingInput}
    //           label="Teléfono *"
    //         />
    //         <p className="text-xs text-zinc-500 mt-2 ml-1">
    //           Recibirás un mensaje de WhatsApp con tu código de acceso
    //         </p>
    //       </div>

    //       <Button
    //         type="submit"
    //         disabled={!isPhoneComplete || isVerifying || isPending}
    //         className="w-full h-12 mt-4 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    //       >
    //         {isVerifying
    //           ? "Verificando..."
    //           : isPending
    //             ? "Procesando..."
    //             : "Continuar"}
    //       </Button>

    //       <p className="text-xs text-zinc-500 text-center flex items-center justify-center gap-1">
    //         <LockIcon className="w-3 h-3" />
    //         Solo usamos tu número para verificar tu identidad
    //       </p>
    //     </form>
    //   </FormProvider>
    // </Card>
  );
}

export default PhoneForm;

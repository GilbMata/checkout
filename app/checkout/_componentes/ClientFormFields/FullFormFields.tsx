"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback, useEffect, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";

import {
  createProspectAction,
  getProspectByCurpAction,
  getProspectByEmailAction,
} from "@/app/actions/prospects";
import { sendOTP } from "@/app/actions/send-otp";
import { verifyTurnstileToken } from "@/app/actions/verify-turnstile";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { TurnstileWidget } from "@/components/ui/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DisposableEmailAlert } from "@/components/ui/disposable-email-alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeCURP, parseCURP } from "@/lib/curp2";
import { cn } from "@/lib/utils";
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/lib/validations";
import { useCheckoutStore, type Prospect } from "@/store/useCheckoutStore";
import { toast } from "sonner";

// Constantes para evitar magic numbers
const CURP_LENGTH = 18;
const CURP_DEBOUNCE_MS = 500;
const AUTO_FILL_ANIMATION_MS = 1500;
const EMAIL_DISPOSABLE_DEBOUNCE_MS = 500;

// Estados de México
const MEXICAN_STATES = [
  { idState: 52, name: "Aguascalientes", abbreviation: "AS" },
  { idState: 53, name: "Baja California", abbreviation: "BC" },
  { idState: 54, name: "Baja California Sur", abbreviation: "BS" },
  { idState: 55, name: "Campeche", abbreviation: "CC" },
  { idState: 56, name: "Chiapas", abbreviation: "CS" },
  { idState: 57, name: "Chihuahua", abbreviation: "CH" },
  { idState: 58, name: "Coahuila", abbreviation: "CL" },
  { idState: 59, name: "Colima", abbreviation: "CM" },
  { idState: 60, name: "Ciudad de México", abbreviation: "DF" },
  { idState: 61, name: "Durango", abbreviation: "DG" },
  { idState: 62, name: "Guanajuato", abbreviation: "GT" },
  { idState: 63, name: "Guerrero", abbreviation: "GR" },
  { idState: 64, name: "Hidalgo", abbreviation: "HG" },
  { idState: 65, name: "Jalisco", abbreviation: "JC" },
  { idState: 66, name: "Estado de México", abbreviation: "MC" },
  { idState: 67, name: "Michoacán", abbreviation: "MN" },
  { idState: 68, name: "Morelos", abbreviation: "MS" },
  { idState: 69, name: "Nayarit", abbreviation: "NT" },
  { idState: 70, name: "Nuevo León", abbreviation: "NL" },
  { idState: 71, name: "Oaxaca", abbreviation: "OC" },
  { idState: 72, name: "Puebla", abbreviation: "PL" },
  { idState: 73, name: "Querétaro", abbreviation: "QT" },
  { idState: 74, name: "Quintana Roo", abbreviation: "QR" },
  { idState: 75, name: "San Luis Potosí", abbreviation: "SP" },
  { idState: 76, name: "Sinaloa", abbreviation: "SL" },
  { idState: 77, name: "Sonora", abbreviation: "SR" },
  { idState: 78, name: "Tabasco", abbreviation: "TC" },
  { idState: 79, name: "Tamaulipas", abbreviation: "TS" },
  { idState: 80, name: "Tlaxcala", abbreviation: "TL" },
  { idState: 81, name: "Veracruz", abbreviation: "VZ" },
  { idState: 82, name: "Yucatán", abbreviation: "YN" },
  { idState: 83, name: "Zacatecas", abbreviation: "ZS" },
];

interface FullFormFieldsProps {
  phone: string;
  areaCode: string;
  onSubmitSuccess: (prospect: Prospect) => void;
}

/**
 * Mapper para validar y convertir datos del servidor a tipo Prospect
 * Evita castings inseguros como `as unknown as Prospect`
 * Solo mapea los campos que existen en el tipo Prospect del store
 */
function mapToProspect(data: unknown): Prospect {
  if (!data || typeof data !== "object") {
    throw new Error("Datos de prospecto inválidos");
  }
  const d = data as Record<string, unknown>;
  if (!d.id || !d.email || !d.phone) {
    throw new Error("Faltan campos requeridos en prospecto");
  }
  return {
    id: String(d.id),
    firstName: String(d.firstName ?? ""),
    lastName: String(d.lastName ?? ""),
    areaCode: String(d.areaCode ?? ""),
    phone: String(d.phone),
    email: String(d.email),
    curp: String(d.curp ?? ""),
    idMember: Number(d.idMember ?? d.idMembership ?? 0),
    // Address fields
    address: String(d.address ?? ""),
    number: String(d.number ?? ""),
    state: String(d.state ?? ""),
    city: String(d.city ?? ""),
    zipCode: String(d.zipCode ?? ""),
  };
}

/**
 * FullFormFields - Formulario 2: Datos restantes + Turnstile
 *
 * Contiene: CURP, firstName, lastName, gender, birthDate, email
 * Turnstile se ejecuta al hacer submit antes de crear prospecto
 *
 * Funciones especiales:
 * - CURP autocompleta gender + birthDate
 * - CURP valida duplicado en BD
 * - Email valida duplicado y disposable
 */
export function FullFormFields({
  phone,
  areaCode,
  onSubmitSuccess,
}: FullFormFieldsProps) {
  const [isPending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [showDisposableAlert, setShowDisposableAlert] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const { setProspect, setEmail, plan } = useCheckoutStore();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: {
      curp: "",
      firstName: "",
      lastName: "",
      gender: "",
      birthDate: "",
      email: "",
      phone: phone, // Teléfono del paso anterior
      areaCode: areaCode,
      // Address fields
      address: "",
      number: "",
      state: "",
      city: "",
      zipCode: "",
    },
  });

  const { setValue, setError, clearErrors, formState } = form;

  // Usar estados locales para evitar re-renders excesivos
  const [curpValue, setCurpValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [firstNameValue, setFirstNameValue] = useState("");
  const [lastNameValue, setLastNameValue] = useState("");
  const [genderValue, setGenderValue] = useState("");
  const [birthDateValue, setBirthDateValue] = useState("");
  const [addressValue, setAddressValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [cityValue, setCityValue] = useState("");
  const [zipCodeValue, setZipCodeValue] = useState("");
  const [selectedState, setSelectedState] = useState("");

  // useCallback para handleCURPValidate - evita recrear en cada render
  const handleCURPValidate = useCallback(
    async (curp: string) => {
      const normalized = normalizeCURP(curp);

      // Autocompletar gender y birthDate
      const data = parseCURP(normalized);
      if (data.birthDateString) {
        setValue("birthDate", data.birthDateString, { shouldValidate: true });
        setBirthDateValue(data.birthDateString);
      }
      if (data.gender) {
        setValue("gender", data.gender, { shouldValidate: true });
        setGenderValue(data.gender);
      }

      // Animación de autocompletado
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), AUTO_FILL_ANIMATION_MS);

      // Verificar duplicado en BD
      try {
        const existing = await getProspectByCurpAction(normalized);
        if (existing) {
          toast.warning("Este CURP ya está registrado");
          setError("curp", { message: "Este CURP ya está registrado" });
        } else {
          clearErrors("curp");
        }
      } catch (error) {
        console.error(
          "[FullFormFields] Error validando CURP:",
          error instanceof Error ? error.message : error,
        );
      }
    },
    [setValue, setError, clearErrors],
  );

  // Validación de CURP con debounce para evitar race conditions
  useEffect(() => {
    // Solo validar cuando tenga la longitud correcta
    if (curpValue.length !== CURP_LENGTH) return;

    // Debounce para evitar múltiples llamadas mientras escribe
    const timer = setTimeout(() => {
      handleCURPValidate(curpValue);
    }, CURP_DEBOUNCE_MS);

    // Cleanup: cancelar timeout si el valor cambia o componente desmonta
    return () => clearTimeout(timer);
  }, [curpValue, handleCURPValidate]);

  // Validación de email disposable
  useEffect(() => {
    if (!emailValue) {
      setShowDisposableAlert(false);
      return;
    }

    const timeout = setTimeout(async () => {
      // Verificar si es disposable usando la librería
      const { isDisposable } = await import("@isdisposable/js");
      const disposable = isDisposable(emailValue);

      if (disposable) {
        setShowDisposableAlert(true);
      } else {
        setShowDisposableAlert(false);
      }
    }, EMAIL_DISPOSABLE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [emailValue]);

  // Handlers para actualizar estados locales sin re-renders excesivos
  const handleCurpChange = (value: string) => {
    const normalized = normalizeCURP(value);
    setValue("curp", normalized, { shouldValidate: true, shouldDirty: true });
    setCurpValue(normalized);
  };

  const handleEmailChange = (value: string) => {
    setValue("email", value, { shouldValidate: true });
    setEmailValue(value);
  };

  // Helper para capitalizar primera letra
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleFirstNameChange = (value: string) => {
    const capitalized = capitalizeFirstLetter(value);
    setValue("firstName", capitalized, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setFirstNameValue(capitalized);
  };

  const handleLastNameChange = (value: string) => {
    const capitalized = capitalizeFirstLetter(value);
    setValue("lastName", capitalized, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setLastNameValue(capitalized);
  };

  const handleGenderChange = (value: string) => {
    setValue("gender", value, { shouldValidate: true, shouldDirty: true });
    setGenderValue(value);
  };

  const handleBirthDateChange = (value: string) => {
    setValue("birthDate", value, { shouldValidate: true, shouldDirty: true });
    setBirthDateValue(value);
  };

  // Callbacks de Turnstile
  const handleTurnstileVerify = useCallback((token: string) => {
    console.debug("[FullFormFields] Turnstile verified");
    setTurnstileToken(token);
    setTurnstileReady(true);
  }, []);

  const handleTurnstileError = useCallback((error: string) => {
    console.error("[FullFormFields] Turnstile error:", error);
    toast.error("Error de verificación de seguridad");
    setTurnstileReady(false);
  }, []);

  const handleTurnstileExpired = useCallback(() => {
    console.warn("[FullFormFields] Turnstile token expired");
    setTurnstileToken("");
    setTurnstileReady(false);
  }, []);

  // Submit del formulario — validación manual para siempre dar feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar todos los campos
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    const data = form.getValues();
    await onSubmit(data);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (showDisposableAlert) {
      toast.error("No se permiten correos temporales");
      return;
    }

    if (!turnstileToken) {
      toast.error("Completando verificación de seguridad...");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Validar Turnstile
        toast.loading("Verificando...", { id: "form-submit" });

        const isTurnstileValid = await verifyTurnstileToken(turnstileToken);

        if (!isTurnstileValid) {
          toast.dismiss("form-submit");
          toast.error("Verificación de seguridad fallida. Intenta de nuevo.");
          setTurnstileToken("");
          setTurnstileReady(false);
          return;
        }

        console.debug(
          "[FullFormFields] Turnstile validado, creando prospecto...",
        );

        // 2. Verificar email duplicado en prospectos locales
        const normalizedEmail = data.email.toLowerCase().trim();
        try {
          const existingEmail = await getProspectByEmailAction(normalizedEmail);
          if (existingEmail) {
            toast.dismiss("form-submit");
            toast.warning("Este correo ya está registrado");
            setError("email", { message: "Este correo ya está registrado" });
            // Reset Turnstile para permitir reintento
            setTurnstileToken("");
            setTurnstileReady(false);
            return;
          }
        } catch (verifyError) {
          // Si falla la verificación, continuamos pero el error de creación podría ocurrir
          console.warn(
            "[FullFormFields] Error verificando email:",
            verifyError,
          );
        }

        // 3. Crear prospecto
        const phoneClean = phone.replace(/\D/g, "");
        const phoneNor = phoneClean.slice(2);
        const phoneArea = phoneClean.slice(0, 2);

        const prospect = await createProspectAction({
          email: data.email,
          curp: data.curp,
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender,
          birthDate: data.birthDate,
          areaCode: phoneArea,
          phone: phoneNor,
          planId: plan?.idMembership ? String(plan.idMembership) : undefined,
          idBranch: plan?.idBranch,
          // Address fields
          address: data.address,
          number: data.number,
          state: data.state,
          city: data.city,
          zipCode: data.zipCode,
        });

        // 4. Enviar OTP
        await sendOTP({ prospectId: prospect.id });

        // 5. Actualizar store y avanzar usando mapper seguro
        const mappedProspect = mapToProspect(prospect);
        setProspect(mappedProspect);
        setEmail(data.email);

        toast.dismiss("form-submit");
        toast.success("Código enviado correctamente");
        onSubmitSuccess(mappedProspect);
      } catch (error: unknown) {
        // Type guard para extraer mensaje de error de manera segura
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("[FullFormFields] Error:", errorMessage);
        toast.dismiss("form-submit");

        // Detectar error de constraint único de Prisma (solo phone ahora, ya que email no es único)
        const isPhoneConstraint =
          errorMessage.includes("phone") &&
          (errorMessage.includes("Unique constraint") ||
            errorMessage.includes("constraint"));

        if (isPhoneConstraint) {
          toast.error("El teléfono ya está registrado.");
        } else {
          toast.error(errorMessage || "Error al registrar");
        }

        // Reset Turnstile para permitir reintento
        setTurnstileToken("");
        setTurnstileReady(false);
      }
    });
  };


  return (
    <Card className="w-full max-w-xl mx-auto bg-linear-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 text-white rounded-2xl shadow-2xl overflow-hidden">
      {/* <Card className="w-full max-w-lg mx-auto bg-[#1e1e1e] text-white p-4 md:p-6 rounded-2xl shadow-xl space-y-6"> */}
      <div className="h-1.5 bg-linear-to-r from-orange-500 via-orange-400 to-orange-600" />

      <CardHeader className="space-y-4 px-6 pt-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Completa tu registro
          </h1>
          <p className="text-sm md:text-base text-zinc-400">
            Ingresa tus datos para continuar
          </p>
        </div>
      </CardHeader>

      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 px-2 md:px-6"
        >
          {/* Fila 1: CURP */}
          <div
            className={cn(
              "transition-all duration-300",
              autoFilled && "animate-in fade-in slide-in-from-bottom-2",
            )}
          >
            <FloatingInput
              label="CURP *"
              value={curpValue}
              onChange={(e) => handleCurpChange(e.target.value)}
              maxLength={18}
              name="curp"
            />
          </div>

          {/* Fila 2: Nombre + Apellido */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FloatingInput
              label="Nombre *"
              value={firstNameValue}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              name="firstName"
            />
            <FloatingInput
              label="Apellido *"
              value={lastNameValue}
              onChange={(e) => handleLastNameChange(e.target.value)}
              name="lastName"
            />
          </div>

          {/* Fila 3: Género + Fecha Nacimiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FloatingInput
              label="Género"
              value={genderValue}
              onChange={(e) => handleGenderChange(e.target.value)}
              name="gender"
            />
            <FloatingInput
              label="Fecha de nacimiento"
              value={birthDateValue}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              name="birthDate"
            />
          </div>

          {/* Fila 4: Teléfono */}
          <div>
            <div className="relative w-full">
              <input
                readOnly
                tabIndex={-1}
                value={phone}
                className="peer w-full h-11 px-0 py-3 text-white border-0 border-b-2 bg-zinc-800/30 text-sm outline-none pointer-events-none"
              />
              <label className="absolute left-0 -top-2 text-xs text-zinc-400">
                Teléfono
              </label>
            </div>
          </div>

          {/* Fila 5: Calle + Número */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FloatingInput
              label="Calle"
              value={addressValue}
              onChange={(e) => {
                setAddressValue(e.target.value);
                setValue("address", e.target.value, { shouldValidate: true });
              }}
              name="address"
            />
            <FloatingInput
              label="Número"
              value={numberValue}
              onChange={(e) => {
                setNumberValue(e.target.value);
                setValue("number", e.target.value, { shouldValidate: true });
              }}
              name="number"
            />
          </div>

          {/* Fila 6: CP + Estado + Ciudad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <FloatingInput
              label="Código Postal"
              value={zipCodeValue}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                setZipCodeValue(value);
                setValue("zipCode", value, { shouldValidate: true });
              }}
              name="zipCode"
              maxLength={5}
            />
            <div className="relative w-full">
              <label
                className={cn(
                  "absolute left-0 pointer-events-none transition-all duration-200 z-10",
                  selectedState
                    ? "-top-2 text-xs text-zinc-400"
                    : "top-3 text-sm text-zinc-500",
                )}
              >
                Estado
              </label>
              <Select
                onValueChange={(value) => {
                  if (value) {
                    setSelectedState(value);
                    setValue("state", value, { shouldValidate: true });
                  }
                }}
                value={selectedState}
              >
                <SelectTrigger className="bg-transparent w-full h-11 py-0 border-0 border-b-2 rounded-none text-white px-0 inline-flex items-center">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 text-white max-h-60">
                  <SelectGroup>
                    {MEXICAN_STATES.map((state) => (
                      <SelectItem
                        key={state.idState}
                        value={state.name}
                        className="text-white focus:bg-zinc-700 focus:text-white"
                      >
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <FloatingInput
              label="Ciudad"
              value={cityValue}
              onChange={(e) => {
                setCityValue(e.target.value);
                setValue("city", e.target.value, { shouldValidate: true });
              }}
              name="city"
            />
          </div>

          {/* Fila 7: Correo electrónico */}
          <div>
            <FloatingInput
              label="Correo electrónico *"
              type="email"
              value={emailValue}
              onChange={(e) => handleEmailChange(e.target.value)}
              name="email"
            />
            {showDisposableAlert && <DisposableEmailAlert className="mt-1" />}
          </div>

          {/* Turnstile - se muestra cuando el usuario empieza a llenar el formulario */}
          {formState.isDirty && (
            <TurnstileWidget
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
              onExpired={handleTurnstileExpired}
              action="create-prospect"
              className="min-h-12.5"
            />
          )}

          {/* Botón submit */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 mt-4 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Registrando..." : "Continuar"}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Protected by Cloudflare Turnstile
          </p>
        </form>
      </FormProvider>
    </Card>
  );
}

export default FullFormFields;

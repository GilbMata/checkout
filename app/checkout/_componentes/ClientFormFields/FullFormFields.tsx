"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
// import { toast } from "sonner";

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

  const { setStep, setProspect, setEmail, plan } = useCheckoutStore();

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
    },
  });

  const { control, watch, setValue, setError, clearErrors, formState } = form;

  // Usar estados locales para evitar re-renders excesivos
  const [curpValue, setCurpValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [firstNameValue, setFirstNameValue] = useState("");
  const [lastNameValue, setLastNameValue] = useState("");

  // useCallback para handleCURPValidate - evita recrear en cada render
  const handleCURPValidate = useCallback(
    async (curp: string) => {
      const normalized = normalizeCURP(curp);

      // Autocompletar gender y birthDate
      const data = parseCURP(normalized);
      if (data.birthDateString) {
        setValue("birthDate", data.birthDateString, { shouldValidate: true });
      }
      if (data.gender) {
        setValue("gender", data.gender, { shouldValidate: true });
      }

      // Animación de autocompletado
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), AUTO_FILL_ANIMATION_MS);

      // Verificar duplicado en BD
      try {
        const existing = await getProspectByCurpAction(normalized);
        if (existing) {
          // CURP ya existe - podrías manejar esto según necesidad
        }
      } catch (error) {
        console.error(
          "[FullFormFields] Error validando CURP:",
          error instanceof Error ? error.message : error,
        );
      }
    },
    [setValue],
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
    setValue("email", value, { shouldValidate: false });
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

  // Submit del formulario
  const onSubmit = async (data: RegistrationFormData) => {
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
        console.log("🚀 ~ onSubmit ~ phoneClean:", phoneClean);
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
          planId: String(plan?.idMembership),
          idBranch: plan?.idBranch,
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

  const isFormValid = form.formState.isValid;
  const canShowTurnstile = isFormValid && !isPending;

  return (
    <Card className="w-full max-w-md mx-auto bg-[#1e1e1e] text-white p-4 md:p-6 rounded-2xl shadow-xl space-y-6">
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-8">
          {/* CURP */}
          <div
            className={cn(
              "transition-all duration-300",
              autoFilled && "animate-in fade-in slide-in-from-bottom-2",
            )}
          >
            {/* <label className="text-sm text-zinc-400 mb-1 block">CURP</label> */}
            <FloatingInput
              label="CURP *"
              value={curpValue}
              onChange={(e) => handleCurpChange(e.target.value)}
              maxLength={18}
              name="curp"
            />
          </div>

          {/* Nombre */}
          <div>
            {/* <label className="text-sm text-zinc-400 mb-1 block">Nombre</label> */}
            <FloatingInput
              label="Nombre *"
              value={firstNameValue}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              name="firstName"
            />
          </div>

          {/* Apellido */}
          <div>
            {/* <label className="text-sm text-zinc-400 mb-1 block">Apellido</label> */}
            <FloatingInput
              label="Apellido *"
              value={lastNameValue}
              onChange={(e) => handleLastNameChange(e.target.value)}
              name="lastName"
            />
          </div>

          {/* Gender + BirthDate */}
          <div className="grid grid-cols-2 gap-4">
            {/* Gender */}
            <div
              className={cn(
                "transition-all duration-300",
                autoFilled && "animate-in fade-in slide-in-from-bottom-2",
              )}
            >
              <label className="text-sm text-zinc-400 mb-1 block">
                Género
                {autoFilled && (
                  <span className="ml-1 text-xs text-orange-400">
                    (autocompletado)
                  </span>
                )}
              </label>
              <Select
                disabled
                onValueChange={(value) => {
                  if (!autoFilled) {
                    setValue("gender", value || "", { shouldValidate: true });
                  }
                }}
                value={form.getValues("gender") || ""}
              >
                <SelectTrigger
                  disabled={autoFilled}
                  className={cn(
                    "bg-transparent w-full h-12 border-0 border-b-2 rounded-none",
                    autoFilled &&
                      "opacity-60 cursor-not-allowed pointer-events-none",
                  )}
                >
                  <SelectValue
                    placeholder={
                      autoFilled ? form.getValues("gender") : "Selecciona"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* BirthDate */}
            <div
              className={cn(
                "transition-all duration-300",
                autoFilled && "animate-in fade-in slide-in-from-bottom-2",
              )}
            >
              <label className="text-sm text-zinc-400 mb-1 block">
                Fecha de nacimiento
              </label>
              <div
                className={cn(
                  "w-full bg-transparent px-0 py-1 outline-none transition-all rounded-none text-left font-normal border-0 border-b-2 flex",
                  !form.getValues("birthDate") && "text-muted-foreground",
                )}
              >
                {form.getValues("birthDate") ? (
                  format(
                    new Date(form.getValues("birthDate") + "T00:00:00"),
                    "PPP",
                    { locale: es },
                  )
                ) : (
                  <span>Selecciona</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            {/* <label className="text-sm text-zinc-400 mb-1 block">
              Correo electrónico
            </label> */}
            <FloatingInput
              label="Correo electrónico *"
              type="email"
              value={emailValue}
              onChange={(e) => handleEmailChange(e.target.value)}
              name="email"
            />
            {showDisposableAlert && <DisposableEmailAlert className="mt-2" />}
          </div>

          {/* Teléfono (readonly - del paso anterior) */}
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Teléfono</label>
            <div className="w-full bg-zinc-800 px-0 py-3 text-white border-0 border-b-2">
              {phone}
            </div>
          </div>

          {/* Turnstile - aparece cuando el formulario es válido */}
          {canShowTurnstile && (
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
            disabled={!isFormValid || isPending || !turnstileReady}
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

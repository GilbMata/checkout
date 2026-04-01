import { validateDisposableEmail } from "@/lib/email/disposable-email";
import { z } from "zod";

/**
 * Custom Zod refinement for email validation including disposable check
 */
const disposableEmailRefinement = (email: string) => {
  const result = validateDisposableEmail(email);
  return !result.isDisposable;
};

export const prospectSchema = z.object({
  email: z
    .string("El correo electrónico es requerido")
    .min(1, "El correo electrónico es requerido")
    .email("Ingresa un correo electrónico válido")
    .refine(
      (email) => disposableEmailRefinement(email),
      "Los correos temporales o desechables no están permitidos. Por favor, utiliza un correo electrónico válido.",
    ),

  curp: z
    .string("El CURP es requerido")
    .min(1, "El CURP es requerido")
    .length(18, "El CURP debe tener exactamente 18 caracteres")
    .transform((val) => val.toUpperCase()),

  firstName: z
    .string("El nombre es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
      message: "El nombre solo puede contener letras y espacios",
    }),

  lastName: z
    .string("Los apellidos son requeridos")
    .min(2, "Los apellidos deben tener al menos 2 caracteres")
    .max(100, "Los apellidos no pueden exceder 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
      message: "Los apellidos solo pueden contener letras y espacios",
    }),

  phone: z
    .string("El teléfono es requerido")
    .min(10, "El teléfono debe tener al menos 10 dígitos")
    .max(15, "El teléfono no puede exceder 15 dígitos")
    .regex(/^\+?[0-9]+$/, {
      message: "El teléfono solo puede contener números",
    }),

  genero: z.string().optional(),

  birthDate: z.string().optional(),

  areaCode: z.string().optional(),

  planId: z.string().optional(),
});

export type ProspectFormValues = z.infer<typeof prospectSchema>;

/**
 * Schema for OTP sending - validates email only
 */
export const sendOtpSchema = z.object({
  email: z
    .string("El correo electrónico es requerido")
    .min(1, "El correo electrónico es requerido")
    .email("Ingresa un correo electrónico válido")
    .refine(
      (email) => disposableEmailRefinement(email),
      "Los correos temporales o desechables no están permitidos. Por favor, utiliza un correo electrónico válido.",
    ),

  phone: z
    .string("El teléfono es requerido")
    .min(10, "El teléfono debe tener al menos 10 dígitos"),

  planId: z.string().optional(),
});

export type SendOtpFormValues = z.infer<typeof sendOtpSchema>;

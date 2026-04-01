import { isDisposable } from "@isdisposable/js";
import { z } from "zod";
import { validateCURP, validateCURPStructrual } from "./curp2";

export const curpSchema = z
  .string()
  .min(18, "La CURP debe tener 18 caracteres")
  .max(18, "La CURP debe tener 18 caracteres")
  .refine((val) => validateCURPStructrual(val), {
    message:
      "CURP inválida. Formato: 4 letras + 6 dígitos + 6 letras + 2 dígitos",
  })
  .refine((val) => validateCURP(val), {
    message: "CURP inválida.",
  });

export const emailSchema = z
  .string()
  .min(1, "El correo electrónico es requerido")
  .email("Correo electrónico inválido")
  .refine(
    (val) => !isDisposable(val),
    "Los correos temporales no están permitidos. Usa un correo personal.",
  );

export const registrationSchema = z.object({
  curp: curpSchema,
  firstName: z
    .string()
    .min(1, "El nombre es requerido")
    .max(20, "Nombre muy largo"),
  lastName: z
    .string()
    .min(1, "El apellido es requerido")
    .max(20, "Apellido muy largo"),
  genero: z.string().optional(),
  birthDate: z
    .string()
    .min(1, "La fecha de nacimiento es requerida")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  email: emailSchema,
  areaCode: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || val.replace(/\D/g, "").length >= 12, {
      message: "El número debe tener 10 dígitos",
    }),
});

export const otpSchema = z.object({
  email: z.email("Correo electrónico inválido"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;

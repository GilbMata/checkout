import { z } from "zod";

export const otpSchema = z.object({
  otp: z
    .string()
    .min(6, "Código incompleto")
    .max(6, "Código inválido")
    .regex(/^\d+$/, "El código debe contener solo números"),
});

export type OTPFormValues = z.infer<typeof otpSchema>;

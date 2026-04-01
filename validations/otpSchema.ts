import { z } from "zod";

export const otpSchema = z.object({
    otp: z
        .string()
        .min(6, "Código incompleto")
        .max(6, "Código inválido"),
});

export type OTPFormValues = z.infer<typeof otpSchema>;
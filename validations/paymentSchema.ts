import { z } from "zod";

/**
 * Schema para pagos recurrentes / suscripciones
 * Valida el request que viene del frontend (CardPaymentBrick)
 */
export const recurrentPaymentSchema = z.object({
  // Token de la tarjeta tokenizada por MercadoPago
  token: z.string().min(1, "Token de tarjeta requerido"),

  // Monto del pago (en la moneda especificada)
  amount: z
    .number()
    .positive("El monto debe ser mayor a 0")
    .max(999999, "Monto excede el límite permitido"),

  // Moneda (default: MXN para México)
  currency: z.string().default("MXN"),

  // Descripción del plan/suscripción
  description: z.string().min(1, "Descripción requerida"),

  // ID del método de pago usado
  payment_method_id: z.string().min(1, "Método de pago requerido"),
  cardholder_name: z.string().optional(),

  // Email del pagador
  payer_email: z
    .string()
    .email("Email válido requerido")
    .or(
      z
        .string()
        .length(0)
        .transform(() => ""),
    ),

  // Nombre del pagador
  payer_first_name: z.string().min(1, "Nombre requerido"),

  // Apellido del pagador
  payer_last_name: z.string().min(1, "Apellido requerido"),

  // ID del plan desde el frontend
  plan_id: z.string().min(1, "ID de plan requerido"),

  // Intervalo de recurrencia
  recurrence_interval: z.enum(["weekly", "monthly", "bimonthly", "yearly"]),

  // Teléfono del prospecto (para buscar en DB)
  prospect_phone: z.string().optional(),

  //(default: CURP)
  identification_type: z.string().default("CURP"),

  // (CURP del usuario)
  identification_number: z.string().optional(),

  // ID del plan de suscripción de MercadoPago (para suscripciones con plan asociado)
  mp_preapproval_plan_id: z.string().optional(),

  // Referencia externa Número de sucursal.
  external_reference: z.string().optional(),
  card_last_four: z.string().optional(),
});

export type RecurrentPaymentInput = z.infer<typeof recurrentPaymentSchema>;

/**
 * Schema para respuesta exitosa de suscripción
 */
export const recurrentPaymentResponseSchema = z.object({
  success: z.boolean(),
  preapproval_id: z.string().optional(),
  status: z.string().optional(),
  next_billing_date: z.string().optional(),
  subscription_id: z.string().optional(),
  error: z.string().optional(),
  pending: z.boolean().optional(),
  rejected: z.boolean().optional(),
  status_detail: z.string().optional(),
  start_date: z.string().optional(),
});

export type RecurrentPaymentResponse = z.infer<
  typeof recurrentPaymentResponseSchema
>;

/**
 * Schema para webhook de suscripciones MercadoPago
 */
export const subscriptionWebhookSchema = z.object({
  type: z.string(),
  action: z.string(),
  data: z.object({
    id: z.string(),
  }),
});

export type SubscriptionWebhookData = z.infer<typeof subscriptionWebhookSchema>;

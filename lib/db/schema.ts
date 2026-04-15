import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const otpRequests = sqliteTable("otp_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  otp: text("otp").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const magicLinks = sqliteTable("magic_links", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  prospectId: text("prospect_id"),
  planId: text("plan_id"),
  mpPaymentId: text("mp_payment_id"),
  mpPreferenceId: text("mp_preference_id"),
  status: text("status"), // pending, approved, rejected, cancelled, refunded
  statusDetail: text("status_detail"),
  transactionAmount: integer("transaction_amount"),
  currencyId: text("currency_id"), // MXN
  paymentMethodId: text("payment_method_id"),
  paymentTypeId: text("payment_type_id"),
  installments: integer("installments"),
  description: text("description"),
  externalReference: text("external_reference"),
  dateApproved: integer("date_approved"),
  dateCreated: integer("date_created"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  curp: text("curp").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender"),
  birthDate: text("birth_date"),
  areaCode: text("area_code"),
  phone: text("phone").notNull().unique(),
  planId: text("plan_id"),
  idMember: integer("id_member"),
  idBranch: integer("id_branch"),
  branchName: text("branch_name"),
  accessBlocked: integer("access_blocked", { mode: "boolean" }).default(false),
  blockedReason: text("blocked_reason"),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
  documentId: text("document_id"),
  status: text("status"),
  membershipStatus: text("membership_status"),
  paymentPending: integer("payment_pending", { mode: "boolean" }).default(true),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

/**
 * Email validation logs for fraud/spam analysis
 *
 * Data Classification: PII-adjacent (email addresses)
 * Retention: 90 days, then purge
 * Access: Admin only
 */
export const emailValidationLogs = sqliteTable("email_validation_logs", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  domain: text("domain").notNull(),
  isDisposable: integer("is_disposable", { mode: "boolean" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  validationContext: text("validation_context"), // e.g., "checkout_registration", "prospect_update"
  createdAt: integer("created_at").notNull(),
});

/**
 * Tabla de suscripciones / pagos recurrentes
 *
 * Data Classification: PII (payment data, customer info)
 * Retention: Duration of membership + 2 years for legal/compliance
 * Access: Finance & Admin only
 */
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(), // UUID local
  prospectId: text("prospect_id").notNull(), // FK a prospects

  // IDs de MercadoPago
  mpCustomerId: text("mp_customer_id"), // Customer ID en MP
  mpCardId: text("mp_card_id"), // Card ID guardada en MP
  mpPreapprovalId: text("mp_preapproval_id"), // Preapproval ID (suscripción)

  // Info del plan
  planId: text("plan_id").notNull(),
  planDescription: text("plan_description"),
  mpPreapprovalPlanId: text("mp_preapproval_plan_id"), // ID del plan en MP (para suscripciones con plan asociado)
  recurrenceInterval: text("recurrence_interval"), // weekly, monthly, bimonthly, yearly

  // Monto
  transactionAmount: integer("transaction_amount"), // en centavos
  currencyId: text("currency_id").default("MXN"),

  // Fechas de facturación
  startDate: integer("start_date"), // cuando inicia la suscripción
  nextBillingDate: integer("next_billing_date"), // próximo cobro
  lastBillingDate: integer("last_billing_date"), // último cobro realizado

  // Estado de la suscripción
  status: text("status").notNull(), // authorized, active, paused, cancelled, expired

  // Datos del pagador
  payerEmail: text("payer_email"),
  payerFirstName: text("payer_first_name"),
  payerLastName: text("payer_last_name"),

  // Metadatos
  externalReference: text("external_reference"), // referencia externa
  description: text("description"),

  // Timestamps
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

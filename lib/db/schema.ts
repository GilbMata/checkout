import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// export const users = sqliteTable("users", {
//   id: text("id").primaryKey(),
//   email: text("email").notNull().unique(),
//   planId: text("plan_id"),
//   createdAt: integer("created_at"),
// });

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
  genero: text("genero"),
  birthDate: text("birth_date"),
  areaCode: text("area_code"),
  phone: text("phone").notNull(),
  planId: text("plan_id"),
  paymentPending: integer("payment_pending", { mode: "boolean" }).default(true),
  isMember: integer("is_member", { mode: "boolean" }).default(false),
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

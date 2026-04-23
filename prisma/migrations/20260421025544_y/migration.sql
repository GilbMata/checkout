-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('prospect', 'member', 'inactive');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'in_process', 'approved', 'rejected', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'paused', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CURP', 'INE', 'PASSPORT', 'RFC');

-- CreateTable
CREATE TABLE "prospects" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "curp" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "gender" "Gender",
    "birth_date" TIMESTAMPTZ,
    "area_code" TEXT,
    "phone" TEXT NOT NULL,
    "plan_id" TEXT,
    "id_member" INTEGER,
    "id_branch" INTEGER,
    "branch_name" TEXT,
    "access_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_reason" TEXT,
    "document_type" "DocumentType" NOT NULL DEFAULT 'CURP',
    "document_number" TEXT,
    "document_id" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'prospect',
    "membership_status" TEXT,
    "payment_pending" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "prospect_id" UUID,
    "plan_id" TEXT,
    "mp_payment_id" TEXT,
    "mp_preference_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "status_detail" TEXT,
    "transaction_amount" BIGINT,
    "currency_id" TEXT NOT NULL DEFAULT 'MXN',
    "payment_method_id" TEXT,
    "payment_type_id" TEXT,
    "installments" INTEGER,
    "description" TEXT,
    "external_reference" TEXT,
    "card_last_four" TEXT,
    "cardholder_name" TEXT,
    "date_approved" TIMESTAMPTZ,
    "date_created" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_validation_logs" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_disposable" BOOLEAN NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "validation_context" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_validation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "prospect_id" UUID NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_description" TEXT,
    "mp_customer_id" TEXT,
    "mp_card_id" TEXT,
    "mp_preapproval_id" TEXT,
    "mp_preapproval_plan_id" TEXT,
    "recurrence_interval" TEXT,
    "transaction_amount" BIGINT,
    "currency_id" TEXT NOT NULL DEFAULT 'MXN',
    "start_date" TIMESTAMPTZ,
    "next_billing_date" TIMESTAMPTZ,
    "last_billing_date" TIMESTAMPTZ,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "payer_email" TEXT,
    "payer_first_name" TEXT,
    "payer_last_name" TEXT,
    "external_reference" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prospects_email_key" ON "prospects"("email");

-- CreateIndex
CREATE UNIQUE INDEX "prospects_curp_key" ON "prospects"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "prospects_phone_key" ON "prospects"("phone");

-- CreateIndex
CREATE INDEX "prospects_status_idx" ON "prospects"("status");

-- CreateIndex
CREATE INDEX "prospects_membership_status_idx" ON "prospects"("membership_status");

-- CreateIndex
CREATE INDEX "prospects_plan_id_idx" ON "prospects"("plan_id");

-- CreateIndex
CREATE INDEX "otp_requests_user_id_created_at_idx" ON "otp_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_expires_at_idx" ON "magic_links"("expires_at");

-- CreateIndex
CREATE INDEX "payments_prospect_id_idx" ON "payments"("prospect_id");

-- CreateIndex
CREATE INDEX "payments_mp_preference_id_idx" ON "payments"("mp_preference_id");

-- CreateIndex
CREATE INDEX "payments_mp_payment_id_idx" ON "payments"("mp_payment_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_date_created_idx" ON "payments"("date_created" DESC);

-- CreateIndex
CREATE INDEX "email_validation_logs_email_idx" ON "email_validation_logs"("email");

-- CreateIndex
CREATE INDEX "email_validation_logs_domain_idx" ON "email_validation_logs"("domain");

-- CreateIndex
CREATE INDEX "email_validation_logs_created_at_idx" ON "email_validation_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "subscriptions_prospect_id_idx" ON "subscriptions"("prospect_id");

-- CreateIndex
CREATE INDEX "subscriptions_mp_preapproval_id_idx" ON "subscriptions"("mp_preapproval_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_next_billing_date_idx" ON "subscriptions"("next_billing_date");

-- AddForeignKey
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: Add enhanced payment fields for MercadoPago
-- Created: 2026-03-31

-- Drop and recreate payments table with enhanced fields
DROP TABLE IF EXISTS `payments`;

CREATE TABLE `payments` (
    `id` text PRIMARY KEY NOT NULL,
    `prospect_id` text,
    `mp_payment_id` text,
    `mp_preference_id` text,
    `status` text,
    `status_detail` text,
    `transaction_amount` integer,
    `currency_id` text,
    `payment_method_id` text,
    `payment_type_id` text,
    `installments` integer,
    `description` text,
    `external_reference` text,
    `date_approved` integer,
    `date_created` integer,
    `created_at` integer,
    `updated_at` integer
);

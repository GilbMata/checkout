CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`mp_customer_id` text,
	`mp_card_id` text,
	`mp_preapproval_id` text,
	`plan_id` text NOT NULL,
	`plan_description` text,
	`mp_preapproval_plan_id` text,
	`recurrence_interval` text,
	`transaction_amount` integer,
	`currency_id` text DEFAULT 'MXN',
	`start_date` integer,
	`next_billing_date` integer,
	`last_billing_date` integer,
	`status` text NOT NULL,
	`payer_email` text,
	`payer_first_name` text,
	`payer_last_name` text,
	`external_reference` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_phone_unique` ON `prospects` (`phone`);
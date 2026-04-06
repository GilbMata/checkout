ALTER TABLE `payments` RENAME COLUMN "user_id" TO "prospect_id";--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `payments` ADD `mp_payment_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `mp_preference_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `status_detail` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `transaction_amount` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `currency_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `payment_method_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `payment_type_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `installments` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `description` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `external_reference` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `date_approved` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `date_created` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `updated_at` integer;
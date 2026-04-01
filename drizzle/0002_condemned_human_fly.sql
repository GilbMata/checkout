CREATE TABLE `email_validation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`domain` text NOT NULL,
	`is_disposable` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`validation_context` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`plan_id` text,
	`status` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`curp` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`genero` text,
	`birth_date` text,
	`area_code` text,
	`phone` text NOT NULL,
	`plan_id` text,
	`payment_pending` integer DEFAULT true,
	`is_member` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_email_unique` ON `prospects` (`email`);
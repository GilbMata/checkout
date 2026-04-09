PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`curp` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`gender` text,
	`birth_date` text,
	`area_code` text,
	`phone` text NOT NULL,
	`plan_id` text,
	`id_member` integer,
	`id_branch` integer,
	`branch_name` text,
	`access_blocked` integer DEFAULT false,
	`blocked_reason` text,
	`document_type` text,
	`document_number` text,
	`document_id` text,
	`status` text,
	`membership_status` text,
	`payment_pending` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_prospects`("id", "email", "curp", "first_name", "last_name", "gender", "birth_date", "area_code", "phone", "plan_id", "id_member", "id_branch", "branch_name", "access_blocked", "blocked_reason", "document_type", "document_number", "document_id", "status", "membership_status", "payment_pending", "created_at", "updated_at") SELECT "id", "email", "curp", "first_name", "last_name", "gender", "birth_date", "area_code", "phone", "plan_id", "id_member", "id_branch", "branch_name", "access_blocked", "blocked_reason", "document_type", "document_number", "document_id", "status", "membership_status", "payment_pending", "created_at", "updated_at" FROM `prospects`;--> statement-breakpoint
DROP TABLE `prospects`;--> statement-breakpoint
ALTER TABLE `__new_prospects` RENAME TO `prospects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_email_unique` ON `prospects` (`email`);
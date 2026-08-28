ALTER TABLE `users` ADD `secondary_position` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `roster_status` text DEFAULT 'not_requested' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `roster_requested_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `roster_reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `roster_reviewed_by` text;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` text;--> statement-breakpoint
CREATE INDEX `idx_users_roster_status` ON `users` (`roster_status`);
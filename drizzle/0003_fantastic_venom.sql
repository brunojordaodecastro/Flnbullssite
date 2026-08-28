CREATE TABLE `match_evaluation_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluation_id` text NOT NULL,
	`target_key` text NOT NULL,
	`rating` real NOT NULL,
	FOREIGN KEY (`evaluation_id`) REFERENCES `match_evaluations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_match_evaluation_ratings_eval_target` ON `match_evaluation_ratings` (`evaluation_id`,`target_key`);--> statement-breakpoint
CREATE TABLE `match_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`goals` integer DEFAULT 0 NOT NULL,
	`assists` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_match_evaluations_match_user` ON `match_evaluations` (`match_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `match_events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`minute` text NOT NULL,
	`type` text NOT NULL,
	`team` text NOT NULL,
	`player_name` text NOT NULL,
	`assist_player_name` text,
	`score_snapshot` text NOT NULL,
	`detail` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_match_events_match_id` ON `match_events` (`match_id`);--> statement-breakpoint
CREATE TABLE `match_lineups` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`jersey_number` integer NOT NULL,
	`position` text NOT NULL,
	`lineup_role` text NOT NULL,
	`x` integer DEFAULT 0 NOT NULL,
	`y` integer DEFAULT 0 NOT NULL,
	`goals` integer DEFAULT 0 NOT NULL,
	`assists` integer DEFAULT 0 NOT NULL,
	`rating` real,
	`slot_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_match_lineups_match_player` ON `match_lineups` (`match_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`match_date` text NOT NULL,
	`match_time` text,
	`home_name` text NOT NULL,
	`home_mark` text NOT NULL,
	`home_crest` text,
	`away_name` text NOT NULL,
	`away_mark` text NOT NULL,
	`away_crest` text,
	`score` text NOT NULL,
	`result` text NOT NULL,
	`link` text,
	`formation` text,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_matches_sort_order` ON `matches` (`sort_order`);
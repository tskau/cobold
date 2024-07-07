CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` integer NOT NULL,
	`url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`output` text,
	`attribution` integer DEFAULT 0 NOT NULL,
	`language` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`downloads` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_id_unique` ON `settings` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);
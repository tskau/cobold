CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`output` text,
	`attribution` integer DEFAULT 0 NOT NULL,
	`language` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);
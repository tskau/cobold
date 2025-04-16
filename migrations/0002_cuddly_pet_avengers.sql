ALTER TABLE settings ADD `video_format` text DEFAULT 'h264' NOT NULL;--> statement-breakpoint
ALTER TABLE settings ADD `video_quality` text DEFAULT '1080' NOT NULL;--> statement-breakpoint
ALTER TABLE settings ADD `audio_format` text DEFAULT 'mp3' NOT NULL;--> statement-breakpoint
ALTER TABLE settings ADD `audio_quality` text DEFAULT '128' NOT NULL;
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const requests = sqliteTable("requests", {
    id: text("id").notNull().primaryKey(),
    authorId: int("author_id").notNull(),
    url: text("url").notNull(),
})

export const users = sqliteTable("users", {
    id: int("id").notNull().primaryKey().unique(),
    downloadCount: int("downloads").default(0),
})

export const settings = sqliteTable("settings", {
    id: int("id").notNull().primaryKey().unique(),
    preferredOutput: text("output"),
    preferredAttribution: int("attribution").notNull().default(0),
    languageOverride: text("language"),
    instanceOverride: text("instance"),
    videoFormat: text("video_format").notNull().default("h264"),
    videoQuality: text("video_quality").notNull().default("1080"),
    audioFormat: text("audio_format").notNull().default("mp3"),
    audioQuality: text("audio_quality").notNull().default("128"),
})

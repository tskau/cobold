import { int, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const requests = sqliteTable("requests", {
    id: text("id").notNull().primaryKey(),
    authorId: int("author_id").notNull(),
    url: text("url").notNull(),
})

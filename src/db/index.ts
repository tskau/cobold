import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as schema from "#db/schema"

const sqlite = new Database("sqlite.db")
export const db = drizzle(sqlite, { schema })

migrate(db, { migrationsFolder: "migrations" })

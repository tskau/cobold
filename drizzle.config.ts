import { defineConfig } from "drizzle-kit"

export default defineConfig({
    out: "./migrations",
    schema: "./src/core/data/db/schema.ts",
    driver: "better-sqlite",
    dbCredentials: {
        url: "./sqlite.db",
    },
    verbose: true,
    strict: true,
})

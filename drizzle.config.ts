import { defineConfig } from "drizzle-kit"

export default defineConfig({
    out: "./migrations",
    schema: "./src/db/schema.ts",
    driver: "better-sqlite",
    dbCredentials: {
        url: "./sqlite.db",
    },
    verbose: true,
    strict: true,
})

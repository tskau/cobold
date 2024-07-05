import { config } from "dotenv"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

config()

export const env = createEnv({
    server: {
        API_ID: z.coerce.number(),
        API_HASH: z.string(),
        BOT_TOKEN: z.string(),
        API_BASE_URL: z.string()
            .default("https://api.cobalt.tools/api")
            .transform(s => s.split(";"))
            .pipe(z.array(z.string().url())),
        SELECT_TYPE_PHOTO_URL: z.string().url().default("https://i.otomir23.me/buckets/cobold/download.png"),
        ERROR_CHAT_ID: z.coerce.number().int().optional(),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: process.env,
})

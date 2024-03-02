import { config } from "dotenv"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

config()

export const env = createEnv({
    server: {
        BOT_TOKEN: z.string(),
        INLINE_FIX_CHAT_ID: z.coerce.number().int(),
        API_BASE_URL: z.string().url().default("https://co.wuk.sh/api"),
        SELECT_TYPE_PHOTO_URL: z.string().url().default("https://i.otomir23.me/buckets/cobold/download.png"),
        ERROR_CHAT_ID: z.coerce.number().int().optional(),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: process.env,
})

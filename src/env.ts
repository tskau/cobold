import { config } from "dotenv"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

config()

export const env = createEnv({
    server: {
        BOT_TOKEN: z.string(),
        API_BASE_URL: z.string().url().default("https://co.wuk.sh/api"),
        SELECT_TYPE_PHOTO_URL: z.string().url().default("https://i.otomir23.me/buckets/cobold/download.png"),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: process.env,
})

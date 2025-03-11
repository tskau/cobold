import process from "node:process"

import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import { z } from "zod"

import { apiServerSchema } from "@/core/data/cobalt"

config()

export const env = createEnv({
    server: {
        API_ID: z.coerce.number().int(),
        API_HASH: z.string(),
        BOT_TOKEN: z.string(),
        API_ENDPOINTS: z.string()
            .transform((data, ctx) => {
                try {
                    return JSON.parse(data)
                } catch (error) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Not parseable as JSON: ${String(error).replaceAll(/[\n\r]/g, "; ")}`,
                    })
                    return z.NEVER
                }
            })
            .pipe(z.array(apiServerSchema)),
        SELECT_TYPE_PHOTO_URL: z.string().url().default("https://i.otomir23.me/buckets/cobold/download.png"),
        ERROR_CHAT_ID: z.coerce.number().int().optional(),
        CUSTOM_INSTANCE_PROXY_URL: z.string().url().optional(),
    },
    emptyStringAsUndefined: true,
    runtimeEnv: process.env,
})

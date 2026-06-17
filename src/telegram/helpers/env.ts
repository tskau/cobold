import { loadEnvFile, env as runtimeEnv } from "node:process"

import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import { apiServerSchema } from "@/core/data/cobalt"

try {
    loadEnvFile()
} catch (e) {
    if (!(e instanceof Error) || !("code" in e) || e.code !== "ENOENT") {
        throw e
    }
}

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
        ERROR_CHAT_ID: z.coerce.number().int().optional(),
        CUSTOM_INSTANCE_PROXY_URL: z.string().url().optional(),
        ADDITIONAL_INFO: z.string().optional().default(""),
    },
    emptyStringAsUndefined: true,
    runtimeEnv,
})

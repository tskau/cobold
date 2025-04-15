import { z } from "zod"
import { urlWithAuthSchema } from "@/core/utils/url"

export const apiServerSchema = z.object({
    name: z.string().optional(),
    url: z.string().url(),
    auth: z.string().optional(),
    unsafe: z.boolean().optional(),
    proxy: z.string().url().optional(),
}).or(
    urlWithAuthSchema.transform(data => ({
        name: undefined,
        url: data.url,
        auth: data.auth,
        unsafe: undefined,
        proxy: undefined,
    })),
).transform(data => ({
    ...data,
    name: data.name ?? data.url,
}))

export type ApiServer = z.infer<typeof apiServerSchema>

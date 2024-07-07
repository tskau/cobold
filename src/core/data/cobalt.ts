import { z } from "zod"
import { Text, literal, translatable } from "#core/utils/text"
import { error, ok, Result } from "#core/utils/result"

const genericErrorSchema = z.object({
    status: z.literal("error"),
    text: z.string(),
})
export type GenericCobaltError = z.infer<typeof genericErrorSchema>

// Main

const mediaSuccessSchema = z.object({
    status: z.literal("success"),
    url: z.string().url(),
})

const mediaStreamSchema = z.object({
    status: z.literal("stream"),
    url: z.string().url(),
})

const mediaRedirectSchema = z.object({
    status: z.literal("redirect"),
    url: z.string().url(),
})

const mediaResponseSchema = z.discriminatedUnion("status", [
    mediaSuccessSchema,
    mediaStreamSchema,
    mediaRedirectSchema,
    genericErrorSchema,
])

export type CobaltMediaResponse = z.infer<typeof mediaResponseSchema>
export type SuccessfulCobaltMediaResponse = Exclude<CobaltMediaResponse, GenericCobaltError>

export const fetchMedia = async (
    { url, lang, apiBaseUrl, isAudioOnly = false }: {
        url: string,
        lang?: string,
        isAudioOnly?: boolean,
        apiBaseUrl: string,
    },
): Promise<Result<SuccessfulCobaltMediaResponse, Text>> => {
    const res = await fetch(`${apiBaseUrl}/json`, {
        method: "POST",
        headers: [
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
            ...lang ? [["Accept-Language", lang] satisfies [string, string]] : [],
        ],
        body: JSON.stringify({ url, isAudioOnly, filenamePattern: "basic", isNoTTWatermark: true }),
    })

    const body = await res.json().catch(() => null)
    const data = mediaResponseSchema.safeParse(body)
    if (!data.success) return error(translatable("error-invalid-response"))
    if (data.data.status === "error") return error(literal(data.data.text))

    return ok(data.data)
}

// Stream

export const fetchStream = async (url: string) => {
    const data = await fetch(url)

    if (!data.ok) {
        const error = await data.json().catch(() => null) as unknown
        const body = genericErrorSchema.safeParse(error)
        if (!body.success) {
            throw new Error(`streaming from ${new URL(url).host} failed`)
        }
        return body.data
    }

    const contentDisposition = data.headers.get("Content-Disposition")
    const match = contentDisposition && /.*filename="([^"]+)".*/.exec(contentDisposition)
    const filename = (match && match[1]) ?? undefined

    return {
        status: "success" as const,
        buffer: Buffer.from(await data.arrayBuffer()),
        filename,
    }
}

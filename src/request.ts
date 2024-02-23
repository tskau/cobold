import { z } from "zod"
import { env } from "#env"

const genericErrorSchema = z.object({
    status: z.literal("error"),
    text: z.string(),
})

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

export const fetchMedia = async (
    { url, lang, isAudioOnly = false }: { url: string, lang?: string, isAudioOnly?: boolean },
) => {
    const res = await fetch(`${env.API_BASE_URL}/json`, {
        method: "POST",
        headers: [
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
            ...lang ? [["Accept-Language", lang] satisfies [string, string]] : [],
        ],
        body: JSON.stringify({ url, isAudioOnly, filenamePattern: "basic", isNoTTWatermark: true }),
    }).then(r => r.json() as unknown)

    return mediaResponseSchema.parse(res)
}

// Stream

export const fetchStream = async (url: string) => {
    const data = await fetch(url)

    if (!data.ok) {
        const error = await data.json() as unknown
        return genericErrorSchema.parse(error)
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

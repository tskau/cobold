import { z } from "zod"
import { env } from "#env"
import { Text, literal, translatable, compound } from "#text"

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

type FailResponse = {
    status: "fail",
    fails: Text,
}

type FetchMediaResponse =
    Exclude<z.infer<typeof mediaResponseSchema>, z.infer<typeof genericErrorSchema>> | FailResponse
export const fetchMedia = async (
    { url, lang, isAudioOnly = false, fails = [] }: {
        url: string,
        lang?: string,
        isAudioOnly?: boolean,
        fails?: Text[],
    },
): Promise<FetchMediaResponse> => {
    if (fails.length >= env.API_BASE_URL.length)
        return {
            status: "fail",
            fails: compound(...fails),
        }

    const currentBaseUrl = env.API_BASE_URL[fails.length]
    const next = async (reason: Text) => await fetchMedia(
        { url, lang, isAudioOnly, fails: [...fails, compound(literal(`\n${currentBaseUrl} - `), reason)] },
    )

    const res = await fetch(`${currentBaseUrl}/json`, {
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
    if (!data.success) return next(translatable("error-invalid-response"))
    if (data.data.status === "error") return next(literal(data.data.text))

    return data.data
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

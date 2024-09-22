import { z } from "zod"
import { Text, translatable } from "#core/utils/text"
import { error, ok, Result } from "#core/utils/result"

const genericErrorSchema = z.object({
    status: z.literal("error"),
    error: z.object({
        code: z.string(),
    }),
})
export type GenericCobaltError = z.infer<typeof genericErrorSchema>

// Main

const mediaStreamSchema = z.object({
    status: z.literal("tunnel"),
    url: z.string().url(),
    filename: z.string(),
})

const mediaRedirectSchema = z.object({
    status: z.literal("redirect"),
    url: z.string().url(),
    filename: z.string(),
})

const mediaPickerSchema = z.object({
    status: z.literal("picker"),
    audio: z.string().url(),
})

const mediaResponseSchema = z.discriminatedUnion("status", [
    mediaStreamSchema,
    mediaRedirectSchema,
    mediaPickerSchema,
    genericErrorSchema,
])

export type CobaltMediaResponse = z.infer<typeof mediaResponseSchema>
export type SuccessfulCobaltMediaResponse = Exclude<CobaltMediaResponse, GenericCobaltError>

export const fetchMedia = async (
    { url, lang, apiBaseUrl, downloadMode = "auto" }: {
        url: string,
        lang?: string,
        downloadMode?: string,
        apiBaseUrl: string,
    },
): Promise<Result<SuccessfulCobaltMediaResponse, Text>> => {
    const res = await fetch(`${apiBaseUrl}`, {
        method: "POST",
        headers: [
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
            ["User-Agent", "cobold (+https://github.com/tskau/cobold)"],
            ...lang ? [["Accept-Language", lang] satisfies [string, string]] : [],
        ],
        body: JSON.stringify({ url, downloadMode, filenameStyle: "basic" }),
    })

    const body = await res.json().catch(() => null)

    const data = mediaResponseSchema.safeParse(body)
    if (!data.success)
        return error(translatable("error-invalid-response"))

    if (data.data.status === "error")
        return error(translatable(data.data.error.code))

    return ok(data.data)
}

// Stream

export const fetchStream = async (url: string) => {
    const data = await fetch(url, {
        headers: [
            ["User-Agent", "cobold (+https://github.com/tskau/cobold)"],
        ],
    })

    if (!data.ok) {
        const error = await data.json().catch(() => null) as unknown
        const body = genericErrorSchema.safeParse(error)
        if (!body.success) {
            throw new Error(`streaming from ${new URL(url).host} failed`)
        }
        return body.data
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    if (!buffer.length)
        throw new Error(`empty body from ${new URL(url).host}`)

    return {
        status: "success" as const,
        buffer,
    }
}

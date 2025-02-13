import { z } from "zod"

import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { compound, literal, translatable } from "@/core/utils/text"

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
    picker: z.array(z.object({
        type: z.union([z.literal("photo"), z.literal("video"), z.literal("gif")]),
        url: z.string().url(),
    })),
})

const mediaResponseSchema = z.discriminatedUnion("status", [
    mediaStreamSchema,
    mediaRedirectSchema,
    mediaPickerSchema,
    genericErrorSchema,
])

export type CobaltMediaResponse = z.infer<typeof mediaResponseSchema>
export type SuccessfulCobaltMediaResponse = Exclude<CobaltMediaResponse, GenericCobaltError>

const cobaltErrors = new Map([
    ["service.unsupported", "error-invalid-url"],
    ["service.disabled", "error-invalid-url"],
    ["link.invalid", "error-invalid-url"],
    ["link.unsupported", "error-invalid-url"],

    ["content.too_long", "error-too-large"],

    ["content.video.unavailable", "error-media-unavailable"],
    ["content.video.live", "error-media-unavailable"],
    ["content.video.private", "error-media-unavailable"],
    ["content.video.age", "error-media-unavailable"],
    ["content.video.region", "error-media-unavailable"],
    ["content.post.unavailable", "error-media-unavailable"],
    ["content.post.private", "error-media-unavailable"],
    ["content.post.age", "error-media-unavailable"],
].map(([k, v]) => [`error.api.${k}`, v]))

const stackHeaders = (...headers: ([string, string] | null | false | undefined)[]) => headers.filter((h): h is [string, string] => !!h)

const stackObjects = <T>(...objs: (T | null | false | undefined)[]) => objs.reduce(
    (p, c) => c ? ({ ...p, ...c }) : p,
    {},
)

export async function fetchMedia({ url, lang, apiBaseUrl, downloadMode = "auto", auth, youtubeHls }: {
    url: string,
    lang?: string,
    downloadMode?: string,
    apiBaseUrl: string,
    auth?: string,
    youtubeHls?: boolean,
}): Promise<Result<SuccessfulCobaltMediaResponse, Text>> {
    const res = await fetch(`${apiBaseUrl}`, {
        method: "POST",
        headers: stackHeaders(
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
            ["User-Agent", "cobold (+https://github.com/tskau/cobold)"],
            !!auth && ["Authorization", auth],
            !!lang && ["Accept-Language", lang],
        ),
        body: JSON.stringify(stackObjects(
            { url, downloadMode, filenameStyle: "basic" },
            youtubeHls && { youtubeHLS: true },
        )),
    }).catch(() => null)

    if (!res)
        return error(translatable("error-unresponsive"))
    const body = await res.json().catch(() => null)

    const data = mediaResponseSchema.safeParse(body)
    if (!data.success)
        return error(translatable("error-invalid-response"))

    if (data.data.status === "error") {
        const code = data.data.error.code
        const errorKey = cobaltErrors.get(code)
        if (errorKey)
            return error(translatable(errorKey))
        return error(compound(translatable("error-invalid-response"), literal(` [${code}]`)))
    }

    return ok(data.data)
}

// Stream

export async function fetchStream(url: string) {
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

    const buffer = await data.arrayBuffer()
    if (!buffer.byteLength)
        throw new Error(`empty body from ${new URL(url).host}`)

    return {
        status: "success" as const,
        buffer,
    }
}

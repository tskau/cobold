import { z } from "zod"
import { env } from "@/env"

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

export const fetchMedia = async (url: string, isAudioOnly: boolean = false) => {
    const res = await fetch(`${env.API_BASE_URL}/json`, {
        method: "POST",
        headers: [
            ["Accept", "application/json"],
            ["Content-Type", "application/json"],
        ],
        body: JSON.stringify({ url, isAudioOnly }),
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

    return {
        status: "success" as const,
        buffer: Buffer.from(await data.arrayBuffer()),
    }
}

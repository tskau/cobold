import { z } from "zod"

import { baseFetch } from "@/core/data/cobalt/common"
import type { GenericCobaltError } from "@/core/data/cobalt/error"
import { genericErrorSchema, getErrorText } from "@/core/data/cobalt/error"

import { merge, stack } from "@/core/utils/compose"

import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"

import type { Text } from "@/core/utils/text"
import { translatable } from "@/core/utils/text"

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

const ffetch = baseFetch.extend({
    headers: [
        ["Accept", "application/json"],
        ["Content-Type", "application/json"],
    ],
})

export async function startDownload({ url, lang, apiBaseUrl, downloadMode = "auto", auth, youtubeHls, proxy }: {
    url: string,
    lang?: string,
    downloadMode?: string,
    apiBaseUrl: string,
    auth?: string,
    youtubeHls?: boolean,
    proxy?: string,
}): Promise<Result<SuccessfulCobaltMediaResponse, Text>> {
    const res = await ffetch("/", {
        method: "POST",
        headers: stack<[string, string]>(
            !!auth && ["Authorization", auth],
            !!lang && ["Accept-Language", lang],
        ),
        json: merge(
            { url, downloadMode, filenameStyle: "basic" },
            youtubeHls && { youtubeHLS: true },
        ),
        baseUrl: apiBaseUrl,
        proxy: proxy || undefined,
    })
        .safelyParsedJson(mediaResponseSchema)
        .catch((e) => {
            console.log(e)
            return null
        })

    if (!res)
        return error(translatable("error-unresponsive"))
    if (!res.success)
        return error(translatable("error-invalid-response"))

    if (res.data.status === "error")
        return error(getErrorText(res.data.error.code))

    return ok(res.data)
}

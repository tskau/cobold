import { z } from "zod"

import { baseFetch } from "@/core/data/cobalt/common"
import type { GenericCobaltError } from "@/core/data/cobalt/error"
import { genericErrorSchema, getErrorText } from "@/core/data/cobalt/error"

import type { ApiServer } from "@/core/data/cobalt/server"

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
    audio: z.string().url().optional(),
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

export type CobaltDownloadParams = {
    url: string,
    videoQuality?: string,
    audioFormat?: string,
    audioBitrate?: string,
    filenameStyle?: string,
    downloadMode?: string,
    youtubeHls?: boolean,
    youtubeVideoCodec?: string,
    youtubeDubLang?: string,
    alwaysProxy?: boolean,
    disableMetadata?: boolean,
    tiktokFullAudio?: boolean,
    tiktokH265?: boolean,
    twitterGif?: boolean,
}

export async function getDownloadLink(
    params: CobaltDownloadParams,
    api: ApiServer,
): Promise<Result<SuccessfulCobaltMediaResponse, Text>> {
    const res = await baseFetch.post("/", {
        headers: api.auth ? [["Authorization", api.auth]] : undefined,
        json: params,
        baseUrl: api.url,
        proxy: api.proxy || undefined,
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

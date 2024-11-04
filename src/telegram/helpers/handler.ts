import type { InputMediaLike, Peer } from "@mtcute/node"
import type { GeneralTrack, ImageTrack, VideoTrack } from "mediainfo.js"

import { CallbackDataBuilder } from "@mtcute/dispatcher"
import mediaInfoFactory from "mediainfo.js"

import type { MediaRequest } from "@/core/data/request"
import { finishRequest, outputOptions } from "@/core/data/request"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { translatable } from "@/core/utils/text"
import { env } from "@/telegram/helpers/env"
import { getPeerLocale } from "@/telegram/helpers/i18n"

export const OutputButton = new CallbackDataBuilder("dl", "output", "request")
export const getOutputSelectionMessage = (requestId: string) => ({
    image: env.SELECT_TYPE_PHOTO_URL,
    caption: translatable("type-select-title"),
    options: outputOptions.map(option => ({
        key: OutputButton.build({ request: requestId, output: option }),
        name: translatable(`setting-output-${option}`),
    })),
})

type AnalysisResult = {
    duration?: number,
    width?: number,
    height?: number,
    type: "video" | "audio" | "document",
}
async function analyze(buffer: ArrayBuffer): Promise<AnalysisResult> {
    const mediainfo = await mediaInfoFactory()
    const res = await mediainfo.analyzeData(
        buffer.byteLength,
        (size, offset) => new Uint8Array(buffer.slice(offset, offset + size)),
    )
    if (!res.media)
        return { type: "document" }
    const generalData = res.media.track.find((t): t is GeneralTrack => t["@type"] === "General")
    if (!generalData)
        return { type: "document" }

    if (generalData.VideoCount) {
        const videoData = res.media.track.find((t): t is VideoTrack => t["@type"] === "Video")!
        if (!videoData)
            return { type: "document" }
        return {
            type: "video",
            duration: generalData.Duration,
            width: videoData.Width,
            height: videoData.Height,
        }
    }

    if (generalData.AudioCount) {
        return {
            type: "audio",
            duration: generalData.Duration,
        }
    }

    if (generalData.ImageCount) {
        const imageData = res.media.track.find((t): t is ImageTrack => t["@type"] === "Image")
        if (!imageData)
            return { type: "document" }
        return {
            type: "document",
            width: imageData.Width,
            height: imageData.Height,
        }
    }

    return { type: "document" }
}

export async function handleMediaDownload(outputType: string, request: MediaRequest | undefined, peer: Peer): Promise<Result<InputMediaLike, Text>> {
    if (!request)
        return error(translatable("error-request-not-found"))
    const res = await finishRequest(outputType, request, env.API_ENDPOINTS, await getPeerLocale(peer))
    if (!res.success)
        return res

    const analyzedData = await analyze(res.result.file)
    return ok({
        ...analyzedData,
        fileName: res.result.fileName,
        file: new Uint8Array(res.result.file),
    })
}

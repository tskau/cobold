import type { InputMediaLike, Peer } from "@mtcute/node"
import type { GeneralTrack, ImageTrack, VideoTrack } from "mediainfo.js"

import { CallbackDataBuilder } from "@mtcute/dispatcher"
import mediaInfoFactory from "mediainfo.js"

import type { ApiServer, CobaltDownloadParams } from "@/core/data/cobalt"
import type { DownloadedMediaContent } from "@/core/data/cobalt/tunnel"
import type { MediaRequest } from "@/core/data/request"
import { finishRequest, outputOptions } from "@/core/data/request"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { translatable } from "@/core/utils/text"
import { urlWithAuthSchema } from "@/core/utils/url"
import { env } from "@/telegram/helpers/env"
import { getPeerSettings } from "@/telegram/helpers/settings"

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
    type: "video" | "audio" | "photo" | "document",
    isAnimated?: boolean,
}
async function analyze(buffer: DownloadedMediaContent): Promise<AnalysisResult> {
    const mediainfo = await mediaInfoFactory()
    const res = await mediainfo.analyzeData(
        buffer.byteLength,
        (size, offset) => buffer.slice(offset, offset + size),
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
        if (imageData.Format === "GIF") {
            return {
                type: "video",
                duration: generalData.Duration,
                width: imageData.Width,
                height: imageData.Height,
                isAnimated: true,
            }
        }
        return {
            type: "photo",
            width: imageData.Width,
            height: imageData.Height,
        }
    }

    return { type: "document" }
}

async function fileToInputMedia(file: DownloadedMediaContent, fileName?: string): Promise<InputMediaLike> {
    const analyzedData = await analyze(file)
    // FIXME: hack around mtcute limitation, a better solution should be implemented
    const fixedFilename = fileName?.endsWith(".jpeg") ? `${fileName.slice(0, -5)}.jpg` : fileName
    return {
        ...analyzedData,
        fileName: fixedFilename,
        file,
    }
}

export async function handleMediaDownload(outputType: string, request: MediaRequest | undefined, peer: Peer): Promise<Result<InputMediaLike[], Text>> {
    if (!request)
        return error(translatable("error-request-not-found"))
    const settings = await getPeerSettings(peer)
    const endpoints: ApiServer[] = settings.instanceOverride
        ? [{ name: "custom", ...urlWithAuthSchema.parse(settings.instanceOverride), unsafe: true, proxy: env.CUSTOM_INSTANCE_PROXY_URL }]
        : env.API_ENDPOINTS
    const params: Omit<CobaltDownloadParams, "url"> = {
        downloadMode: outputType,
        filenameStyle: "basic",
        youtubeVideoCodec: settings.videoFormat === "h265" ? "h264" : settings.videoFormat,
        allowH265: settings.videoFormat === "h265",
        videoQuality: settings.videoQuality,
        audioFormat: settings.audioFormat,
        audioBitrate: settings.audioQuality,
    }
    const res = await finishRequest(request, params, endpoints)
    if (!res.success)
        return res

    const attachments = await Promise.all(res.result.map(f => fileToInputMedia(f.file, f.filename)))
    return ok(attachments)
}

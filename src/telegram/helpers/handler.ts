import type { InputMediaLike, Peer } from "@mtcute/node"
import type { GeneralTrack, ImageTrack, VideoTrack } from "mediainfo.js"

import { CallbackDataBuilder } from "@mtcute/dispatcher"
import mediaInfoFactory from "mediainfo.js"

import type { ApiServer } from "@/core/data/cobalt"
import type { MediaRequest } from "@/core/data/request"
import { finishRequest, outputOptions } from "@/core/data/request"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { translatable } from "@/core/utils/text"
import { urlWithAuthSchema } from "@/core/utils/url"
import { env } from "@/telegram/helpers/env"
import { getPeerLocale } from "@/telegram/helpers/i18n"
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
            type: "photo",
            width: imageData.Width,
            height: imageData.Height,
        }
    }

    return { type: "document" }
}

async function fileToInputMedia(file: ArrayBuffer, fileName?: string): Promise<InputMediaLike> {
    const analyzedData = await analyze(file)
    // FIXME: hack around mtcute limitation, a better solution should be implemented
    const fixedFilename = fileName?.endsWith(".jpeg") ? `${fileName.slice(0, -5)}.jpg` : fileName
    return {
        ...analyzedData,
        fileName: fixedFilename,
        file: new Uint8Array(file),
    }
}

export async function handleMediaDownload(outputType: string, request: MediaRequest | undefined, peer: Peer): Promise<Result<InputMediaLike | InputMediaLike[], Text>> {
    if (!request)
        return error(translatable("error-request-not-found"))
    const settings = await getPeerSettings(peer)
    const locale = settings.languageOverride ?? getPeerLocale(peer)
    const endpoints: ApiServer[] = settings.instanceOverride
        ? [{ name: "custom", ...urlWithAuthSchema.parse(settings.instanceOverride), unsafe: true, proxy: env.CUSTOM_INSTANCE_PROXY_URL }]
        : env.API_ENDPOINTS
    const res = await finishRequest(outputType, request, endpoints, locale)
    if (!res.success)
        return res

    if (res.result.type === "multiple") {
        const attachments = await Promise.all(res.result.files.map(f => fileToInputMedia(f)))
        return ok(attachments)
    }

    const media = await fileToInputMedia(res.result.file, res.result.fileName)
    return ok(media)
}

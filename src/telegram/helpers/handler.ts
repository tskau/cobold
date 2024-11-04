import { ok, error, Result } from "#core/utils/result"
import { Text, translatable } from "#core/utils/text"
import { env } from "#telegram/helpers/env"
import type { InputMediaLike, Peer } from "@mtcute/node"
import mime from "mime-types"
import { CallbackDataBuilder } from "@mtcute/dispatcher"
import { finishRequest, MediaRequest, outputOptions } from "#core/data/request"
import { getPeerLocale } from "#telegram/helpers/i18n"

export const OutputButton = new CallbackDataBuilder("dl", "output", "request")
export const getOutputSelectionMessage = (requestId: string) => ({
    image: env.SELECT_TYPE_PHOTO_URL,
    caption: translatable("type-select-title"),
    options: outputOptions.map(option => ({
        key: OutputButton.build({ request: requestId, output: option }),
        name: translatable(`setting-output-${option}`),
    })),
})

const getTelegramFileType = (filename?: string) => {
    if (!filename) return "document"

    const mimeType = mime.lookup(filename)
    if (!mimeType) return "document"

    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    return "document"
}

export const handleMediaDownload = async (
    outputType: string,
    request: MediaRequest | undefined,
    peer: Peer,
): Promise<Result<InputMediaLike, Text>> => {
    if (!request) return error(translatable("error-request-not-found"))
    const res = await finishRequest(outputType, request, env.API_ENDPOINTS, await getPeerLocale(peer))
    if (!res.success) return res

    return ok({
        ...res.result,
        type: getTelegramFileType(res.result.fileName),
    })
}

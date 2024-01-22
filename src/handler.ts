import { z } from "zod"
import { fetchMedia, fetchStream } from "#request"
import { ok, error, Result } from "#result"
import { literal, Text, translatable } from "#text"
import { env } from "#env"
import { randomUUID } from "node:crypto"
import { InlineKeyboardMarkup, InputMedia } from "grammy/types"
import { InputFile } from "grammy"

type MediaRequest = {
    id: string,
    author: number,
    url: string,
}

const mediaRequests: MediaRequest[] = []
const mediaUrlSchema = z.string().url()
const mediaOutputTypes = ["video", "audio", "document"] as const
const validMediaOutputType = (input: string): input is typeof mediaOutputTypes[number] =>
    mediaOutputTypes.includes(input as typeof mediaOutputTypes[number])

type HandleMediaRequestReturn = {
    id: string,
    image: string,
    caption: Text,
    replyMarkup: InlineKeyboardMarkup,
}

export const handleMediaRequest = async (
    userInput: string,
    author: number,
): Promise<Result<HandleMediaRequestReturn, Text>> => {
    const url = mediaUrlSchema.safeParse(userInput)
    if (!url.success) return error(translatable("error-not-url"))

    const id = randomUUID()
    mediaRequests.push({
        id,
        author,
        url: url.data,
    })

    return ok({
        id,
        image: env.SELECT_TYPE_PHOTO_URL,
        caption: translatable("type-select-title"),
        replyMarkup: {
            inline_keyboard: [
                mediaOutputTypes.map(type => (
                    { text: type, callback_data: `${type}:${id}` }
                )),
            ],
        },
    })
}

export const canInteract = (requestId: string, author: number) => {
    const req = mediaRequests.find(r => r.id === requestId)
    return !req || req.author === author
}

export const handleMediaDownload = async (
    outputType: string,
    requestId: string,
    lang?: string,
): Promise<Result<InputMedia, Text>> => {
    if (!validMediaOutputType(outputType)) return error(translatable("error-unknown-type"))

    const url = mediaRequests.find(r => r.id === requestId)
    if (!url) return error(translatable("error-request-not-found"))

    const res = await fetchMedia({
        url: url.url,
        isAudioOnly: outputType === "audio",
        lang,
    })
    if (res.status === "error") return error(literal(res.text))

    if (res.status === "stream") {
        const data = await fetchStream(res.url)
        if (data.status === "error") return error(literal(data.text))

        return ok({
            type: outputType,
            media: new InputFile(data.buffer, data.filename),
        })
    }

    const source = new URL(res.url)
    return ok({
        type: outputType,
        media: new InputFile(source),
    })
}

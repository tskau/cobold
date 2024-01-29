import { z } from "zod"
import { fetchMedia, fetchStream } from "#request"
import { ok, error, Result } from "#result"
import { literal, Text, translatable } from "#text"
import { env } from "#env"
import { randomUUID } from "node:crypto"
import { InputMedia } from "grammy/types"
import { InputFile } from "grammy"
import mime from "mime-types"

type MediaRequest = {
    id: string,
    author: number,
    url: string,
}

const mediaRequests: MediaRequest[] = []
const mediaUrlSchema = z.string().url()

type HandleMediaRequestReturn = {
    id: string,
    image: string,
    caption: Text,
    options: { name: Text, key: string }[],
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
        options: ["auto", "audio"].map(option => ({
            key: `${option}:${id}`,
            name: translatable(`output-${option}`),
        })),
    })
}

export const canInteract = (requestId: string, author: number) => {
    const req = mediaRequests.find(r => r.id === requestId)
    return !req || req.author === author
}

const getFileType = (filename?: string) => {
    if (!filename) return "document"

    const mimeType = mime.lookup(filename)
    if (!mimeType) return "document"

    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    return "document"
}

export const handleMediaDownload = async (
    outputType: string,
    requestId: string,
    lang?: string,
): Promise<Result<InputMedia, Text>> => {
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
            type: getFileType(data.filename),
            media: new InputFile(data.buffer, data.filename),
        })
    }

    const source = new URL(res.url)
    return ok({
        type: getFileType(source.pathname.split("/").at(-1)),
        media: new InputFile(source),
    })
}

import { z } from "zod"
import { fetchMedia, fetchStream } from "#request"
import { ok, error, Result } from "#result"
import { literal, Text, translatable } from "#text"
import { env } from "#env"
import { randomUUID } from "node:crypto"
import { InputMedia } from "grammy/types"
import { InputFile } from "grammy"
import mime from "mime-types"
import { db } from "#db"
import { requests } from "#db/schema"
import { eq, InferSelectModel } from "drizzle-orm"

const mediaUrlSchema = z.string().url()

type HandleMediaRequestReturn = {
    id: string,
    image: string,
    caption: Text,
    options: { name: Text, key: string }[],
}

export const handleMediaRequest = async (
    userInput: string,
    authorId: number,
): Promise<Result<HandleMediaRequestReturn, Text>> => {
    const url = mediaUrlSchema.safeParse(userInput)
    if (!url.success) return error(translatable("error-not-url"))

    const id = randomUUID()
    await db
        .insert(requests)
        .values({
            id,
            authorId,
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

export const getRequest = (requestId: string) => db.query.requests.findFirst({ where: eq(requests.id, requestId) })

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
    request: InferSelectModel<typeof requests> | undefined,
    lang?: string,
): Promise<Result<InputMedia, Text>> => {
    if (!request) return error(translatable("error-request-not-found"))
    await db.delete(requests).where(eq(requests.id, request.id))

    const res = await fetchMedia({
        url: request.url,
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

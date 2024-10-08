import { z } from "zod"
import { eq, InferSelectModel } from "drizzle-orm"
import { requests } from "#core/data/db/schema"
import { error, ok, Result } from "#core/utils/result"
import { compound, CompoundText, literal, Text, translatable } from "#core/utils/text"
import { randomUUID } from "node:crypto"
import { db } from "#core/data/db/database"
import { fetchMedia, fetchStream, SuccessfulCobaltMediaResponse } from "#core/data/cobalt"

const mediaUrlSchema = z.string().url()
const tryParseUrl = (url: string) => {
    const originalParsed = mediaUrlSchema.safeParse(url)
    if (originalParsed.success) return originalParsed.data

    const domain = url.split("/")[0]
    if (!domain.includes(".") || domain.includes(" ") || domain.includes(":")) return null

    const withHttpsParsed = mediaUrlSchema.safeParse(`https://${url}`)
    if (withHttpsParsed.success) return withHttpsParsed.data

    return null
}

export type MediaRequest = InferSelectModel<typeof requests>

export const createRequest = async (
    userInput: string,
    authorId: number,
): Promise<Result<MediaRequest, Text>> => {
    const url = tryParseUrl(userInput)
    if (!url) return error(translatable("error-not-url"))

    const id = randomUUID()
    const req = {
        id,
        authorId,
        url,
    }
    await db
        .insert(requests)
        .values(req)

    return ok(req)
}

export const getRequest = (requestId: string) => db.query.requests.findFirst({ where: eq(requests.id, requestId) })

export type OutputMedia = { fileName?: string, file: Buffer | URL }
export const outputOptions = ["auto", "audio"]
export const finishRequest = async (
    outputType: string,
    request: MediaRequest,
    baseApiUrlPool: string[],
    lang?: string,
): Promise<Result<OutputMedia, Text>> => {
    await db.delete(requests).where(eq(requests.id, request.id))

    const res = await tryDownload(outputType, request, baseApiUrlPool, lang)
    if (!res.success) return res

    if (res.result.status === "stream") {
        const data = await fetchStream(res.result.url)
        if (data.status === "error") return error(literal(data.text))

        return ok({
            file: data.buffer,
            fileName: data.filename,
        })
    }

    if (res.result.status === "picker") {
        if (outputType !== "audio")
            return error(translatable("error-picker"))
        const source = new URL(res.result.audio)
        return ok({
            fileName: source.pathname.split("/").at(-1),
            file: source,
        })
    }

    const source = new URL(res.result.url)
    return ok({
        fileName: source.pathname.split("/").at(-1),
        file: source,
    })
}

const tryDownload = async (
    outputType: string,
    request: MediaRequest,
    baseApiUrlPool: string[],
    lang?: string,
    fails: Text[] = [],
): Promise<Result<SuccessfulCobaltMediaResponse, CompoundText>> => {
    const currentBaseApiUrl = baseApiUrlPool.at(0)
    if (!currentBaseApiUrl)
        return error(compound(...fails))

    const res = await fetchMedia({
        url: request.url,
        isAudioOnly: outputType === "audio",
        lang,
        apiBaseUrl: baseApiUrlPool[0],
    })

    if (!res.success)
        return tryDownload(
            outputType,
            request,
            baseApiUrlPool.slice(1),
            lang,
            [...fails, compound(literal(`\n${currentBaseApiUrl}: `), res.error)],
        )

    return res
}

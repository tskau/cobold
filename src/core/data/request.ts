import type { InferSelectModel } from "drizzle-orm"

import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"

import type { SuccessfulCobaltMediaResponse } from "@/core/data/cobalt"
import { fetchMedia, fetchStream } from "@/core/data/cobalt"
import { db } from "@/core/data/db/database"
import { requests } from "@/core/data/db/schema"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { CompoundText, Text } from "@/core/utils/text"
import { compound, literal, translatable } from "@/core/utils/text"

export const apiServerSchema = z.object({
    name: z.string().optional(),
    url: z.string().url(),
    auth: z.string().optional(),
    youtubeHls: z.boolean().optional(),
}).or(
    z.string().url().transform(data => ({
        name: undefined,
        url: data,
        auth: undefined,
        youtubeHls: undefined,
    })),
).transform(data => ({
    ...data,
    name: data.name ?? data.url,
}))

export type ApiServer = z.infer<typeof apiServerSchema>

const mediaUrlSchema = z.string().url()
function tryParseUrl(url: string) {
    const originalParsed = mediaUrlSchema.safeParse(url)
    if (originalParsed.success)
        return originalParsed.data

    const domain = url.split("/")[0]
    if (!domain.includes(".") || domain.includes(" ") || domain.includes(":"))
        return null

    const withHttpsParsed = mediaUrlSchema.safeParse(`https://${url}`)
    if (withHttpsParsed.success)
        return withHttpsParsed.data

    return null
}

export type MediaRequest = InferSelectModel<typeof requests>

export async function createRequest(userInput: string, authorId: number): Promise<Result<MediaRequest, Text>> {
    const url = tryParseUrl(userInput)
    if (!url)
        return error(translatable("error-not-url"))

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

const retrieveMedia = async (url: string) => fetch(url).then(r => r.arrayBuffer())

export type OutputMedia = { fileName?: string, file: ArrayBuffer }
export const outputOptions = ["auto", "audio"]
export async function finishRequest(outputType: string, request: MediaRequest, apiPool: ApiServer[], lang?: string): Promise<Result<OutputMedia, Text>> {
    await db.delete(requests).where(eq(requests.id, request.id))

    const res = await tryDownload(outputType, request, apiPool, lang)
    if (!res.success)
        return res

    if (res.result.status === "tunnel") {
        const data = await fetchStream(res.result.url)
        if (data.status === "error")
            return error(translatable(data.error.code))

        return ok({
            file: data.buffer,
            fileName: res.result.filename,
        })
    }

    if (res.result.status === "picker") {
        if (outputType === "audio") {
            const source = new URL(res.result.audio)
            const buffer = await retrieveMedia(source.href)
            return ok({
                fileName: source.pathname.split("/").at(-1),
                file: buffer,
            })
        }
        if (res.result.picker.length !== 1)
            return error(translatable("error-picker"))
        const file = res.result.picker[0]
        const source = new URL(file.url)
        const buffer = await retrieveMedia(source.href)
        return ok({
            fileName: source.pathname.split("/").at(-1),
            file: buffer,
        })
    }

    const buffer = await retrieveMedia(res.result.url)
    return ok({
        fileName: res.result.filename,
        file: buffer,
    })
}

async function tryDownload(outputType: string, request: MediaRequest, apiPool: ApiServer[], lang?: string, fails: Text[] = []): Promise<Result<SuccessfulCobaltMediaResponse, CompoundText>> {
    const currentApi = apiPool.at(0)
    if (!currentApi)
        return error(compound(...fails))

    const res = await fetchMedia({
        url: request.url,
        downloadMode: outputType,
        lang,
        apiBaseUrl: currentApi.url,
        auth: currentApi.auth,
        youtubeHls: currentApi.youtubeHls,
    })

    if (!res.success) {
        return tryDownload(
            outputType,
            request,
            apiPool.slice(1),
            lang,
            [...fails, compound(literal(`\n${currentApi.name}: `), res.error)],
        )
    }

    return res
}

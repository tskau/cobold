import type { InferSelectModel } from "drizzle-orm"

import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { z } from "zod"

import type { ApiServer, SuccessfulCobaltMediaResponse } from "@/core/data/cobalt"
import { retrieveExternalMedia, retrieveTunneledMedia, startDownload } from "@/core/data/cobalt"

import { db } from "@/core/data/db/database"
import { requests } from "@/core/data/db/schema"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { CompoundText, Text } from "@/core/utils/text"
import { compound, literal, translatable } from "@/core/utils/text"
import { safeUrlSchema } from "@/core/utils/url"

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

export type OutputMedia = { type: "single", fileName?: string, file: ArrayBuffer } | { type: "multiple", files: ArrayBuffer[] }
export const outputOptions = ["auto", "audio"]
export async function finishRequest(outputType: string, request: MediaRequest, apiPool: ApiServer[], lang?: string): Promise<Result<OutputMedia, Text>> {
    await db.delete(requests).where(eq(requests.id, request.id))

    const res = await tryDownload(outputType, request, apiPool, lang)
    if (!res.success)
        return res

    if (res.result.status === "tunnel") {
        const data = await retrieveTunneledMedia(res.result.url, res.result.api.proxy)
        if (data.status === "error")
            return error(translatable(data.error.code))

        return ok({
            type: "single",
            file: data.buffer,
            fileName: res.result.filename,
        })
    }

    if (res.result.status === "picker") {
        if (outputType === "audio") {
            const source = new URL(res.result.audio)
            const buffer = await retrieveExternalMedia(source.href)
            return ok({
                type: "single",
                fileName: source.pathname.split("/").at(-1),
                file: buffer,
            })
        }
        if (res.result.picker.length !== 1) {
            const files = await Promise.all(res.result.picker.map(i => retrieveExternalMedia(i.url)))
            return ok({
                type: "multiple",
                files,
            })
        }
        const file = res.result.picker[0]
        const source = new URL(file.url)
        const buffer = await retrieveExternalMedia(source.href, res.result.api.proxy)
        return ok({
            type: "single",
            fileName: source.pathname.split("/").at(-1),
            file: buffer,
        })
    }

    const buffer = await retrieveExternalMedia(res.result.url, res.result.api.proxy)
    return ok({
        type: "single",
        fileName: res.result.filename,
        file: buffer,
    })
}

async function tryDownload(outputType: string, request: MediaRequest, apiPool: ApiServer[], lang?: string, fails: Text[] = []): Promise<Result<SuccessfulCobaltMediaResponse & { api: ApiServer }, CompoundText>> {
    const currentApi = apiPool.at(0)
    if (!currentApi)
        return error(compound(...fails))

    if (currentApi.unsafe && !(await safeUrlSchema.safeParseAsync(currentApi.url)).success) {
        return tryDownload(
            outputType,
            request,
            apiPool.slice(1),
            lang,
            [...fails, compound(literal(`\n${currentApi.name}: `), translatable("error-invalid-custom-instance"))],
        )
    }

    const res = await startDownload({
        url: request.url,
        downloadMode: outputType,
        lang,
        apiBaseUrl: currentApi.url,
        auth: currentApi.auth,
        youtubeHls: currentApi.youtubeHls,
        proxy: currentApi.proxy,
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

    if (currentApi.unsafe) {
        if (
            (res.result.status === "picker" && !(await safeUrlSchema.safeParseAsync(res.result.audio)).success)
            || (res.result.status === "tunnel" && !(await safeUrlSchema.safeParseAsync(res.result.url)).success)
            || (res.result.status === "redirect" && !(await safeUrlSchema.safeParseAsync(res.result.url)).success)
        ) {
            return tryDownload(
                outputType,
                request,
                apiPool.slice(1),
                lang,
                [...fails, literal(`\n${currentApi.name}: unsafe api response`)],
            )
        }
    }

    return { success: res.success, result: { ...res.result, api: currentApi } }
}

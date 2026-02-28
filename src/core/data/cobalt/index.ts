import { isDeepStrictEqual } from "node:util"

import type { CobaltDownloadParams, SuccessfulCobaltMediaResponse } from "@/core/data/cobalt/download"
import { getDownloadLink } from "@/core/data/cobalt/download"
import type { ApiServer } from "@/core/data/cobalt/server"
import type { DownloadedMediaContent } from "@/core/data/cobalt/tunnel"
import { retrieveTunneledMedia } from "@/core/data/cobalt/tunnel"

import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { compound, literal, translatable } from "@/core/utils/text"
import { safeUrlSchema } from "@/core/utils/url"

export { type CobaltDownloadParams } from "@/core/data/cobalt/download"
export { type ApiServer, apiServerSchema } from "@/core/data/cobalt/server"

export async function download(params: CobaltDownloadParams, apiPool: ApiServer[]): Promise<Result<DownloadedMedia[], Text>> {
    return await tryDownload(params, apiPool)
}

export type DownloadedMedia = { file: DownloadedMediaContent, filename?: string }
async function downloadResolvedMedia(link: ResolvedMedia, api: ApiServer): Promise<Result<DownloadedMedia, Text>> {
    if (api.unsafe && !(await safeUrlSchema.safeParseAsync(link.url)).success)
        return error(literal("unsafe url"))
    const file = await retrieveTunneledMedia(link.url, api.proxy)
    if (!file.success)
        return file
    return ok({
        file: file.result,
        filename: link.filename,
    })
}

type ResolvedMedia = { url: string, filename?: string }
function resolveMedia(link: SuccessfulCobaltMediaResponse, audio?: boolean): ResolvedMedia[] {
    if (link.status === "picker") {
        if (audio && link.audio) {
            const source = new URL(link.audio)
            return [{ url: link.audio, filename: source.pathname.split("/").at(-1) }]
        }
        return link.picker.map(p => ({ url: p.url, filename: new URL(p.url).pathname.split("/").at(-1) }))
    }
    return [{ url: link.url, filename: link.filename }]
}

type DownloadFailure = { reason: Text, api: ApiServer }
function formatDownloadFailures(fails: DownloadFailure[]): Text {
    const mergedFails = fails.reduce((acc, fail) => {
        const existing = acc.find(f => isDeepStrictEqual(f.reason, fail.reason))
        if (existing) {
            existing.apis.push(fail.api)
        } else {
            acc.push({ reason: fail.reason, apis: [fail.api] })
        }
        return acc
    }, [] as { reason: Text, apis: ApiServer[] }[])
    return compound(...mergedFails.map(f => compound(
        literal("\n"),
        ...f.apis.map((api, i) => literal((i === 0 ? "" : ", ") + api.name)),
        literal(": "),
        f.reason,
    )))
}

async function tryDownload(params: CobaltDownloadParams, apiPool: ApiServer[], fails: DownloadFailure[] = []): Promise<Result<DownloadedMedia[], Text>> {
    const currentApi = apiPool.at(0)
    if (!currentApi)
        return error(formatDownloadFailures(fails))

    const next = (reason: Text) =>
        tryDownload(
            params,
            apiPool.slice(1),
            [...fails, { reason, api: currentApi }],
        )

    if (currentApi.unsafe && !(await safeUrlSchema.safeParseAsync(currentApi.url)).success)
        return next(translatable("error-invalid-custom-instance"))

    const res = await getDownloadLink(params, currentApi)

    if (!res.success)
        return next(res.error)

    const resolvedMedia = resolveMedia(res.result, params.downloadMode === "audio")
    const downloadedMedia = await Promise.all(
        resolvedMedia.map(m => downloadResolvedMedia(m, currentApi)),
    )

    const successfulDownloads = downloadedMedia
        .filter(m => m.success)
        .map(m => m.result)
    const failedDownloads = downloadedMedia
        .filter(m => !m.success)
        .map(m => m.error)
    if (successfulDownloads.length === 0) {
        if (failedDownloads.length === 1)
            return next(failedDownloads[0])
        return next(compound(...failedDownloads))
    }
    return ok(successfulDownloads)
}

import type { InferSelectModel } from "drizzle-orm"

import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

import type { ApiServer, DownloadedMedia } from "@/core/data/cobalt"
import { download } from "@/core/data/cobalt"

import { db } from "@/core/data/db/database"
import { requests } from "@/core/data/db/schema"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { translatable } from "@/core/utils/text"
import { tryParseUrl } from "@/core/utils/url"

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

export const outputOptions = ["auto", "audio"]
export async function finishRequest(outputType: string, request: MediaRequest, apiPool: ApiServer[], lang?: string): Promise<Result<DownloadedMedia[], Text>> {
    await db.delete(requests).where(eq(requests.id, request.id))
    return download(request.url, outputType, apiPool, lang)
}

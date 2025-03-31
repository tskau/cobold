import { baseFetch } from "@/core/data/cobalt/common"
import { genericErrorSchema, getErrorText } from "@/core/data/cobalt/error"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"

export async function retrieveTunneledMedia(url: string, proxy?: string): Promise<Result<ArrayBuffer, Text>> {
    const data = await baseFetch(url, { proxy })

    if (!data.ok) {
        const content = await data.json().catch(() => null) as unknown
        const body = genericErrorSchema.safeParse(content)
        if (!body.success) {
            throw new Error(`streaming from ${new URL(url).host} failed`)
        }
        return error(getErrorText(body.data.error.code))
    }

    const buffer = await data.arrayBuffer()
    if (!buffer.byteLength)
        throw new Error(`empty body from ${new URL(url).host}`)

    return ok(buffer)
}

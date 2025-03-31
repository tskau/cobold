import { baseFetch } from "@/core/data/cobalt/common"
import { genericErrorSchema, getErrorText } from "@/core/data/cobalt/error"
import type { Result } from "@/core/utils/result"
import { error, ok } from "@/core/utils/result"
import type { Text } from "@/core/utils/text"
import { translatable } from "@/core/utils/text"

export async function retrieveTunneledMedia(url: string, proxy?: string): Promise<Result<ArrayBuffer, Text>> {
    const data = await baseFetch(url, { proxy })
        .catch(() => null)
    if (!data)
        return error(translatable("error-unresponsive"))

    if (!data.ok) {
        const content = await data.json().catch(() => null) as unknown
        const body = genericErrorSchema.safeParse(content)
        if (!body.success)
            return error(translatable("error-invalid-response"))
        return error(getErrorText(body.data.error.code))
    }

    const buffer = await data.arrayBuffer()
    if (!buffer.byteLength)
        return error(translatable("error-invalid-response"))

    return ok(buffer)
}

import { baseFetch } from "@/core/data/cobalt/common"
import { genericErrorSchema } from "@/core/data/cobalt/error"

export async function retrieveTunneledMedia(url: string, proxy?: string) {
    const data = await baseFetch(url, { proxy })

    if (!data.ok) {
        const error = await data.json().catch(() => null) as unknown
        const body = genericErrorSchema.safeParse(error)
        if (!body.success) {
            throw new Error(`streaming from ${new URL(url).host} failed`)
        }
        return body.data
    }

    const buffer = await data.arrayBuffer()
    if (!buffer.byteLength)
        throw new Error(`empty body from ${new URL(url).host}`)

    return {
        status: "success" as const,
        buffer,
    }
}

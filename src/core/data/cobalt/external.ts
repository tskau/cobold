import { baseFetch } from "@/core/data/cobalt/common"

export async function retrieveExternalMedia(url: string, proxy?: string) {
    return baseFetch(url, { proxy }).then(r => r.arrayBuffer())
}

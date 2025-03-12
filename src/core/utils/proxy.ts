import type { FfetchAddon } from "@fuman/fetch"
import { ProxyAgent } from "undici"

export const proxyAddon = (): FfetchAddon<{ proxy?: string | false }, object> => {
    return {
        beforeRequest: (ctx) => {
            if (ctx.options.proxy) {
                ctx.options.extra ??= {}
                // @ts-expect-error This API is only available with undici and is not included in default Request types
                ctx.options.extra.dispatcher
                    = new ProxyAgent(ctx.options.proxy)
            }
        },
    }
}

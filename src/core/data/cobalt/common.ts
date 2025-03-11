import { createFfetch, ffetchAddons } from "@fuman/fetch"
import { ffetchZodAdapter } from "@fuman/fetch/zod"

import { proxyAddon } from "@/core/utils/proxy"

export const baseFetch = createFfetch({
    addons: [
        ffetchAddons.parser(ffetchZodAdapter()),
        proxyAddon(),
    ],
    headers: [
        ["User-Agent", "cobold (+https://github.com/tskau/cobold)"],
    ],
    validateResponse: false,
})

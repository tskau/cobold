import { createFfetch, ffetchAddons } from "@fuman/fetch"
import { proxyAddon } from "@/core/utils/proxy"

export const baseFetch = createFfetch({
    addons: [
        ffetchAddons.parser(),
        proxyAddon(),
    ],
    headers: [
        ["User-Agent", "cobold (+https://github.com/tskau/cobold)"],
    ],
    validateResponse: false,
})

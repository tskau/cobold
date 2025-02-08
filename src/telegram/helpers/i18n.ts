import type { Peer } from "@mtcute/node"

import type { TranslationParams } from "@/core/utils/i18n"
import { fallbackLocale, translate } from "@/core/utils/i18n"
import { getPeerSettings } from "@/telegram/helpers/settings"

export function getPeerLocale(peer: Peer) {
    return ("language" in peer ? peer.language : null) ?? fallbackLocale
}

export type Translator = Awaited<ReturnType<typeof translatorFor>>
export async function translatorFor(peer: Peer) {
    const { languageOverride } = await getPeerSettings(peer)
    const locale = getPeerLocale(peer)
    return (key: string, params?: TranslationParams) => translate(languageOverride ?? locale, key, params)
}

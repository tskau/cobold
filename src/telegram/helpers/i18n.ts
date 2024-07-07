import type { Peer } from "@mtcute/node"
import { fallbackLocale, translate, TranslationParams } from "#core/utils/i18n"
import { getPeerSettings } from "#telegram/helpers/settings"

export async function getPeerLocale(peer: Peer) {
    const { languageOverride } = await getPeerSettings(peer)
    return languageOverride ?? ("language" in peer ? peer.language : null) ?? fallbackLocale
}

export type Translator = Awaited<ReturnType<typeof translatorFor>>
export async function translatorFor(peer: Peer) {
    const locale = await getPeerLocale(peer)
    return (key: string, params?: TranslationParams) => translate(locale, key, params)
}

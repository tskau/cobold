import { FluentBundle, FluentResource, FluentVariable } from "@fluent/bundle"
import { negotiateLanguages } from "@fluent/langneg"
import { readdirSync, readFileSync } from "fs"
import path from "node:path"

const errorEmoticons = ["( • ᴖ • ｡)", "(ᴗ_ ᴗ。)", "(,,>﹏<,,)"]
export const fallbackLocale = "en"
const localeDirectory = "locales"

export type TranslationParams = { [key: string]: FluentVariable }

function getErrorEmoticonContext() {
    const errorEmoticon = errorEmoticons[Math.floor(Math.random() * errorEmoticons.length)]
    return { "error-emoticon": errorEmoticon }
}

function setupI18n() {
    const localeDirContents = readdirSync(localeDirectory)
    return localeDirContents.map((localeFile) => {
        const locale = localeFile.replace(".ftl", "")
        const bundle = new FluentBundle(locale)
        const resource = new FluentResource(readFileSync(path.join(localeDirectory, localeFile), "utf8"))
        bundle.addResource(resource)
        return bundle
    })
}

const bundles = setupI18n()
export const locales = bundles.flatMap(b => b.locales)

export function translate(locale: string, key: string, params?: TranslationParams) {
    const [bestLocale] = negotiateLanguages([locale], locales, { defaultLocale: fallbackLocale })
    const bundle
        = bundles.find(bundle => bundle.locales.includes(bestLocale))
        ?? bundles.find(bundle => bundle.locales.includes(fallbackLocale))

    if (!bundle)
        throw new Error(`Could not find bundle for negotiated (${bestLocale}) or fallback (${fallbackLocale}) locale`)

    const message = bundle.getMessage(key)
    if (!message?.value) return key
    return bundle.formatPattern(message.value, { ...params, ...getErrorEmoticonContext() })
}

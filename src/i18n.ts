import { I18n } from "@grammyjs/i18n"

const errorEmoticons = ["( • ᴖ • ｡)", "(ᴗ_ ᴗ。)", "(,,>﹏<,,)"]
export const i18n = new I18n({
    defaultLocale: "en",
    directory: "locales",
    globalTranslationContext() {
        const errorEmoticon = errorEmoticons[Math.floor(Math.random() * errorEmoticons.length)]
        return { "error-emoticon": errorEmoticon }
    },
})

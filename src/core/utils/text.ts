import { TranslationParams } from "#core/utils/i18n"

export type LiteralText = {
    type: "literal",
    text: string,
}

export type TranslatableText = {
    type: "translatable",
    key: string,
    params?: TranslationParams,
}

export type CompoundText = {
    type: "compound",
    content: Text[],
}

export type TextFlavor = {
    evaluateText: (text: Text) => string,
}

export type Text = LiteralText | TranslatableText | CompoundText

export const literal = (text: string): LiteralText => ({ type: "literal", text })
export const translatable = (key: string): TranslatableText => ({ type: "translatable", key })
export const compound = (...content: Text[]): CompoundText => ({ type: "compound", content })

export type LiteralText = {
    type: "literal",
    text: string,
}

export type TranslatableText = {
    type: "translatable",
    key: string,
}

export type Text = LiteralText | TranslatableText

export const literal = (text: string): LiteralText => ({ type: "literal", text })
export const translatable = (key: string): TranslatableText => ({ type: "translatable", key })

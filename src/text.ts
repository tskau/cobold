import { Context, MiddlewareFn } from "grammy"
import { I18nFlavor } from "@grammyjs/i18n"

export type LiteralText = {
    type: "literal",
    text: string,
}

export type TranslatableText = {
    type: "translatable",
    key: string,
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
export const textMiddleware: MiddlewareFn<Context & I18nFlavor & TextFlavor> = async (ctx, next) => {
    ctx.evaluateText = (text: Text): string => {
        if (text.type === "literal") return text.text
        if (text.type === "translatable") return ctx.t(text.key)
        if (text.type === "compound") return text.content.map(t => ctx.evaluateText(t)).join("")
        return ""
    }
    await next()
}

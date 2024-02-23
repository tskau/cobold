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

export type TextFlavor = {
    evaluateText: (text: Text) => string,
}

export type Text = LiteralText | TranslatableText

export const literal = (text: string): LiteralText => ({ type: "literal", text })
export const translatable = (key: string): TranslatableText => ({ type: "translatable", key })
export const textMiddleware: MiddlewareFn<Context & I18nFlavor & TextFlavor> = async (ctx, next) => {
    ctx.evaluateText = (text: Text): string => {
        if (text.type === "literal") return text.text
        if (text.type === "translatable") return ctx.t(text.key)
        return ""
    }
    await next()
}

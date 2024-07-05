import { randomUUID } from "node:crypto"
import { ParsedUpdate } from "@mtcute/node"
import { bot, report } from "#telegram/bot/bot"
import { translatorFor } from "#telegram/helpers/i18n"

export const handleDispatcherError = async (err: Error, ctx: ParsedUpdate) => {
    console.error("Unhandled Error:", err)
    await report(`${err.name}: ${err.message}\n${err.stack}\nIn ${ctx.name}`)

    if (ctx.name === "new_message") {
        const t = await translatorFor(ctx.data.sender)
        await bot.replyText(ctx.data, t("error-unknown"))
    } else if (ctx.name === "callback_query") {
        const t = await translatorFor(ctx.data.user)
        await bot.editMessage({
            chatId: ctx.data.chat.id,
            message: ctx.data.messageId,
            text: t("error-unknown"),
        })
    } else if (ctx.name === "chosen_inline_result") {
        const t = await translatorFor(ctx.data.user)
        if (ctx.data.messageId)
            await bot.editInlineMessage({
                messageId: ctx.data.messageId,
                text: t("error-unknown"),
            })
    } else if (ctx.name === "inline_query") {
        const t = await translatorFor(ctx.data.user)
        await bot.answerInlineQuery(ctx.data, [
            {
                id: randomUUID(),
                type: "article",
                title: "error",
                description: t("error-unknown"),
            },
        ])
    }

    return true
}

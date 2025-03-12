import type { ParsedUpdate, TelegramClient } from "@mtcute/node"
import { randomUUID } from "node:crypto"
import { tl } from "@mtcute/node"
import { env } from "@/telegram/helpers/env"
import { translatorFor } from "@/telegram/helpers/i18n"

export const createDispatcherErrorHandler = (client: TelegramClient) => async (err: Error, ctx: ParsedUpdate) => {
    // Ignoring errors when user deleted the message or blocked the bot
    if (tl.RpcError.is(err, "MESSAGE_ID_INVALID") || tl.RpcError.is(err, "USER_IS_BLOCKED") || tl.RpcError.is(err, "MESSAGE_NOT_MODIFIED"))
        return true

    console.error("Unhandled Error:", err)
    if (env.ERROR_CHAT_ID) {
        await client.sendText(
            env.ERROR_CHAT_ID,
            `unhandled error з:\n${err.name}: ${err.message}\n${err.stack}\nIn ${ctx.name}`,
        )
    }

    if (ctx.name === "new_message") {
        const t = await translatorFor(ctx.data.sender)
        await client.replyText(ctx.data, t("error-unknown"))
    } else if (ctx.name === "callback_query") {
        const t = await translatorFor(ctx.data.user)
        await client.editMessage({
            chatId: ctx.data.chat.id,
            message: ctx.data.messageId,
            text: t("error-unknown"),
        })
    } else if (ctx.name === "chosen_inline_result") {
        const t = await translatorFor(ctx.data.user)
        if (ctx.data.messageId) {
            await client.editInlineMessage({
                messageId: ctx.data.messageId,
                text: t("error-unknown"),
            })
        }
    } else if (ctx.name === "inline_query") {
        const t = await translatorFor(ctx.data.user)
        await client.answerInlineQuery(ctx.data, [
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

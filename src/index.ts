import { env } from "@/env"
import { Bot } from "grammy"
import { canInteract, handleMediaDownload, handleMediaRequest } from "@/handler"
import { randomUUID } from "node:crypto"

const bot = new Bot(env.BOT_TOKEN)

bot.catch((err) => {
    console.error("Unhandled Error:", err)
})

bot.command("start", ctx =>
    ctx.reply("hii! just send me a link and i'll download it."),
)

bot.on("message", async (ctx) => {
    if (ctx.message.chat.type !== "private") return

    const result = await handleMediaRequest(ctx.message.text ?? "", ctx.message.from.id)

    if (!result.success)
        return await ctx.reply(`error: ${result.error}`)

    await ctx.replyWithPhoto(result.result.image, {
        reply_markup: result.result.replyMarkup,
        caption: result.result.caption,
    })
})

bot.on("inline_query", async (ctx) => {
    const result = await handleMediaRequest(ctx.inlineQuery.query, ctx.inlineQuery.from.id)

    if (!result.success)
        return await ctx.answerInlineQuery([{
            id: randomUUID(),
            type: "article",
            title: "error",
            description: result.error,
            input_message_content: {
                message_text: `error: ${result.error}`,
            },
        }])

    await ctx.answerInlineQuery([{
        id: result.result.id,
        type: "photo",
        photo_url: env.SELECT_TYPE_PHOTO_URL,
        thumbnail_url: env.SELECT_TYPE_PHOTO_URL,
        title: "download from provided url",

        reply_markup: result.result.replyMarkup,
        caption: result.result.caption,
    }], {
        cache_time: 0,
    })
})

bot.on("callback_query", async (ctx) => {
    const [outputType, requestId] = (ctx.callbackQuery.data ?? "").split(":")
    if (!outputType || !requestId || !canInteract(requestId, ctx.callbackQuery.from.id))
        return await ctx.answerCallbackQuery({
            text: "looks like this button is not yours",
        })

    await ctx.editMessageReplyMarkup(undefined)
    await ctx.editMessageCaption({
        caption: "loading...",
    })

    const result = await handleMediaDownload(outputType, requestId)

    if (!result.success)
        return await ctx.editMessageCaption({
            caption: `error: ${result.error}`,
        })

    await ctx.editMessageMedia(result.result)
})

bot.start().then()

import { env } from "#env"
import { Bot, Context } from "grammy"
import { I18nFlavor } from "@grammyjs/i18n"
import { getRequest, handleMediaDownload, handleMediaRequest } from "#handler"
import { randomUUID } from "node:crypto"
import { TextFlavor, textMiddleware } from "#text"
import { Message } from "grammy/types"
import { i18n } from "#i18n"

type CoboldContext = Context & I18nFlavor & TextFlavor
const bot = new Bot<CoboldContext>(env.BOT_TOKEN)

bot.use(i18n, textMiddleware)

bot.catch((err) => {
    console.error("Unhandled Error:", err)
})

bot.command("start", ctx =>
    ctx.reply(ctx.t("start")),
)

bot.on("message", async (ctx) => {
    if (ctx.message.chat.type !== "private") return

    const result = await handleMediaRequest(ctx.message.text ?? "", ctx.message.from.id)

    if (!result.success)
        return await ctx.reply(ctx.t("error", { message: ctx.evaluateText(result.error) }))

    await ctx.replyWithPhoto(result.result.image, {
        reply_markup: {
            inline_keyboard: [
                result.result.options.map(option => (
                    { text: ctx.evaluateText(option.name), callback_data: option.key }
                )),
            ],
        },
        caption: ctx.evaluateText(result.result.caption),
    })
})

bot.on("inline_query", async (ctx) => {
    const result = await handleMediaRequest(ctx.inlineQuery.query, ctx.inlineQuery.from.id)

    if (!result.success)
        return await ctx.answerInlineQuery([{
            id: randomUUID(),
            type: "article",
            title: ctx.t("error-title"),
            description: ctx.evaluateText(result.error),
            input_message_content: {
                message_text: ctx.t("error", { message: ctx.evaluateText(result.error) }),
            },
        }])

    await ctx.answerInlineQuery([{
        id: result.result.id,
        type: "photo",
        photo_url: env.SELECT_TYPE_PHOTO_URL,
        thumbnail_url: env.SELECT_TYPE_PHOTO_URL,
        title: ctx.t("download-title"),
        reply_markup: {
            inline_keyboard: [
                result.result.options.map(option => (
                    { text: ctx.evaluateText(option.name), callback_data: option.key }
                )),
            ],
        },
        caption: ctx.evaluateText(result.result.caption),
    }], {
        cache_time: 0,
    })
})

bot.on("callback_query", async (ctx) => {
    const [outputType, requestId] = (ctx.callbackQuery.data ?? "").split(":")
    const request = await getRequest(requestId)
    if (!outputType || !requestId || (request && request.authorId !== ctx.callbackQuery.from.id))
        return await ctx.answerCallbackQuery({
            text: ctx.t("error-not-button-owner"),
        })

    await ctx.editMessageReplyMarkup(undefined)
    await ctx.editMessageCaption({
        caption: ctx.t("downloading-title"),
    })

    const result = await handleMediaDownload(outputType, request, ctx.from.language_code)

    if (!result.success)
        return await ctx.editMessageCaption({
            caption: ctx.t("error", { message: ctx.evaluateText(result.error) }),
        })

    await ctx.editMessageCaption({
        caption: ctx.t("uploading-title"),
    })

    // Weird fix for inline messages
    if (ctx.inlineMessageId) {
        // GrammY has an inaccurate return type, which breaks the bot.
        // for example, if you send a video using sendDocument, it will return VideoMessage response,
        // but GrammY thinks that it returns DocumentMessage, which is not the case.
        type SendDocumentResponse = Message.DocumentMessage | Message.AudioMessage | Message.VideoMessage
        const msg = await ctx.api.sendDocument(env.INLINE_FIX_CHAT_ID, result.result.media) as SendDocumentResponse
        const fileId
            = "audio" in msg ? msg.audio.file_id
                : "video" in msg ? msg.video.file_id
                    : msg.document.file_id

        await ctx.editMessageMedia({
            ...result.result,
            media: fileId,
        })

        await ctx.api.deleteMessage(
            msg.chat.id,
            msg.message_id,
        )

        return
    }

    await ctx.editMessageMedia(result.result)
})

bot.start().then()

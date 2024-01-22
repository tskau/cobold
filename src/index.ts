import { env } from "#env"
import { Bot, Context } from "grammy"
import { I18n, I18nFlavor } from "@grammyjs/i18n"
import { canInteract, handleMediaDownload, handleMediaRequest } from "#handler"
import { randomUUID } from "node:crypto"
import { Text } from "#text"

type CoboldContext = Context & I18nFlavor & {
    evaluateText: (text: Text) => string,
}
const bot = new Bot<CoboldContext>(env.BOT_TOKEN)

const errorEmoticons = ["( • ᴖ • ｡)", "(ᴗ_ ᴗ。)", "(,,>﹏<,,)"]
const i18n = new I18n<CoboldContext>({
    defaultLocale: "en",
    directory: "locales",
    globalTranslationContext() {
        const errorEmoticon = errorEmoticons[Math.floor(Math.random() * errorEmoticons.length)]
        return { "error-emoticon": errorEmoticon }
    },
})

bot.use(i18n, async (ctx, next) => {
    ctx.evaluateText = (text: Text): string => {
        if (text.type === "literal") return text.text
        if (text.type === "translatable") return ctx.t(text.key)
        return ""
    }
    await next()
})

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
    if (!outputType || !requestId || !canInteract(requestId, ctx.callbackQuery.from.id))
        return await ctx.answerCallbackQuery({
            text: ctx.t("error-not-button-owner"),
        })

    await ctx.editMessageReplyMarkup(undefined)
    await ctx.editMessageCaption({
        caption: ctx.t("downloading-title"),
    })

    const result = await handleMediaDownload(outputType, requestId, ctx.from.language_code)

    if (!result.success)
        return await ctx.editMessageCaption({
            caption: ctx.t("error", { message: ctx.evaluateText(result.error) }),
        })

    await ctx.editMessageCaption({
        caption: ctx.t("uploading-title"),
    })

    // Weird fix for inline messages
    if (ctx.inlineMessageId) {
        const msg = await ctx.api.sendDocument(env.INLINE_FIX_CHAT_ID, result.result.media)
        const fileId = msg.document.file_id

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

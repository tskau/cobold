import { env } from "#env"
import { Api, Bot, Context } from "grammy"
import { I18nFlavor } from "@grammyjs/i18n"
import { getRequest, handleMediaDownload, createRequest, getOutputSelectionMessage, MediaRequest } from "#handler"
import { randomUUID } from "node:crypto"
import { TextFlavor, textMiddleware } from "#text"
import { InlineKeyboardMarkup, InputMedia } from "grammy/types"
import { i18n } from "#i18n"
import {
    getSettingsMenu,
    settingCallbackPrefix,
    Settings,
    SettingsFlavor,
    settingsMiddleware,
    updateSetting,
} from "#settings"

type CoboldContext = Context & I18nFlavor & TextFlavor & SettingsFlavor
const bot = new Bot<CoboldContext>(env.BOT_TOKEN)

bot.use(i18n, textMiddleware, settingsMiddleware)

const report = async (msg: string) => {
    if (env.ERROR_CHAT_ID)
        await bot.api.sendMessage(env.ERROR_CHAT_ID, msg)
}

bot.catch((err) => {
    if (err.message.includes("(413: Request Entity Too Large)"))
        return err.ctx.editMessageCaption({
            caption: err.ctx.t("error", { message: err.ctx.t("error-too-large") }),
        })
    if (err.ctx.inlineMessageId !== undefined || err.ctx.msg?.from?.id === err.ctx.me.id) {
        void err.ctx.editMessageCaption({
            caption: err.ctx.t("error", { message: err.ctx.t("error-unknown") }),
        })
    }
    console.error("Unhandled Error:", err)
    report(`${err.name}: ${err.message}\n${err.stack}\nIn ${err.ctx.chat?.id}`)
        .catch(() => console.error("Additionally, failed to report error to Telegram"))
})

bot.command("start", ctx =>
    ctx.reply(ctx.t("start")),
)

const settingsReplyMarkup = (ctx: CoboldContext, settingsOverride?: Settings): InlineKeyboardMarkup => ({
    inline_keyboard: getSettingsMenu(settingsOverride ?? ctx.userSettings).map(d => ([
        {
            text: `${ctx.evaluateText(d.title)}: ${ctx.evaluateText(d.value)}`,
            callback_data: d.key,
        },
    ])),
})

bot.command("settings", async (ctx) => {
    await ctx.reply(ctx.t("settings-title"), {
        reply_markup: settingsReplyMarkup(ctx),
    })
})

bot.on("message", async (ctx) => {
    if (ctx.message.chat.type !== "private") return

    const req = await createRequest(ctx.message.text ?? "", ctx.message.from.id)

    if (!req.success)
        return await ctx.reply(ctx.t("error", { message: ctx.evaluateText(req.error) }))

    const msg = getOutputSelectionMessage(req.result.id)
    await ctx.replyWithPhoto(msg.image, {
        reply_markup: {
            inline_keyboard: [
                msg.options.map(option => (
                    { text: ctx.evaluateText(option.name), callback_data: option.key }
                )),
            ],
        },
        caption: ctx.evaluateText(msg.caption),
    })
})

bot.on("inline_query", async (ctx) => {
    const req = await createRequest(ctx.inlineQuery.query, ctx.inlineQuery.from.id)

    if (!req.success)
        return await ctx.answerInlineQuery([{
            id: randomUUID(),
            type: "article",
            title: ctx.t("error-title"),
            description: ctx.evaluateText(req.error),
            input_message_content: {
                message_text: ctx.t("error", { message: ctx.evaluateText(req.error) }),
            },
        }])

    const msg = getOutputSelectionMessage(req.result.id)
    await ctx.answerInlineQuery([{
        id: req.result.id,
        type: "photo",
        photo_url: env.SELECT_TYPE_PHOTO_URL,
        thumbnail_url: env.SELECT_TYPE_PHOTO_URL,
        title: ctx.t("download-title"),
        reply_markup: {
            inline_keyboard: [
                msg.options.map(option => (
                    { text: ctx.evaluateText(option.name), callback_data: option.key }
                )),
            ],
        },
        caption: ctx.evaluateText(msg.caption),
    }], {
        cache_time: 0,
    })
})

const capitalize = <S extends string>(str: S): Capitalize<S> =>
    str.charAt(0).toUpperCase() + str.slice(1) as Capitalize<S>

const sendInputMedia = async (api: Api, chat: number, media: InputMedia) => {
    const msg = await api[`send${capitalize(media.type)}`](chat, media.media)
    // @ts-expect-error This way of getting file_id based by type works, but TS isn't smart enough to know that
    const fileId: string = msg[media.type].file_id
    return { chat: msg.chat.id, msg: msg.message_id, file: fileId }
}

const onOutputSelected = async (
    ctx: CoboldContext,
    outputType: string,
    request: MediaRequest | undefined,
) => {
    await ctx.editMessageReplyMarkup(undefined)
    await ctx.editMessageCaption({
        caption: ctx.t("downloading-title"),
    })

    const result = await handleMediaDownload(
        outputType,
        request,
        ctx.userSettings.languageOverride ?? ctx.from?.language_code,
    )

    if (!result.success)
        return await ctx.editMessageCaption({
            caption: ctx.t("error", { message: ctx.evaluateText(result.error) }),
        })

    await ctx.editMessageCaption({
        caption: ctx.t("uploading-title"),
    })

    const caption = ctx.userSettings.preferredAttribution ? request?.url : undefined
    // Weird fix for inline messages
    if (ctx.inlineMessageId) {
        const msg = await sendInputMedia(ctx.api, env.INLINE_FIX_CHAT_ID, result.result)

        await ctx.editMessageMedia({
            ...result.result,
            media: msg.file,
            caption,
        })

        await ctx.api.deleteMessage(
            msg.chat,
            msg.msg,
        )

        return
    }

    await ctx.editMessageMedia({
        ...result.result,
        caption,
    })
}

bot.on("callback_query", async (ctx) => {
    const [outputType, requestId] = (ctx.callbackQuery.data ?? "").split(":")

    if (outputType === settingCallbackPrefix) {
        const newSettings = await updateSetting(requestId ?? "", ctx.userSettings, ctx.from.id)
        ctx.i18n.useLocale(newSettings?.languageOverride ?? ctx.from.language_code ?? "en")
        await ctx.editMessageText(ctx.t("settings-title"))
        await ctx.editMessageReplyMarkup({
            reply_markup: settingsReplyMarkup(ctx, newSettings),
        })
        return
    }

    const request = await getRequest(requestId)
    if (!outputType || !requestId || (request && request.authorId !== ctx.callbackQuery.from.id))
        return await ctx.answerCallbackQuery({
            text: ctx.t("error-not-button-owner"),
        })
    await onOutputSelected(ctx, outputType, request)
})

bot.on("chosen_inline_result", async (ctx) => {
    const request = await getRequest(ctx.chosenInlineResult.result_id)
    if (ctx.userSettings.preferredOutput !== null)
        return await onOutputSelected(ctx, ctx.userSettings.preferredOutput, request)
})

bot.start().then(() => report("Bot going down"))
report("Started bot").then()

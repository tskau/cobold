import type { BusinessCallbackQueryContext, CallbackQueryContext, InlineCallbackQueryContext } from "@mtcute/dispatcher"
import type { InputMediaLike, Peer } from "@mtcute/node"

import { randomUUID } from "node:crypto"
import { Dispatcher } from "@mtcute/dispatcher"
import { BotInline, BotKeyboard } from "@mtcute/node"

import type { MediaRequest } from "@/core/data/request"
import { createRequest, getRequest } from "@/core/data/request"
import type { Settings } from "@/core/data/settings"
import { incrementDownloadCount } from "@/core/data/stats"
import {
    getOutputSelectionMessage,
    handleMediaDownload,
    OutputButton,
} from "@/telegram/helpers/handler"
import { getPeerSettings } from "@/telegram/helpers/settings"
import type { Evaluators } from "@/telegram/helpers/text"
import { evaluatorsFor } from "@/telegram/helpers/text"

export const downloadDp = Dispatcher.child()

const errorDeleteDelay = 30 * 1000

downloadDp.onNewMessage(async (msg) => {
    const { e, t } = await evaluatorsFor(msg.chat)

    if (msg.text === "meow") {
        await msg.replyText("meow :з")
        return
    }

    const urlEntities = msg.entities.filter(e => e.is("text_link") || e.is("url"))
    const extractedUrls = urlEntities.map(e => (e.is("text_link") ? e.params.url : e.text))
    const urls = extractedUrls.length ? extractedUrls : [msg.text]
    for (const url of urls) {
        const req = await createRequest(url, msg.sender.id)

        if (!req.success) {
            if (msg.chat.type === "user")
                await msg.replyText(t("error", { message: e(req.error) }))
            return
        }

        const selectMsg = getOutputSelectionMessage(req.result.id)
        const reply = await msg.replyText(e(selectMsg.caption), {
            replyMarkup: BotKeyboard.inline([
                selectMsg.options.map(o => BotKeyboard.callback(
                    e(o.name),
                    o.key,
                )),
            ]),
        })

        const settings = await getPeerSettings(msg.chat)
        if (settings.preferredOutput) {
            const res = await onOutputSelected(
                settings.preferredOutput,
                req.result,
                args => msg.client.editMessage({ ...args, message: reply }),
                { e, t },
                settings,
                ({ medias }) => msg.replyMediaGroup(medias),
                msg.sender,
            )
            if (!res && msg.chat.type !== "user")
                setTimeout(() => msg.client.deleteMessages([reply]), errorDeleteDelay)
        }
    }
})

downloadDp.onInlineQuery(async (ctx) => {
    const { t, e } = await evaluatorsFor(ctx.user)

    const infoSwitchPm = {
        text: t("info-open"),
        parameter: "info",
    }

    const settingsSwitchPm = {
        text: t("settings-open"),
        parameter: "settings",
    }

    if (!ctx.query.trim()) {
        await ctx.answer([], { cacheTime: 0, switchPm: infoSwitchPm })
        return
    }

    const req = await createRequest(ctx.query.trim(), ctx.user.id)
    if (!req.success) {
        await ctx.answer([
            BotInline.article(randomUUID(), {
                title: t("error-title"),
                description: e(req.error),
            }),
        ], { cacheTime: 0, switchPm: settingsSwitchPm })
        return
    }

    const selectMsg = getOutputSelectionMessage(req.result.id)
    await ctx.answer([
        BotInline.article(req.result.id, {
            title: e(selectMsg.caption),
            message: {
                type: "text",
                replyMarkup: BotKeyboard.inline([
                    selectMsg.options.map(o => BotKeyboard.callback(
                        e(o.name),
                        o.key,
                    )),
                ]),
                text: e(selectMsg.caption),
            },
        }),
    ], { cacheTime: 0, switchPm: settingsSwitchPm })
})

downloadDp.onAnyCallbackQuery(OutputButton.filter(), async (upd) => {
    // When passing a filter to onAnyCallbackQuery it applies a modification to the update object, which makes it lose its enum-like properties.
    // To access the original update object, we need to cast it to the original type.
    const rawUpd = upd as unknown as (CallbackQueryContext | InlineCallbackQueryContext | BusinessCallbackQueryContext)

    const peer = rawUpd._name === "callback_query" ? rawUpd.chat : upd.user
    const settings = await getPeerSettings(peer)
    const { t, e } = await evaluatorsFor(peer)
    const { output: outputType, request: requestId } = upd.match

    const request = await getRequest(requestId)
    if (request && request.authorId !== upd.user.id) {
        return await upd.answer({
            text: t("error-not-button-owner"),
        })
    }

    const res = await onOutputSelected(
        outputType,
        request,
        args => upd.editMessage(args),
        { t, e },
        settings,
        ({ medias }) => upd.client.sendMediaGroup(peer.id, medias),
        upd.user,
    )
    if (!res && rawUpd._name === "callback_query" && rawUpd.chat.type !== "user")
        setTimeout(() => upd.client.deleteMessagesById(rawUpd.chat.id, [rawUpd.messageId]), errorDeleteDelay)
})

downloadDp.onChosenInlineResult(async (upd) => {
    const { messageId } = upd
    if (!messageId)
        return
    const settings = await getPeerSettings(upd.user)
    if (settings.preferredOutput) {
        const request = await getRequest(upd.id)
        await onOutputSelected(
            settings.preferredOutput,
            request,
            args => upd.editMessage({ ...args, messageId }),
            await evaluatorsFor(upd.user),
            settings,
            ({ medias }) => upd.client.sendMediaGroup(upd.user.id, medias),
            upd.user,
        )
    }
})

async function onOutputSelected(
    outputType: string,
    request: MediaRequest | undefined,
    editMessage: (edit: { text?: string, media?: InputMediaLike }) => Promise<unknown>,
    { t, e }: Evaluators,
    settings: Settings,
    sendGroup: (send: { medias: InputMediaLike[] }) => Promise<unknown>,
    sender: Peer,
) {
    await editMessage({ text: t("downloading-title") })
    const res = await handleMediaDownload(outputType, request, settings)
    if (!res.success) {
        const errorMessage = t("error", { message: e(res.error) })
        await editMessage({ text: settings.preferredAttribution ? `${errorMessage}\n\n${request?.url}` : errorMessage })
        return false
    }

    await editMessage({ text: t("uploading-title") })
    if (res.result.length !== 1) {
        await editMessage({ text: t("note-picker") })
        const chunkSize = 10
        for (let i = 0; i < res.result.length; i += chunkSize) {
            const chunk = res.result.slice(i, i + chunkSize)
            await sendGroup({ medias: chunk })
        }
    } else {
        await editMessage({ media: res.result[0], text: (!!settings.preferredAttribution && request?.url) || "" })
    }

    incrementDownloadCount(sender.id)
        .catch(() => { /* noop */ })

    return true
}

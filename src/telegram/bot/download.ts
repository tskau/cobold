import { Dispatcher, filters } from "@mtcute/dispatcher"
import {
    getOutputSelectionMessage,
    handleMediaDownload,
    OutputButton,
} from "#telegram/helpers/handler"
import { BotInline, BotKeyboard, InputMedia, InputMediaLike, Peer } from "@mtcute/node"
import { randomUUID } from "node:crypto"
import { env } from "#telegram/helpers/env"
import { Evaluators, evaluatorsFor } from "#telegram/helpers/text"
import { createRequest, getRequest, MediaRequest } from "#core/data/request"
import { incrementDownloadCount } from "#core/data/stats"
import { getPeerSettings } from "#telegram/helpers/settings"

export const downloadDp = Dispatcher.child()

downloadDp.onNewMessage(filters.chat("private"), async (msg) => {
    const { e, t } = await evaluatorsFor(msg.sender)

    const urlEntity = msg.entities.find(e => e.is("text_link") || e.is("url"))
    const extractedUrl = urlEntity && (urlEntity.is("text_link") ? urlEntity.params.url : urlEntity.text)
    const req = await createRequest(extractedUrl || msg.text, msg.sender.id)

    if (!req.success) {
        await msg.replyText(t("error", { message: e(req.error) }))
        return
    }

    const selectMsg = getOutputSelectionMessage(req.result.id)
    const reply = await msg.replyMedia(InputMedia.photo(selectMsg.image), {
        caption: e(selectMsg.caption),
        replyMarkup: BotKeyboard.inline([
            selectMsg.options.map(o => BotKeyboard.callback(
                e(o.name),
                o.key,
            )),
        ]),
    })

    const settings = await getPeerSettings(msg.sender)
    if (settings.preferredOutput) {
        await onOutputSelected(
            settings.preferredOutput,
            req.result,
            args => msg.client.editMessage({ ...args, message: reply }),
            { e, t },
            msg.sender,
            !!settings.preferredAttribution,
        )
    }
})

downloadDp.onInlineQuery(async (ctx) => {
    const { t, e } = await evaluatorsFor(ctx.user)

    const settingsSwitchPm = {
        text: t("settings-open"),
        parameter: "settings",
    }

    if (!ctx.query.trim()) {
        await ctx.answer([], { switchPm: settingsSwitchPm })
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
        BotInline.photo(req.result.id, env.SELECT_TYPE_PHOTO_URL, {
            message: {
                type: "media",
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
    const settings = await getPeerSettings(upd.user)
    const { t, e } = await evaluatorsFor(upd.user)
    const { output: outputType, request: requestId } = upd.match

    const request = await getRequest(requestId)
    if (request && request.authorId !== upd.user.id)
        return await upd.answer({
            text: t("error-not-button-owner"),
        })

    await onOutputSelected(
        outputType,
        request,
        args => upd.editMessage(args),
        { t, e },
        upd.user,
        !!settings.preferredAttribution,
    )
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
            upd.user,
            !!settings.preferredAttribution,
        )
    }
})

const onOutputSelected = async (
    outputType: string,
    request: MediaRequest | undefined,
    editMessage: (edit: { text?: string, media?: InputMediaLike }) => Promise<unknown>,
    { t, e }: Evaluators,
    peer: Peer,
    leaveSourceLink: boolean,
) => {
    await editMessage({ text: t("downloading-title") })
    const res = await handleMediaDownload(outputType, request, peer)
    if (!res.success) {
        await editMessage({ text: t("error", { message: e(res.error) }) })
        return
    }

    await editMessage({ text: t("uploading-title") })
    await editMessage({ media: res.result })
    await editMessage({ text: (leaveSourceLink && request?.url) || "" })

    incrementDownloadCount(peer.id)
        .catch(() => { /* noop */ })
}

import type { Peer, TelegramClient, User } from "@mtcute/node"
import { Dispatcher, filters, PropagationAction } from "@mtcute/dispatcher"
import { BotKeyboard } from "@mtcute/node"

import type { Settings } from "@/core/data/settings"
import { customValue, getSettingValues, updateSetting } from "@/core/data/settings"

import type { BotState } from "@/telegram/bot/state"
import {
    getPeerSettings,
    getSettingMenu,
    getSettingsMenu,
    isValidSettingKey,
    SettingButton,
    SettingUpdateButton,
} from "@/telegram/helpers/settings"
import type { TextEvaluator } from "@/telegram/helpers/text"
import { evaluatorsFor } from "@/telegram/helpers/text"

type SettingInputState = { setting: keyof Settings }
export const settingInputScene = Dispatcher.scene<SettingInputState>("setting-input")

export const settingsDp = Dispatcher.child<BotState>()
settingsDp.addScene(settingInputScene)

function settingsMessage(e: TextEvaluator, settings: Settings) {
    const menu = getSettingsMenu(settings)
    return {
        text: e(menu.title),
        replyMarkup: BotKeyboard.inline(
            menu.options.map(d => ([
                BotKeyboard.callback(`${e(d.title)}: ${e(d.value)}`, d.key),
            ])),
        ),
    }
}

async function isAdmin(client: Pick<TelegramClient, "getChatMember">, chat: Peer, user: User) {
    if (chat.type !== "chat")
        return true
    const member = await client.getChatMember({ chatId: chat, userId: user })
    return member?.status === "admin" || member?.status === "creator"
}

function settingEditMessage(e: TextEvaluator, settings: Settings, setting: keyof Settings) {
    const menu = getSettingMenu(settings, setting)
    return {
        text: e(menu.title),
        replyMarkup: BotKeyboard.inline(
            menu.options.map(d => ([
                BotKeyboard.callback(`${e(d.value)}`, d.key),
            ])),
        ),
    }
}

settingsDp.onNewMessage(
    filters.or(filters.command("settings"), filters.deeplink(["settings"])),
    async (msg) => {
        const { e } = await evaluatorsFor(msg.chat)
        const settings = await getPeerSettings(msg.chat)
        const { text, ...props } = settingsMessage(e, settings)
        await msg.replyText(text, props)
    },
)

settingsDp.onCallbackQuery(SettingButton.filter(), async (upd) => {
    const { e, t } = await evaluatorsFor(upd.chat)
    if (!await isAdmin(upd.client, upd.chat, upd.user)) {
        return await upd.answer({
            text: t("error-admin-button"),
        })
    }
    const settings = await getPeerSettings(upd.chat)
    if (upd.match.setting === "back") {
        await upd.editMessage(settingsMessage(e, settings))
        return
    }
    if (!isValidSettingKey(upd.match.setting))
        return // Invalid key

    await upd.editMessage(settingEditMessage(e, settings, upd.match.setting))
})

settingsDp.onCallbackQuery(SettingUpdateButton.filter(), async (upd, state) => {
    if (!isValidSettingKey(upd.match.setting))
        return // Invalid key
    if (!await isAdmin(upd.client, upd.chat, upd.user)) {
        const { t } = await evaluatorsFor(upd.chat)
        return await upd.answer({
            text: t("error-admin-button"),
        })
    }

    const settings = await getPeerSettings(upd.chat)
    const valueIndex = +upd.match.value
    const value = getSettingValues(upd.match.setting)[valueIndex]
    if (value === customValue) {
        const { e, t } = await evaluatorsFor(upd.chat)
        const { text: _, ...props } = settingEditMessage(e, settings, upd.match.setting)
        await upd.editMessage({ text: t("setting-custom"), ...props })
        await state.enter(settingInputScene, { with: { setting: upd.match.setting } })
        return
    }
    const newSettings = await updateSetting(upd.match.setting, value, upd.chat.id)

    // We're getting evaluator AFTER the possible locale update
    const { e } = await evaluatorsFor(upd.chat)
    await upd.editMessage(settingEditMessage(e, newSettings ?? settings, upd.match.setting))
})

settingInputScene.onNewMessage(async (upd, state) => {
    if (upd.sender.type !== "user" || !await isAdmin(upd.client, upd.chat, upd.sender)) {
        return
    }

    const stateData = await state.get()
    if (!stateData) {
        await state.exit()
        return
    }

    const { t } = await evaluatorsFor(upd.chat)
    await updateSetting(stateData.setting, upd.text, upd.chat.id)
    await upd.replyText(t("setting-saved"))

    await state.exit()
})

settingInputScene.onAnyCallbackQuery(async (_, state) => {
    await state.exit()
    return PropagationAction.ToScene
})

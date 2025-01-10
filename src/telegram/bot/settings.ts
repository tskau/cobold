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
        const { e } = await evaluatorsFor(msg.sender)
        const settings = await getPeerSettings(msg.sender)
        const { text, ...props } = settingsMessage(e, settings)
        await msg.replyText(text, props)
    },
)

settingsDp.onAnyCallbackQuery(SettingButton.filter(), async (upd) => {
    const { e } = await evaluatorsFor(upd.user)
    const settings = await getPeerSettings(upd.user)
    if (upd.match.setting === "back") {
        await upd.editMessage(settingsMessage(e, settings))
        return
    }
    if (!isValidSettingKey(upd.match.setting))
        return // Invalid key

    await upd.editMessage(settingEditMessage(e, settings, upd.match.setting))
})

settingsDp.onAnyCallbackQuery(SettingUpdateButton.filter(), async (upd, state) => {
    if (!isValidSettingKey(upd.match.setting))
        return // Invalid key

    const settings = await getPeerSettings(upd.user)
    const valueIndex = +upd.match.value
    const value = getSettingValues(upd.match.setting)[valueIndex]
    if (value === customValue) {
        const { e, t } = await evaluatorsFor(upd.user)
        const { text: _, ...props } = settingEditMessage(e, settings, upd.match.setting)
        await upd.editMessage({ text: t("setting-custom"), ...props })
        await state.enter(settingInputScene, { with: { setting: upd.match.setting } })
        return
    }
    const newSettings = await updateSetting(upd.match.setting, value, upd.user.id)

    // We're getting evaluator AFTER the possible locale update
    const { e } = await evaluatorsFor(upd.user)
    await upd.editMessage(settingEditMessage(e, newSettings ?? settings, upd.match.setting))
})

settingInputScene.onNewMessage(async (upd, state) => {
    const stateData = await state.get()
    if (!stateData) {
        await state.exit()
        return
    }

    const { t } = await evaluatorsFor(upd.sender)
    await updateSetting(stateData.setting, upd.text, upd.sender.id)
    await upd.replyText(t("setting-saved"))

    await state.exit()
})

settingInputScene.onAnyCallbackQuery(async (_, state) => {
    await state.exit()
    return PropagationAction.ToScene
})

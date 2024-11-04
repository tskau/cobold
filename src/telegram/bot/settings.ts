import type { InlineKeyboardMarkup } from "@mtcute/node"
import { Dispatcher, filters } from "@mtcute/dispatcher"
import { BotKeyboard } from "@mtcute/node"

import type { Settings } from "@/core/data/settings"
import { updateSetting } from "@/core/data/settings"
import { getPeerSettings, getSettingsMenu, SettingButton } from "@/telegram/helpers/settings"
import type { TextEvaluator } from "@/telegram/helpers/text"
import { evaluatorsFor } from "@/telegram/helpers/text"

export const settingsDp = Dispatcher.child()

function settingsReplyMarkup(e: TextEvaluator, settings: Settings): InlineKeyboardMarkup {
    return BotKeyboard.inline(
        getSettingsMenu(settings).map(d => ([
            BotKeyboard.callback(`${e(d.title)}: ${e(d.value)}`, d.key),
        ])),
    )
}

settingsDp.onNewMessage(
    filters.or(filters.command("settings"), filters.deeplink(["settings"])),
    async (msg) => {
        const { t, e } = await evaluatorsFor(msg.sender)
        const settings = await getPeerSettings(msg.sender)
        await msg.replyText(t("settings-title"), {
            replyMarkup: settingsReplyMarkup(e, settings),
        })
    },
)

settingsDp.onAnyCallbackQuery(SettingButton.filter(), async (upd) => {
    const settings = await getPeerSettings(upd.user)
    const newSettings = await updateSetting(upd.match.setting, settings, upd.user.id)

    // We're getting evaluators AFTER the locale update
    const { t, e } = await evaluatorsFor(upd.user)
    await upd.editMessage({
        text: t("settings-title"),
        replyMarkup: settingsReplyMarkup(e, newSettings ?? settings),
    })
})

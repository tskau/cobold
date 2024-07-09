import { Dispatcher, filters } from "@mtcute/dispatcher"
import { BotKeyboard, InlineKeyboardMarkup } from "@mtcute/node"
import { Settings, updateSetting } from "#core/data/settings"
import { evaluatorsFor, TextEvaluator } from "#telegram/helpers/text"
import { getPeerSettings, getSettingsMenu, SettingButton } from "#telegram/helpers/settings"

export const settingsDp = Dispatcher.child()

const settingsReplyMarkup = (e: TextEvaluator, settings: Settings): InlineKeyboardMarkup =>
    BotKeyboard.inline(
        getSettingsMenu(settings).map(d => ([
            BotKeyboard.callback(`${e(d.title)}: ${e(d.value)}`, d.key),
        ])),
    )

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

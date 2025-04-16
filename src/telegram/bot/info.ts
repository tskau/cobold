import { Dispatcher, filters } from "@mtcute/dispatcher"
import { bugs, name, repository, version } from "@/../package.json"
import { settingsDp } from "@/telegram/bot/settings"
import { evaluatorsFor } from "@/telegram/helpers/text"

export const infoDp = Dispatcher.child()

settingsDp.onNewMessage(filters.command("info"), async (msg) => {
    const { t } = await evaluatorsFor(msg.sender)
    await msg.replyText(t("info", { bugs, name, repository, version }))
})

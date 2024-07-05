import { Dispatcher, filters } from "@mtcute/dispatcher"
import { bot } from "#telegram/bot/bot"
import { downloadDp } from "#telegram/bot/download"
import { settingsDp } from "#telegram/bot/settings"
import { statsDp } from "#telegram/bot/stats"
import { translatorFor } from "#telegram/helpers/i18n"
import { handleDispatcherError } from "#telegram/bot/errors"

export const dp = Dispatcher.for(bot)

dp.onError(handleDispatcherError)
dp.onNewMessage(filters.command("start"), async (msg) => {
    const t = await translatorFor(msg.sender)
    await msg.replyText(t("start"))
})

dp.extend(settingsDp)
dp.extend(statsDp)
dp.extend(downloadDp)

export { startBot } from "#telegram/bot/bot"

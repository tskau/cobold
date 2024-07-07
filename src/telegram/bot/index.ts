import { Dispatcher, filters } from "@mtcute/dispatcher"
import { downloadDp } from "#telegram/bot/download"
import { settingsDp } from "#telegram/bot/settings"
import { statsDp } from "#telegram/bot/stats"
import { translatorFor } from "#telegram/helpers/i18n"
import { createDispatcherErrorHandler } from "#telegram/bot/errors"
import { TelegramClient } from "@mtcute/node"
import { env } from "#telegram/helpers/env"

const bot = new TelegramClient({
    apiId: env.API_ID,
    apiHash: env.API_HASH,
    storage: "data/session",
    updates: {
        catchUp: true,
    },
})

const dp = Dispatcher.for(bot)

dp.onError(createDispatcherErrorHandler(bot))
dp.onNewMessage(filters.command("start"), async (msg) => {
    const t = await translatorFor(msg.sender)
    await msg.replyText(t("start"))
})

dp.extend(settingsDp)
dp.extend(statsDp)
dp.extend(downloadDp)

export const startBot = async () => {
    bot.run({ botToken: env.BOT_TOKEN }, async () => {
        if (env.ERROR_CHAT_ID)
            await bot.sendText(env.ERROR_CHAT_ID, "started bot :з")
    })
}

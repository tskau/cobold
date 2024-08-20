import { Dispatcher } from "@mtcute/dispatcher"
import { downloadDp } from "#telegram/bot/download"
import { settingsDp } from "#telegram/bot/settings"
import { statsDp } from "#telegram/bot/stats"
import { createDispatcherErrorHandler } from "#telegram/bot/errors"
import { TelegramClient } from "@mtcute/node"
import { env } from "#telegram/helpers/env"
import { startDp } from "#telegram/bot/start"

const bot = new TelegramClient({
    apiId: env.API_ID,
    apiHash: env.API_HASH,
    storage: "data/session",
})

const dp = Dispatcher.for(bot)

dp.onError(createDispatcherErrorHandler(bot))
dp.extend(settingsDp)
dp.extend(startDp)
dp.extend(statsDp)
dp.extend(downloadDp)

export const startBot = async () => {
    bot.run({ botToken: env.BOT_TOKEN }, async () => {
        if (env.ERROR_CHAT_ID)
            await bot.sendText(env.ERROR_CHAT_ID, "started bot :з")
    })
}

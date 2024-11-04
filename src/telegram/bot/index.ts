import { Dispatcher } from "@mtcute/dispatcher"
import { TelegramClient } from "@mtcute/node"

import { downloadDp } from "@/telegram/bot/download"
import { createDispatcherErrorHandler } from "@/telegram/bot/errors"
import { settingsDp } from "@/telegram/bot/settings"
import { startDp } from "@/telegram/bot/start"
import { statsDp } from "@/telegram/bot/stats"
import { env } from "@/telegram/helpers/env"

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

export async function startBot() {
    bot.run({ botToken: env.BOT_TOKEN }, async () => {
        if (env.ERROR_CHAT_ID)
            await bot.sendText(env.ERROR_CHAT_ID, "started bot :з")
    })
}

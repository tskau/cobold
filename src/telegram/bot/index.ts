import { Dispatcher, MemoryStateStorage } from "@mtcute/dispatcher"
import { TelegramClient } from "@mtcute/node"

import { downloadDp } from "@/telegram/bot/download"
import { createDispatcherErrorHandler } from "@/telegram/bot/errors"
import { infoDp } from "@/telegram/bot/info"
import { settingsDp } from "@/telegram/bot/settings"
import { startDp } from "@/telegram/bot/start"
import type { BotState } from "@/telegram/bot/state"
import { statsDp } from "@/telegram/bot/stats"
import { env } from "@/telegram/helpers/env"

const bot = new TelegramClient({
    apiId: env.API_ID,
    apiHash: env.API_HASH,
    storage: "data/session",
})

const dp = Dispatcher.for<BotState>(bot, {
    storage: new MemoryStateStorage(),
})

dp.onError(createDispatcherErrorHandler(bot))
dp.extend(settingsDp)
dp.extend(startDp)
dp.extend(statsDp)
dp.extend(infoDp)
dp.extend(downloadDp)

export async function startBot() {
    bot.start({ botToken: env.BOT_TOKEN })
        .then(async () => {
            if (env.ERROR_CHAT_ID)
                await bot.sendText(env.ERROR_CHAT_ID, "started bot :з")
        })
}

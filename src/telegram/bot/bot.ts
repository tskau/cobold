import { TelegramClient } from "@mtcute/node"
import { env } from "#telegram/helpers/env"

export const bot = new TelegramClient({
    apiId: env.API_ID,
    apiHash: env.API_HASH,
    storage: "data/session",
    updates: {
        catchUp: true,
    },
})

export const report = async (msg: string) => {
    if (env.ERROR_CHAT_ID)
        await bot.sendText(env.ERROR_CHAT_ID, msg)
}

export const startBot = async () => {
    bot.run({ botToken: env.BOT_TOKEN }, async () => {
        await report("Started bot")
    })
}

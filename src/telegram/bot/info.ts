import { Dispatcher, filters } from "@mtcute/dispatcher"
import { bugs, homepage, name, repository, version } from "@/../package.json"
import { env } from "@/telegram/helpers/env"
import { evaluatorsFor } from "@/telegram/helpers/text"

export const infoDp = Dispatcher.child()

infoDp.onNewMessage(
    filters.or(filters.command("info"), filters.deeplink(["info"])),
    async (msg) => {
        const { t } = await evaluatorsFor(msg.chat)
        const infoText = t("info", { bugs, name, repository, version, homepage })
        await msg.replyText(`${infoText}\n\n${env.ADDITIONAL_INFO}`)
    },
)

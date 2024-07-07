import { Dispatcher, filters } from "@mtcute/dispatcher"
import { translatorFor } from "#telegram/helpers/i18n"

export const startDp = Dispatcher.child()
startDp.onNewMessage(filters.command("start"), async (msg) => {
    const t = await translatorFor(msg.sender)
    await msg.replyText(t("start"))
})

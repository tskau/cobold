import { Dispatcher, filters } from "@mtcute/dispatcher"
import { translatorFor } from "@/telegram/helpers/i18n"

export const startDp = Dispatcher.child()
startDp.onNewMessage(filters.start, async (msg) => {
    const t = await translatorFor(msg.chat)
    await msg.replyText(t("start"))
})

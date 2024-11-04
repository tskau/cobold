import { Dispatcher, filters } from "@mtcute/dispatcher"

import { getDownloadStats } from "@/core/data/stats"
import { evaluatorsFor } from "@/telegram/helpers/text"

export const statsDp = Dispatcher.child()

statsDp.onNewMessage(filters.command("stats"), async (msg) => {
    const { t } = await evaluatorsFor(msg.sender)
    const count = await getDownloadStats()
    await msg.replyText(t("stats-global", { count }))
})

statsDp.onNewMessage(filters.command("mystats"), async (msg) => {
    const { t } = await evaluatorsFor(msg.sender)
    const id = msg.sender.id
    const count = await getDownloadStats(id)
    await msg.replyText(t("stats-personal", { count }))
})

import type { Peer } from "@mtcute/node"

import type { Text } from "@/core/utils/text"
import type { Translator } from "@/telegram/helpers/i18n"
import { translatorFor } from "@/telegram/helpers/i18n"

export type TextEvaluator = (text: Text) => string
export function evaluateText(translator: Translator, text: Text): string {
    if (text.type === "literal")
        return text.text
    if (text.type === "translatable")
        return translator(text.key, text.params)
    if (text.type === "compound")
        return text.content.map(t => evaluateText(translator, t)).join("")
    return ""
}

export type Evaluators = {
    t: Translator,
    e: TextEvaluator,
}
export async function evaluatorsFor(peer: Peer): Promise<Evaluators> {
    const t = await translatorFor(peer)
    const e = (text: Text) => evaluateText(t, text)
    return { t, e }
}

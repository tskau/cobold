import type { MessageContext } from "@mtcute/dispatcher"
import type { InputMediaLike } from "@mtcute/node"

export type SentMessage = {
    edit: (edit: { text?: string, media?: InputMediaLike }) => Promise<unknown>,
    flush: () => Promise<unknown>,
}

export async function replyText(ctx: MessageContext, ...params: Parameters<MessageContext["replyText"]>): Promise<SentMessage> {
    const reply = await ctx.replyText(...params)
    return {
        edit: args => ctx.client.editMessage({ ...args, message: reply }),
        flush: () => Promise.resolve(),
    }
}

export async function deferredReply(ctx: MessageContext, ...params: Parameters<MessageContext["replyText"]>): Promise<SentMessage> {
    let sent = false
    let media: InputMediaLike | null = null
    let text = params[0]
    const config: Parameters<MessageContext["replyText"]>[1] = params[1]
    return {
        edit: async (edit) => {
            if (edit.media)
                media = edit.media
            else
                text = edit.text ?? ""
        },
        flush: async () => {
            console.log("flush!")
            if (sent)
                throw new Error("Tried to send a deferred message that was already sent")
            sent = true
            if (media)
                await ctx.replyMedia(media, { caption: text })
            else
                await ctx.replyText(text, config)
        },
    }
}

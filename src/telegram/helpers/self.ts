let botId: number | undefined

export function setBotId(id: number) {
    botId = id
}

export function getBotId(): number | undefined {
    return botId
}

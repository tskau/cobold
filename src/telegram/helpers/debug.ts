import { randomUUID } from "node:crypto"
import { appendFileSync } from "node:fs"

const me = randomUUID()

export function log(str: string) {
    appendFileSync("data/log.txt", `${me}: ${str}\n`)
}

import process from "node:process"

import { startBot } from "@/telegram/bot"
import { log } from "@/telegram/helpers/debug"

log(`process started, avm: ${process.availableMemory()}, cpu: ${process.cpuUsage()}`)
void startBot()

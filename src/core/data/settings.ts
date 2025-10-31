import type { InferSelectModel } from "drizzle-orm"
import { eq } from "drizzle-orm"

import { db } from "@/core/data/db/database"
import { settings as settingsTable } from "@/core/data/db/schema"
import { outputOptions } from "@/core/data/request"
import { locales } from "@/core/utils/i18n"

export type Settings = Omit<InferSelectModel<typeof settingsTable>, "id">
export const customValue = Symbol("Custom value input prompt")

export const defaultSettings: Settings = {
    preferredOutput: null,
    preferredAttribution: 0,
    languageOverride: null,
    instanceOverride: null,
    videoFormat: "h264",
    videoQuality: "1080",
    audioFormat: "mp3",
    audioQuality: "128",
    sendAsFile: 0,
}

export const settingOptions: {
    [K in keyof Settings]: (Settings[K] | typeof customValue)[]
} = {
    preferredOutput: [null, ...outputOptions],
    preferredAttribution: [0, 1],
    languageOverride: [null, ...locales],
    instanceOverride: [null, customValue],
    videoFormat: ["h264", "h265", "av1", "vp9"],
    videoQuality: ["144", "240", "360", "480", "720", "1080", "1440", "2160", "max"],
    audioFormat: ["best", "mp3", "ogg", "wav", "opus"],
    audioQuality: ["8", "64", "96", "128", "256", "320"],
    sendAsFile: [0, 1],
}

export const settingI18n: {
    [K in keyof Settings]: { key: string, mode: "translatable" | "literal" }
} = {
    preferredOutput: { key: "output", mode: "translatable" },
    preferredAttribution: { key: "attribution", mode: "translatable" },
    languageOverride: { key: "lang", mode: "translatable" },
    instanceOverride: { key: "instance", mode: "literal" },
    videoFormat: { key: "video-format", mode: "translatable" },
    videoQuality: { key: "video-quality", mode: "literal" },
    audioFormat: { key: "audio-format", mode: "translatable" },
    audioQuality: { key: "audio-quality", mode: "literal" },
    sendAsFile: { key: "send-as-file", mode: "translatable" },
}

export async function getSettings(id: number): Promise<Settings> {
    const { id: _, ...settings } = await db.query.settings.findFirst({
        where: eq(settingsTable.id, id),
    }) || { id, ...defaultSettings }
    return settings
}

export function getSettingValues<K extends keyof Settings>(key: K) {
    return settingOptions[key]
}

export async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K], user: number) {
    const newData = await db.insert(settingsTable)
        .values({ id: user, [key]: value })
        .onConflictDoUpdate({ target: settingsTable.id, set: { [key]: value } })
        .returning()

    const { id: _, ...newSettings } = newData[0]
    return newSettings
}

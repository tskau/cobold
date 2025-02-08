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
}

export const settingOptions: {
    [K in keyof Settings]: (Settings[K] | typeof customValue)[]
} = {
    preferredOutput: [null, ...outputOptions],
    preferredAttribution: [0, 1],
    languageOverride: [null, ...locales],
    instanceOverride: [null, customValue],
}

export const settingI18n: {
    [K in keyof Settings]: { key: string, mode: "translatable" | "literal" }
} = {
    preferredOutput: { key: "output", mode: "translatable" },
    preferredAttribution: { key: "attribution", mode: "translatable" },
    languageOverride: { key: "lang", mode: "translatable" },
    instanceOverride: { key: "instance", mode: "literal" },
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

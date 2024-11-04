import { eq, InferSelectModel } from "drizzle-orm"
import { settings as settingsTable } from "@/core/data/db/schema"
import { locales } from "@/core/utils/i18n"
import { outputOptions } from "@/core/data/request"
import { db } from "@/core/data/db/database"

export type Settings = Omit<InferSelectModel<typeof settingsTable>, "id">

export const defaultSettings: Settings = {
    preferredOutput: null,
    preferredAttribution: 0,
    languageOverride: null,
}

export const settingOptions: {
    [K in keyof Settings]: Settings[K][]
} = {
    preferredOutput: [null, ...outputOptions],
    preferredAttribution: [0, 1],
    languageOverride: [null, ...locales],
}

export const settingI18n: {
    [K in keyof Settings]: { key: string, mode: "translatable" | "literal" }
} = {
    preferredOutput: { key: "output", mode: "translatable" },
    preferredAttribution: { key: "attribution", mode: "translatable" },
    languageOverride: { key: "lang", mode: "translatable" },
}

export const getSettings = async (id: number): Promise<Settings> => {
    const { id: _, ...settings } = await db.query.settings.findFirst({
        where: eq(settingsTable.id, id),
    }) || { id, ...defaultSettings }
    return settings
}

export const updateSetting = async (key: string, current: Settings, user: number) => {
    const validKey = key as keyof Settings

    const thisSettingOptions = settingOptions[validKey] as (typeof settingOptions[typeof validKey][number])[] | null
    if (!thisSettingOptions) return // Invalid key

    const currentIndex = thisSettingOptions.indexOf(current[validKey])
    const newIndex = (currentIndex + 1) % thisSettingOptions.length
    const newOption = thisSettingOptions[newIndex]

    const newData = await db.insert(settingsTable)
        .values({ id: user, [validKey]: newOption })
        .onConflictDoUpdate({ target: settingsTable.id, set: { [validKey]: newOption } })
        .returning()

    const { id: _, ...newSettings } = newData[0]
    return newSettings
}

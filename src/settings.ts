import { eq, InferSelectModel } from "drizzle-orm"
import { users } from "#db/schema"
import { i18n } from "#i18n"
import { outputOptions } from "#handler"
import { db } from "#db"
import { Context, MiddlewareFn } from "grammy"
import { literal, translatable } from "#text"
import { I18nFlavor } from "@grammyjs/i18n"

export const settingCallbackPrefix = "setting"
export type Settings = Omit<InferSelectModel<typeof users>, "id">
export type SettingsFlavor = {
    userSettings: Settings,
}

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
    languageOverride: [null, ...i18n.locales],
}

export const settingI18n: {
    [K in keyof Settings]: { key: string, mode: "translatable" | "literal" }
} = {
    preferredOutput: { key: "output", mode: "translatable" },
    preferredAttribution: { key: "attribution", mode: "translatable" },
    languageOverride: { key: "lang", mode: "literal" },
}

type SettingsEntries = [keyof Settings, Settings[keyof Settings]][]

export const getSettingsMenu = (settings: Settings) => {
    return (Object.entries(settings) as SettingsEntries)
        .map(([key, value]) => {
            const i18nData = settingI18n[key]
            const settingKey = `setting-${i18nData.key}`
            const valueText = value === null
                ? translatable(`${settingKey}-unset`)
                : i18nData.mode === "translatable"
                    ? translatable(`${settingKey}-${value}`)
                    : literal(String(value))
            return {
                title: translatable(settingKey),
                value: valueText,
                key: `${settingCallbackPrefix}:${key}`,
            }
        })
}

const getSettings = async (id?: number | null) => {
    if (id === null || id === undefined) return defaultSettings
    const { id: _, ...settings } = await db.query.users.findFirst({
        where: eq(users.id, id),
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

    const newData = await db.insert(users)
        .values({ id: user, [validKey]: newOption })
        .onConflictDoUpdate({ target: users.id, set: { [validKey]: newOption } })
        .returning()

    const { id: _, ...newSettings } = newData[0]
    return newSettings
}

export const settingsMiddleware: MiddlewareFn<Context & SettingsFlavor & I18nFlavor> = async (ctx, next) => {
    ctx.userSettings = await getSettings(ctx.from?.id)
    if (ctx.userSettings.languageOverride)
        ctx.i18n.useLocale(ctx.userSettings.languageOverride)
    await next()
}

import type { Peer } from "@mtcute/node"
import { CallbackDataBuilder } from "@mtcute/dispatcher"

import type { Settings } from "@/core/data/settings"
import { customValue, defaultSettings, getSettings, getSettingValues, settingI18n } from "@/core/data/settings"
import { compound, literal, translatable } from "@/core/utils/text"

type SettingsEntries = [keyof Settings, Settings[keyof Settings]][]
export const SettingButton = new CallbackDataBuilder("setting", "setting")
export const SettingUpdateButton = new CallbackDataBuilder("set", "setting", "value")
export const getSettingsMenu = (settings: Settings) => {
    const options = (Object.entries(settings) as SettingsEntries)
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
                key: SettingButton.build({ setting: key }),
            }
        })
    return { title: translatable("settings-title"), options }
}

export const getSettingMenu = (settings: Settings, key: keyof Settings) => {
    const i18nData = settingI18n[key]
    const settingKey = `setting-${i18nData.key}`
    const settingButtons = getSettingValues(key).map((value, i) => {
        const current = settings[key]
        const valueText = value === null
            ? translatable(`${settingKey}-unset`)
            : value === customValue
                ? translatable(`${settingKey}-custom`)
                : i18nData.mode === "translatable"
                    ? translatable(`${settingKey}-${value}`)
                    : literal(String(value))
        return {
            value: current === value ? compound(literal("• "), valueText) : valueText,
            key: SettingUpdateButton.build({ setting: key, value: String(i) }),
        }
    })
    const options = [...settingButtons, {
        value: translatable("setting-back"),
        key: SettingButton.build({ setting: "back" }),
    }]
    return {
        title: translatable(settingKey),
        options,
    }
}

export const getPeerSettings = async (user: Peer) => getSettings(user.id)

export const isValidSettingKey = (key: string): key is keyof Settings => key in defaultSettings

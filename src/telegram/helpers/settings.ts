import { CallbackDataBuilder } from "@mtcute/dispatcher"
import { literal, translatable } from "@/core/utils/text"
import { getSettings, settingI18n, Settings } from "@/core/data/settings"
import { Peer } from "@mtcute/node"

type SettingsEntries = [keyof Settings, Settings[keyof Settings]][]
export const SettingButton = new CallbackDataBuilder("setting", "setting")
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
                key: SettingButton.build({ setting: key }),
            }
        })
}

export const getPeerSettings = async (user: Peer) => {
    return await getSettings(user.id)
}

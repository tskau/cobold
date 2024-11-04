import type { Peer } from "@mtcute/node"
import { CallbackDataBuilder } from "@mtcute/dispatcher"

import type { Settings } from "@/core/data/settings"
import { getSettings, settingI18n } from "@/core/data/settings"
import { literal, translatable } from "@/core/utils/text"

type SettingsEntries = [keyof Settings, Settings[keyof Settings]][]
export const SettingButton = new CallbackDataBuilder("setting", "setting")
export const getSettingsMenu = (settings: Settings) => (Object.entries(settings) as SettingsEntries)
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

export const getPeerSettings = async (user: Peer) => getSettings(user.id)

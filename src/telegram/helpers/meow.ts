const MEOW_REGEX = /^(?:\s?m+(?:i+a+(?:u+|o*w+)|r{2,}|r+(?:[ae]?o+w+|p+)|e+a*o*w+))+(?:\s*:[3з])*$/
const NYA_REGEX = /^(?:\s?n+y+a+)+(?:\s*:[3з])*$/
const PURR_REGEX = /^(?:\s?p+u+r+)+(?:\s*:[3з])*$/
const AWAWAWAW_REGEX = /^aw[aw]{3,}(?:\s*:[3з])*$/

export function mrowCheck(text: string): string | null {
    const msgPrepped = text.toLowerCase().trim()

    if (MEOW_REGEX.test(msgPrepped)) {
        return "meow :з"
    }

    if (NYA_REGEX.test(msgPrepped)) {
        return "pat-pat :з"
    }

    if (PURR_REGEX.test(msgPrepped)) {
        return "meaaaauuuu (miau)"
    }

    if (AWAWAWAW_REGEX.test(msgPrepped)) {
        return "awawawawawawawwwawawawawawawawawaw"
    }

    return null
}

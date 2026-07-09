export function mrowCheck(text: string): "meow" | "nya" | "purr" | "awawawa" | undefined {
    const msgPrepped = text.toLowerCase().trim()
    const meowRegex = /^(?:\s?m+(?:i+a+(?:u+|o*w+)|r{2,}|r+(?:[ae]?o+w+|p+)|e+a*o*w+))+(?:\s*:[3з])*$/
    const nyaRegex = /^(?:\s?n+y+a+)+(?:\s*:[3з])*$/
    const purrRegex = /^(?:\s?p+u+r+)+(?:\s*:[3з])*$/
    const awawawwwRegex = /^aw[aw]{3,}(?:\s*:[3з])*$/

    switch (true) {
        case meowRegex.test(msgPrepped): return "meow"
        case nyaRegex.test(msgPrepped): return "nya"
        case purrRegex.test(msgPrepped): return "purr"
        case awawawwwRegex.test(msgPrepped): return "awawawa"
    }
}

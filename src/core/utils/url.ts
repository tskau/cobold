import * as dns from "node:dns/promises"

import ipaddr from "ipaddr.js"
import { z } from "zod"

export const safeUrlSchema = z
    .string()
    .url()
    .refine(async (u) => {
        if (!URL.canParse(u))
            return false
        const url = new URL(u)
        if (ipaddr.isValid(url.hostname) && ipaddr.parse(url.hostname).range() !== "unicast")
            return false
        const res = await dns.lookup(url.hostname, { all: true }).catch(() => null)
        if (!res || !res.every(i => ipaddr.parse(i.address).range() === "unicast"))
            return false
        return url.protocol === "https:"
    })
    .nullable()

export const urlWithAuthSchema = z
    .string()
    .url()
    .transform((u) => {
        const url = new URL(u)
        if (!url.username && !url.password)
            return { url: u }
        const auth = url.password ? `${url.username} ${url.password}` : url.username
        url.username = ""
        url.password = ""
        return { url: url.href, auth }
    })

const mediaUrlSchema = z.string().url()
export function tryParseUrl(url: string) {
    const originalParsed = mediaUrlSchema.safeParse(url)
    if (originalParsed.success)
        return originalParsed.data

    const domain = url.split("/")[0]
    if (!domain.includes(".") || domain.includes(" ") || domain.includes(":"))
        return null

    const withHttpsParsed = mediaUrlSchema.safeParse(`https://${url}`)
    if (withHttpsParsed.success)
        return withHttpsParsed.data

    return null
}

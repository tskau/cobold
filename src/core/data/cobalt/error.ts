import { z } from "zod"
import { compound, literal, translatable } from "@/core/utils/text"

export const genericErrorSchema = z.object({
    status: z.literal("error"),
    error: z.object({
        code: z.string(),
    }),
})
export type GenericCobaltError = z.infer<typeof genericErrorSchema>

export const cobaltErrors = new Map([
    ["service.unsupported", "error-invalid-url"],
    ["service.disabled", "error-invalid-url"],
    ["link.invalid", "error-invalid-url"],
    ["link.unsupported", "error-invalid-url"],

    ["content.too_long", "error-too-large"],

    ["content.video.unavailable", "error-media-unavailable"],
    ["content.video.live", "error-media-unavailable"],
    ["content.video.private", "error-media-unavailable"],
    ["content.video.age", "error-media-unavailable"],
    ["content.video.region", "error-media-unavailable"],
    ["content.post.unavailable", "error-media-unavailable"],
    ["content.post.private", "error-media-unavailable"],
    ["content.post.age", "error-media-unavailable"],
].map(([k, v]) => [`error.api.${k}`, v]))

export function getErrorText(cobaltErrorKey: string) {
    const errorKey = cobaltErrors.get(cobaltErrorKey)
    if (errorKey)
        return translatable(errorKey)
    return compound(translatable("error-invalid-response"), literal(` [${cobaltErrorKey}]`))
}

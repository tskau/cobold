export type Result<T, E = string> = {
    success: true,
    result: T,
} | {
    success: false,
    error: E,
}

export const error = <T, E = string>(error: E): Result<T, E> => ({
    success: false as const,
    error,
})

export const ok = <T, E = string>(result: T): Result<T, E> => ({
    success: true as const,
    result,
})

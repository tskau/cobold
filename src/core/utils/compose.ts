export const stack = <T>(...objects: (T | null | false | undefined)[]) =>
    objects.filter((h): h is T => !!h)

export const merge = <T>(...objs: (T | null | false | undefined)[]) =>
    objs.reduce(
        (p, c) => c ? ({ ...p, ...c }) : p,
        {},
    )

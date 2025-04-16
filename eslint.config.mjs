import antfu from "@antfu/eslint-config"

export default antfu({
    stylistic: {
        indent: 4,
        quotes: "double",
    },
    typescript: {
        overrides: {
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        },
    },
    jsonc: false,
}, {
    rules: {
        "perfectionist/sort-imports": ["error", {
            groups: [
                "type",
                ["parent-type", "sibling-type", "index-type"],

                "builtin",
                "external",
                ["internal", "internal-type"],
                ["parent", "sibling", "index"],
                "side-effect",
                "object",
                "unknown",
            ],
            newlinesBetween: "ignore",
            order: "asc",
            type: "natural",
            internalPattern: ["^@/"],
        }],
        "style/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "comma",
                requireLast: true,
            },
            singleline: {
                delimiter: "comma",
                requireLast: false,
            },
        }],
        "no-console": ["off"],
        "style/brace-style": ["error", "1tbs", {
            allowSingleLine: true,
        }],
        "antfu/top-level-function": ["off"],
    },
})

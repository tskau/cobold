// eslint-disable-next-line @typescript-eslint/no-var-requires
const stylistic = require("@stylistic/eslint-plugin")

const customized = stylistic.configs.customize({
    indent: 4,
    quotes: "double",
    semi: false,
    jsx: true,
})

module.exports = {
    root: true,
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        sourceType: "module",
    },
    env: {
        node: true,
        es2022: true,
    },
    plugins: [
        "@stylistic",
        "@typescript-eslint",
    ],
    rules: {
        ...customized.rules,
        "@stylistic/jsx-one-expression-per-line": "off",
        "@stylistic/max-len": ["warn", 120],
        "@stylistic/no-trailing-spaces": ["error", { skipBlankLines: true }],
        "@stylistic/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "comma",
                requireLast: true,
            },
            singleline: {
                delimiter: "comma",
                requireLast: false,
            },
        }],
        "@stylistic/multiline-ternary": "off",
        "@stylistic/brace-style": ["error", "1tbs", {
            allowSingleLine: true,
        }],
        "@typescript-eslint/no-unused-vars": [
            "error",
            { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
    },
}

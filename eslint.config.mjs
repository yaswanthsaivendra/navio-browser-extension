import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default [
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                chrome: "readonly",
                browser: "readonly",
                console: "readonly",
                document: "readonly",
                window: "readonly",
                self: "readonly",
                Element: "readonly",
                Node: "readonly",
                XPathResult: "readonly",
                MouseEvent: "readonly",
                HTMLInputElement: "readonly",
                HTMLButtonElement: "readonly",
                HTMLAnchorElement: "readonly",
                HTMLDivElement: "readonly",
                HTMLTextAreaElement: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                prompt: "readonly",
                alert: "readonly",
                React: "readonly",
                MutationObserver: "readonly",
                KeyboardEvent: "readonly",
                HTMLElement: "readonly",
                URL: "readonly",
                XPathResult: "readonly",
                ShadowRoot: "readonly",
                ResizeObserver: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,

            // TypeScript specific
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_"
            }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",

            // React specific
            "react/react-in-jsx-scope": "off", // Not needed in React 18+
            "react/prop-types": "off", // Using TypeScript for prop validation
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // General best practices
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "prefer-const": "error",
            "no-var": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"],
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
    prettierConfig, // Disables ESLint rules that conflict with Prettier
    {
        ignores: [
            "node_modules/**",
            "build/**",
            "dist/**",
            "*.config.js",
            "*.config.mjs",
            "*.config.ts",
        ],
    },
];

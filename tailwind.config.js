/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./src/popup/index.html",
        "./src/content/components/**/*.{tsx,ts}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            // Colors and fonts are now defined in CSS using @theme directive (Tailwind v4)
            // Keeping keyframes and animations here as they're not part of @theme
            fontFamily: {
                sans: ["var(--font-geist-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
                mono: ["var(--font-geist-mono)", "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", "monospace"],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [],
}


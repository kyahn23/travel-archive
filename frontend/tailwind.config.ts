import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── shadcn semantic tokens ── */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        /* ── brand palette ── */
        cream: {
          50: "#FFFDF8",
          100: "#FFF8EC",
          200: "#FFF0D4",
          300: "#FFE4B5",
          400: "#FFD48A",
          500: "#FFC060",
        },
        coral: {
          50: "#FFF5F3",
          100: "#FFE8E3",
          200: "#FFD0C7",
          300: "#FFB0A0",
          400: "#FF8A73",
          500: "#FF6B54",
          600: "#E8523B",
          700: "#C43D28",
        },
        teal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
        },
        sand: {
          50: "#FAFAF5",
          100: "#F5F5EB",
          200: "#EBE9D9",
          300: "#DDD9C4",
          400: "#C9C3A5",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "display-lg": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display": ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "title-lg": ["1.5rem", { lineHeight: "1.3" }],
        "title": ["1.25rem", { lineHeight: "1.4" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.6" }],
        "body": ["0.9375rem", { lineHeight: "1.6" }],
        "caption": ["0.8125rem", { lineHeight: "1.5" }],
        "micro": ["0.75rem", { lineHeight: "1.4" }],
      },
      spacing: {
        "touch": "44px",
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      screens: {
        xs: "360px",
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
      },
      boxShadow: {
        "soft": "0 2px 8px -2px rgba(0,0,0,0.06), 0 4px 12px -4px rgba(0,0,0,0.04)",
        "card": "0 1px 3px 0 rgba(0,0,0,0.04), 0 4px 16px -4px rgba(0,0,0,0.06)",
        "nav": "0 -1px 8px 0 rgba(0,0,0,0.06)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

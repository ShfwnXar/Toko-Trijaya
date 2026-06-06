import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2BBCB3",
          50: "#E8F8F7",
          100: "#D1F1EF",
          200: "#A3E3DF",
          300: "#75D5CF",
          400: "#47C7BF",
          500: "#2BBCB3",
          600: "#23968F",
          700: "#1A716B",
          800: "#124B47",
          900: "#092624",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1E6CB5",
          50: "#E8F1FA",
          100: "#D1E3F5",
          200: "#A3C7EB",
          300: "#75ABE1",
          400: "#478FD7",
          500: "#1E6CB5",
          600: "#185691",
          700: "#12416D",
          800: "#0C2B49",
          900: "#061624",
          foreground: "#FFFFFF",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;

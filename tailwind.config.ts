import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm, editorial neutral scale (spec §9.1 / §14). Tenant themes override
        // --brand / --accent CSS variables at runtime; these are the platform
        // defaults and the fallback palette.
        brand: {
          50: "#faf7f2",
          100: "#f1ebe1",
          200: "#e2d6c5",
          300: "#cdb99f",
          400: "#a98a67",
          500: "#7b5d45",
          600: "#654a37",
          700: "#513b2c",
          800: "#372820",
          900: "#241b14"
        },
        accent: {
          50: "#fbf3e6",
          100: "#f6e4c8",
          200: "#eecb98",
          300: "#e0ad63",
          400: "#cd9040",
          500: "#b4762a",
          600: "#96601f",
          700: "#734917",
          800: "#513412",
          900: "#33210c"
        },
        // Semantic status colors (accessible on the warm background).
        success: { soft: "#e4eee6", DEFAULT: "#3f7d52", strong: "#2c5c3b" },
        warning: { soft: "#f7ecd2", DEFAULT: "#a9791d", strong: "#7c5710" },
        danger: { soft: "#f6e0e0", DEFAULT: "#b0413e", strong: "#832f2d" },
        info: { soft: "#e5ebf4", DEFAULT: "#3f5c86", strong: "#2c4361" }
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem"
      },
      boxShadow: {
        // Restrained shadows per §9.1 — "limited rounded cards and restrained shadows".
        card: "0 1px 2px rgba(36,27,20,0.04), 0 2px 8px rgba(36,27,20,0.06)",
        lift: "0 10px 30px -12px rgba(36,27,20,0.22)",
        pop: "0 24px 60px -24px rgba(36,27,20,0.28)"
      },
      maxWidth: {
        content: "72rem"
      }
    }
  },
  plugins: []
};

export default config;

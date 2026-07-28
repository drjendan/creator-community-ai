import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F8FAFC", 100: "#F1F5F9", 200: "#CBD5E1", 300: "#94A3B8",
          400: "#64748B", 500: "#475569", 600: "#334155", 700: "#1E293B",
          800: "#101936", 900: "#08112B", 950: "#03071E"
        },
        accent: {
          50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD",
          400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9",
          800: "#5B21B6", 900: "#4C1D95"
        },
        highlight: {
          50: "#ECFEFF", 100: "#CFFAFE", 200: "#A5F3FC", 300: "#67E8F9",
          400: "#22D3EE", 500: "#06B6D4", 600: "#0891B2", 700: "#0E7490",
          800: "#155E75", 900: "#164E63"
        },
        success: { soft: "#F0FDF4", DEFAULT: "#22C55E", strong: "#166534" },
        warning: { soft: "#FFFBEB", DEFAULT: "#F59E0B", strong: "#92400E" },
        danger: { soft: "#FEF2F2", DEFAULT: "#EF4444", strong: "#991B1B" },
        info: { soft: "#ECFEFF", DEFAULT: "#06B6D4", strong: "#155E75" }
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      borderRadius: { sm: "0.5rem", DEFAULT: "0.75rem", lg: "1rem", xl: "1.5rem", "2xl": "2rem" },
      boxShadow: {
        card: "0 1px 2px rgba(3,7,30,.05), 0 10px 28px rgba(8,17,43,.08)",
        lift: "0 18px 42px -18px rgba(76,29,149,.34)",
        pop: "0 32px 80px -30px rgba(3,7,30,.5)",
        glow: "0 14px 38px -16px rgba(124,58,237,.72)"
      },
      maxWidth: { content: "72rem" }
    }
  },
  plugins: []
};

export default config;

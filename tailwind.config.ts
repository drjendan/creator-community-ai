import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#faf7f2",
          100: "#f1ebe1",
          200: "#e2d6c5",
          500: "#7b5d45",
          700: "#513b2c",
          900: "#241b14"
        },
        accent: {
          500: "#b4762a",
          600: "#96601f"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

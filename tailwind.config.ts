import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFAF4",
          100: "#F8F4EC",
          200: "#F0E8D8",
          300: "#E8DAC4",
        },
        ink: {
          DEFAULT: "#1C1A18",
          light: "#3D3830",
          muted: "#6B6357",
          faint: "#9C9187",
        },
        gold: {
          DEFAULT: "#B8922A",
          light: "#D4AA4A",
          dark: "#8B6914",
        },
      },
      fontFamily: {
        serif: ["Noto Serif JP", "Georgia", "serif"],
        sans: ["Noto Sans JP", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
      letterSpacing: {
        widest: "0.25em",
        ultrawide: "0.4em",
      },
    },
  },
  plugins: [],
};
export default config;

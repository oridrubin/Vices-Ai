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
        clay: "#C25A3A",
        gold: "#D8A53C",
        plum: "#9C5B82",
        ocean: "#3C97A6",
        brand: "#1FD173",
        spend: "#3B82F6",
        danger: "#F0524B",
        neonpink: "#FF007F",
        neonpink2: "#FF0066",
        electricyellow: "#FFF200",
        synthblue: "#0D0025",
        synthpurple: "#1A0040",
        synthcard: "#120030",
        synthdark: "#08001A",
        neonblue: "#00F0FF",
        neongreen: "#00FF88",
      },
      fontFamily: {
        arcade: ["'Press Start 2P'", "monospace"],
        mono: ["'Share Tech Mono'", "monospace"],
      },
      boxShadow: {
        neonpink: "0 0 10px #FF007F, 0 0 30px #FF007F44",
        neonpink2: "0 0 5px #FF007F, 0 0 20px #FF007F66, 0 0 40px #FF007F33",
        neonblue: "0 0 10px #00F0FF, 0 0 30px #00F0FF44",
        neonyellow: "0 0 10px #FFF200, 0 0 30px #FFF20044",
      },
    },
  },
  plugins: [],
};
export default config;

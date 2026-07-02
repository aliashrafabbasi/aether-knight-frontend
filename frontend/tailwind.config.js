/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Rajdhani", "sans-serif"],
      },
      colors: {
        jarvis: {
          bg: "#020617",
          cyan: "#00d4ff",
          blue: "#38bdf8",
          glow: "#e0f2fe",
        },
      },
      boxShadow: {
        jarvis: "0 0 30px rgba(0, 212, 255, 0.35)",
        "jarvis-lg": "0 0 60px rgba(0, 212, 255, 0.45)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        breathe: "breathe 4s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.98)" },
          "50%": { opacity: "0.7", transform: "scale(1.02)" },
        },
      },
    },
  },
  plugins: [],
};

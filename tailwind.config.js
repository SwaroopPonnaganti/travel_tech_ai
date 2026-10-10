/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070d1f",
          900: "#0a142e",
          850: "#0d1a3a",
          800: "#102148",
          700: "#16305f",
          600: "#1d3f7a",
          500: "#27549c",
        },
        teal: {
          400: "#2dd4bf",
          450: "#25c9b4",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(3, 8, 24, 0.45)",
        glow: "0 0 0 1px rgba(45, 212, 191, 0.25), 0 12px 30px rgba(20, 184, 166, 0.15)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up .35s ease-out both",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};

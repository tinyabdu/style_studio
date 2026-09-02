/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Figma-esque neutral scale + violet accent
        surface: {
          950: "#0e0e11",
          900: "#151519",
          800: "#1b1b21",
          700: "#232329",
          600: "#2c2c34",
          500: "#3a3a44",
          400: "#54545f",
          300: "#7a7a87",
          200: "#a8a8b3",
          100: "#d4d4da",
          50: "#f4f4f6",
        },
        accent: {
          DEFAULT: "#6C5CE7",
          hover: "#7d6ef0",
          muted: "#6C5CE733",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
        floating: "0 4px 16px rgba(0,0,0,0.4)",
      },
      borderRadius: {
        xl2: "14px",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "slide-up": { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

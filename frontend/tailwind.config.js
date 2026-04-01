/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0f172a",
        accent: "#38bdf8",
        critical: "#f43f5e",
        success: "#22c55e"
      }
    }
  },
  plugins: []
};

/**
 * Tailwind CSS Configuration
 * Defines theme customizations and content paths for Tailwind CSS
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: "class",
  content: ["!./node_modules", "./index.html", "./**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#0c0a09",
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0a2e5c',
        secondary: '#c8972c',
        accent: '#f0f4f8',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pms: {
          50: '#fcfbf4',
          100: '#f7f5e3',
          200: '#eee6c2',
          300: '#e3d197',
          400: '#d6b769',
          500: '#c59d45', // Gold Primary
          600: '#a87e33',
          700: '#865f29',
          800: '#6f4d27',
          900: '#5c4024',
          orange: '#D97706', // Accent for Construction (Darker Orange/Gold)
        }
      }
    },
  },
  plugins: [],
}
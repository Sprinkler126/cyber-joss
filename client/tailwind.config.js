/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: '#ff4400',
        'ember-dark': '#cc3300',
        'cyber-dark': '#0a0a0a',
        'flame-yellow': '#ffaa00',
        'flame-orange': '#ff5500',
        'flame-red': '#cc2200',
      },
    },
  },
  plugins: [],
}

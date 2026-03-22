/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        paper: {
          bg: '#ede8df',
          topbar: '#faf6ef',
          border: '#ddd5c4',
        },
      },
    },
  },
  plugins: [],
}

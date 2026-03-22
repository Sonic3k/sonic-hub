/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        sidebar: {
          bg: '#0f1117',
          hover: '#1a1d27',
          border: '#1e2130',
          text: '#8b92a8',
          active: '#e2e8f0',
        },
        content: {
          bg: '#f8f9fc',
          card: '#ffffff',
          border: '#e8eaf0',
        },
        brand: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
      },
    },
  },
  plugins: [],
}

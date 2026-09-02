/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Every colour is a CSS variable so a route can swap the whole palette
      // (Rosé Pine for reading, light neutral for photos) with one attribute.
      colors: {
        bg:     'var(--bg)',
        sur:    'var(--sur)',
        raise:  'var(--raise)',
        ink:    'var(--ink)',
        ink2:   'var(--ink-2)',
        line:   'var(--line)',
        accent: 'var(--accent)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

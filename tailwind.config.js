/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      minHeight: {
        touch: '56px',
      },
      fontSize: {
        order: ['64px', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}

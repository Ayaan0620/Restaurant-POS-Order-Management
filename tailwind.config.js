/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        // Warm, food-market brand accent (a spiced amber) used for primary actions.
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      minHeight: {
        touch: '52px',
      },
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.75rem',
      },
      fontSize: {
        order: ['64px', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}

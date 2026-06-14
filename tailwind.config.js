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
        // Single restrained brand accent used for primary actions.
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
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

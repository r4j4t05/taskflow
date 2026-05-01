/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dde8ff',
          200: '#c4d4ff',
          400: '#7b9fff',
          500: '#4d7cfe',
          600: '#2b5be8',
          700: '#1a3dcc',
          800: '#1230a0',
          900: '#0d2070',
        }
      }
    }
  },
  plugins: []
}

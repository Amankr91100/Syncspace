/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#0a0d18',
          800: '#10142260',
          700: '#161b2e',
          600: '#1e2438',
          500: '#2a3149',
        },
        iris: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        azure: {
          400: '#60a5fa',
          500: '#3b82f6',
        },
      },
      boxShadow: {
        lift: '0 18px 40px -20px rgba(8, 10, 22, 0.75)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        rise: 'rise .22s ease-out',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};

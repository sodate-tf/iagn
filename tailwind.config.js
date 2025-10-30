/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'gray-900': '#121212',
        'gray-800': '#1E1E1E',
        'gray-700': '#2C2C2C',
        'gray-600': '#3E3E3E',
        'gray-400': '#A0A0A0',
        'gray-200': '#E0E0E0',
        'primary': '#6366F1',
        'primary-hover': '#4F46E5',
        'secondary': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

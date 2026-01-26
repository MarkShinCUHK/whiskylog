/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // 위스키 테마 색상
        whiskey: {
          50: '#fef8f0',
          100: '#fef0d9',
          200: '#fcdeb3',
          300: '#f9c582',
          400: '#f5a84d',
          500: '#f18a1c', // Primary
          600: '#d97706', // Hover
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        main: {
          sidebar: '#4A1C00',
          header: '#6B2D0E',
          bg: '#FFF3E0',
          accent: '#B85C00',
          active: '#FF8C00',
          text: '#3E1A00',
        },
        partner: {
          sidebar: '#0B3D0B',
          header: '#1B6B1B',
          bg: '#F0FFF0',
          accent: '#2D8A2D',
          active: '#FF8C00',
          text: '#0B3D0B',
        },
      },
    },
  },
  plugins: [],
};

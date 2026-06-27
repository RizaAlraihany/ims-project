/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ims: {
          navy: '#111844',
          blue: '#4B5694',
          slate: '#7288AE',
          cream: '#EAE0CF',
          danger: '#B91C1C',
          warning: '#D97706',
          success: '#047857',
        },
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6B21A8',
        accent: '#06B6D4',
      },
    },
  },
  plugins: [],
} as Config
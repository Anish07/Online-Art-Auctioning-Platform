/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#6B21A8",
        accent: "#06B6D4",
        'hf-bg': '#0b0f19',
        'hf-card': '#1c1f2e',
        'hf-yellow': '#FFD21E',
        'hf-text': '#F5F5F5',
        'hf-muted': '#9CA3AF'
      }
    }
  },
  plugins: []
}
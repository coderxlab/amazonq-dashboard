/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'amazon-teal': '#00A1C9',
        'amazon-teal-dark': '#0088A9',
        'amazon-orange': '#FF9900',
      },
    },
  },
  plugins: [],
}

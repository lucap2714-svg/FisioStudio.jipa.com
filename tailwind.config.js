/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#a4b6c1',
          bg: '#f7f0ea',
          dark: '#8297a3',
          light: '#d2dbe0',
          slate: '#1e293b',
        },
      },
    },
  },
  plugins: [],
};

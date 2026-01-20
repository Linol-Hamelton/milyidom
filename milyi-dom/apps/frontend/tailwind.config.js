/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#f9f6f1",
          100: "#f2ecdf",
          200: "#e5d9c1",
          300: "#d9c5a2",
          400: "#c2a574",
          500: "#aa8550",
          600: "#8b663a",
          700: "#6d4f2d",
          800: "#513a20",
          900: "#392713",
        },
        pine: {
          50: "#ecf5f2",
          100: "#d0e6dd",
          200: "#a3cec2",
          300: "#78b6a6",
          400: "#4d9c89",
          500: "#2f7f6c",
          600: "#236255",
          700: "#1b4c42",
          800: "#143630",
          900: "#0d231f",
        },
      },
      maxWidth: {
        "content-lg": "1200px",
      },
      boxShadow: {
        soft: "0 30px 60px -35px rgba(23, 32, 42, 0.35)",
      },
      backgroundImage: {
        "radial-light":
          "radial-gradient(circle at top, rgba(255,255,255,0.8), rgba(255,255,255,0))",
      },
    },
  },
  plugins: [],
};

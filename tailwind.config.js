/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080b10",
        panel: "#101722",
        panel2: "#151f2d",
        line: "#253246",
        cyan: "#44d7ff",
        mint: "#45e0a8",
        amber: "#ffbf4d",
        rose: "#ff5d7a"
      }
    }
  },
  plugins: []
};

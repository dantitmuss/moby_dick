// tailwind.config.js
module.exports = {
  content: [
    "./*.html",           // We'll test with a root-level test.html
    "./templates/*.html", // Your actual Flask templates
    "./templates/**/*.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
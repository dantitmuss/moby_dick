// tailwind.config.js
module.exports = {
  content: [
    "./*.html",           // We'll test with a root-level test.html
    "./templates/*.html", // Your actual Flask templates
    "./templates/**/*.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        imfell: ['"IM Fell English"', 'serif'],
        // Make it the default serif font
        serif: ['"IM Fell English"', 'serif'],
      },
    },
  },
  plugins: [],
}
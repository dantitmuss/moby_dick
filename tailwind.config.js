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
        // Oracle redesign type stack (see static/oracle.css for the full system)
        serif: ['Spectral', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      animation: {
        fade: "fadeIn 1s ease-in-out",
        fadeSlow: 'fadeIn 3s ease-in forwards', 
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
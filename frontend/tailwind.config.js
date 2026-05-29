/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        'surface-highlight': '#f1f5f9',
        primary: '#FF7A00',
        'primary-glow': 'rgba(255, 122, 0, 0.25)',
        secondary: '#FF9533',
        text: '#0f172a',
        'text-muted': '#64748b',
        border: '#e2e8f0'
      },
      fontFamily: {
        sans: ['"TWK Everett"', 'system-ui', 'sans-serif'],
        display: ['"TWK Everett"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(circle at 50% 50%, rgba(255, 122, 0, 0.12) 0%, rgba(248, 250, 252, 0) 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}

import defaultTheme from 'tailwindcss/defaultTheme';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#040f26',
        'night-secondary': 'rgba(6, 24, 48, 0.94)',
        'night-elevated': 'rgba(8, 29, 62, 0.92)',
        accent: '#00c6ff',
        'accent-alt': '#0b4dff',
        'accent-soft': 'rgba(0, 176, 255, 0.2)',
        success: '#28f1b9',
        danger: '#ff5f7a',
        warning: '#ffc857'
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono]
      },
      boxShadow: {
        'glow-lg': '0 18px 48px rgba(1, 10, 32, 0.5)',
        'glow-soft': '0 10px 26px rgba(3, 20, 46, 0.32)'
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;

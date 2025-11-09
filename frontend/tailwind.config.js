import defaultTheme from 'tailwindcss/defaultTheme';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#00c6ff',
        'accent-alt': '#0b4dff',
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

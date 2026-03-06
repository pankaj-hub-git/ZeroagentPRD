/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07071A',
        surface: '#0D0D20',
        border: 'rgba(255,255,255,0.03)',
        gold: '#C9A84C',
        'text-primary': '#E8ECF1',
        'text-secondary': '#8892A4',
        'text-dim': '#3A3F52',
        verified: '#27AE60',
        warn: '#F39C12',
        danger: '#E74C3C',
        info: '#2E75B6',
        conflict: '#8E44AD',
        narrative: '#95A5A6',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      fontSize: {
        heading: '22px',
        subheading: '16px',
        body: '14px',
        label: '11px',
        micro: '9px',
      },
    },
  },
  plugins: [],
};

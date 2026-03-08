/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        gold: 'var(--color-gold)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-dim': 'var(--color-text-dim)',
        verified: 'var(--color-verified)',
        warn: 'var(--color-warn)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        conflict: 'var(--color-conflict)',
        narrative: 'var(--color-narrative)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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

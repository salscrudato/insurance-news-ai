import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Apple-inspired palette
        surface: 'var(--color-surface)',
        'surface-secondary': 'var(--color-surface-secondary)',
        'surface-tertiary': 'var(--color-surface-tertiary)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        separator: 'var(--color-separator)',
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-bottom))',
      },
      fontSize: {
        'display-large': ['34px', { lineHeight: '41px', fontWeight: '700' }],
        'display-medium': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'headline': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'body-secondary': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
} satisfies Config;


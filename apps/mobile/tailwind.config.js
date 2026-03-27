/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: {
          background: '#FAFAFA',
          card: '#FFFFFF',
          elevated: '#F5F5F5',
        },
        primary: {
          DEFAULT: '#4CAF50',
          light: '#81C784',
          dark: '#388E3C',
        },
        accent: {
          DEFAULT: '#FF9800',
          light: '#FFB74D',
          dark: '#F57C00',
        },
        semantic: {
          protein: '#5C6BC0',
          carbs: '#FFB300',
          fat: '#EF5350',
          fiber: '#66BB6A',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        pill: '9999px',
      },
      fontSize: {
        'heading-1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'heading-2': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'heading-3': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        caption: ['11px', { lineHeight: '14px', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};

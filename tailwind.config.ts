import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ============================================================================
        // Valeriote Brand Colors
        // ============================================================================

        // Primária: Azul-marinho (autoridade, confiança, institucional)
        'valeriote-navy': {
          50: '#f0f4f8',
          100: '#d9e3ef',
          200: '#b3c7df',
          300: '#8da8cf',
          400: '#6789bf',
          500: '#4169af',
          600: '#2d4a8a',
          700: '#1f3557',
          800: '#142444',
          900: '#0a1629',
          950: '#071f3a', // Principal
        },

        // Secundária: Dourado (premium, excelência, destaque)
        'valeriote-gold': {
          50: '#fffaf0',
          100: '#fef3e6',
          200: '#fce7cc',
          300: '#fad5a0',
          400: '#f7bc65',
          500: '#f4a44a',
          600: '#d98c28',
          700: '#b86b1c',
          800: '#8a5215',
          900: '#663c0f',
          950: '#c9a646', // Principal
        },

        // Apoio: Verde-petróleo (progresso, positividade, ação)
        'valeriote-teal': {
          50: '#f0fafb',
          100: '#d5eff2',
          200: '#abdee5',
          300: '#7dc5d4',
          400: '#52aac2',
          500: '#3290ad',
          600: '#247294',
          700: '#1b5a78',
          800: '#154459',
          900: '#0f4c5c', // Principal
          950: '#0a3440',
        },

        // ============================================================================
        // Cores Neutras Sofisticadas
        // ============================================================================
        'valeriote-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },

        // Branco premium
        'valeriote-white': '#ffffff',

        // ============================================================================
        // Cores de Status
        // ============================================================================
        'status-success': '#16a34a',
        'status-warning': '#f59e0b',
        'status-error': '#dc2626',
        'status-info': '#2563eb',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
      },
      spacing: {
        ...defaultTheme.spacing,
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'premium': '0 20px 40px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
}
export default config

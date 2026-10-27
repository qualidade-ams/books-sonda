import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        // Design System v2 (docs/especificacoes/design-system-v2/Tokens.md)
        // Inter no lugar da Roboto do manual: decisão de 15/10/2026 (Tokens.md, seção 3)
        'ds-sans': ['Inter', 'system-ui', 'sans-serif'],
        'ds-title': ['"Kumbh Sans"', 'Inter', 'system-ui', 'sans-serif'],
        'ds-mono': ['ui-monospace', '"Cascadia Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#2563eb', // Azul Sonda
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb', // Azul principal Sonda
          700: '#1d4ed8',
          900: '#1e3a8a',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        success: {
          DEFAULT: '#059669',
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          DEFAULT: '#d97706',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        gray: {
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
        },
        // Sonda Brand Colors - Paleta Oficial
        sonda: {
          black: '#000000', // Negro
          gray1: '#3D3D3D', // Gris 1 - RGB(61,61,61)
          gray2: '#666666', // Gris 2 - RGB(102,102,102)
          gray3: '#B1B1B1', // Gris 3 - RGB(177,177,177)
          gray4: '#E4E4E4', // Gris 4 - RGB(228,228,228)
          white: '#FFFFFF', // Branco puro
        },
        // Cores do Design System Sonda - CORRIGIDAS para corresponder à sidebar
        'sonda-blue': '#2563eb', // Mesmo azul da sidebar (blue-600)
        'sonda-dark-blue': '#1d4ed8', // blue-700 para hover
        'sonda-light-blue': '#3b82f6', // blue-500 para variações
        'sonda-accent-blue': '#60a5fa', // blue-400 para destaques
        'sonda-gray': '#6B7280',
        'sonda-light-gray': '#F3F4F6',
        'sonda-dark-gray': '#374151',
        // Backgrounds do Design System
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#F9FAFB',
        'bg-tertiary': '#F3F4F6',
        // Dark Mode Elegante - Tons azulados
        dark: {
          bg: '#1e2328', // Background principal
          card: '#252a30', // Cards
          sidebar: '#1a1e23', // Sidebar
          border: '#565c63', // Bordas
          input: '#2a3036', // Inputs
          muted: '#343940', // Elementos mutados
          accent: '#434950', // Elementos de destaque
        },
        // Design System v2: valores em src/styles/ds-v2.css, válidos só dentro de [data-ds="v2"]
        ds: {
          'bg-page': 'var(--ds-bg-page)',
          'bg-surface': 'var(--ds-bg-surface)',
          'bg-raised': 'var(--ds-bg-raised)',
          'bg-subtle': 'var(--ds-bg-subtle)',
          'bg-selected': 'var(--ds-bg-selected)',
          fg: 'var(--ds-fg)',
          'fg-secondary': 'var(--ds-fg-secondary)',
          'fg-muted': 'var(--ds-fg-muted)',
          'fg-disabled': 'var(--ds-fg-disabled)',
          'fg-accent': 'var(--ds-fg-accent)',
          'fg-on-accent': 'var(--ds-fg-on-accent)',
          border: 'var(--ds-border)',
          'border-strong': 'var(--ds-border-strong)',
          focus: 'var(--ds-focus)',
          accent: 'var(--ds-accent)',
          'accent-hover': 'var(--ds-accent-hover)',
          'accent-pressed': 'var(--ds-accent-pressed)',
          'accent-subtle': 'var(--ds-accent-subtle)',
          'success-fg': 'var(--ds-success-fg)',
          'success-bg': 'var(--ds-success-bg)',
          'success-border': 'var(--ds-success-border)',
          'warning-fg': 'var(--ds-warning-fg)',
          'warning-bg': 'var(--ds-warning-bg)',
          'warning-border': 'var(--ds-warning-border)',
          'danger-fg': 'var(--ds-danger-fg)',
          'danger-bg': 'var(--ds-danger-bg)',
          'danger-border': 'var(--ds-danger-border)',
          'info-fg': 'var(--ds-info-fg)',
          'info-bg': 'var(--ds-info-bg)',
          'info-border': 'var(--ds-info-border)',
          'danger-solid': 'var(--ds-danger-solid)',
          'fg-on-danger': 'var(--ds-fg-on-danger)',
          'shell-bg': 'var(--ds-shell-bg)',
          'shell-fg': 'var(--ds-shell-fg)',
          'shell-fg-muted': 'var(--ds-shell-fg-muted)',
          'shell-hover': 'var(--ds-shell-hover)',
          'shell-active-bg': 'var(--ds-shell-active-bg)',
          'shell-active-fg': 'var(--ds-shell-active-fg)',
          'shell-border': 'var(--ds-shell-border)',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Azul principal Sonda
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

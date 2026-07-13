/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        brand: {
          DEFAULT: 'hsl(var(--brand-background))',
          foreground: 'hsl(var(--brand-background-foreground))'
        },
        surface: {
          sunken: 'hsl(var(--surface-sunken))',
          raised: 'hsl(var(--surface-raised))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        }
      },
      fontFamily: {
        sans: ['Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        data: ['Cascadia Code', 'Cascadia Mono', 'Consolas', 'monospace']
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        'fluent-2': '0 1px 2px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12)',
        'fluent-4': '0 2px 4px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12)',
        'fluent-16': '0 8px 16px rgba(0, 0, 0, 0.14), 0 0 4px rgba(0, 0, 0, 0.12)',
        'fluent-64': '0 32px 64px rgba(0, 0, 0, 0.20), 0 0 8px rgba(0, 0, 0, 0.12)'
      }
    }
  },
  plugins: []
}

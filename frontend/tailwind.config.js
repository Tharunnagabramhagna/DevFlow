/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DevFlow Premium Light Pastel Color System
        canvas: '#F8F9FC',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F1F3FA',
          hover: '#F7F8FC',
          card: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E9EAF2',
          subtle: '#E9EAF2',
          strong: '#D8DAE5',
          active: '#93C5FD',
        },
        content: {
          primary: '#25263A',
          secondary: '#777B91',
          tertiary: '#9D9EAF',
        },
        pastel: {
          lavender: {
            DEFAULT: '#A78BFA',
            subtle: '#F5F3FF',
            border: '#DDD6FE',
            text: '#6D28D9',
          },
          blue: {
            DEFAULT: '#93C5FD',
            subtle: '#EFF6FF',
            border: '#BFDBFE',
            text: '#1D4ED8',
          },
          mint: {
            DEFAULT: '#86DDBB',
            subtle: '#F0FDF4',
            border: '#BBF7D0',
            text: '#15803D',
          },
          peach: {
            DEFAULT: '#FDBA9A',
            subtle: '#FFF7ED',
            border: '#FED7AA',
            text: '#C2410C',
          },
          yellow: {
            DEFAULT: '#FDE68A',
            subtle: '#FEFCE8',
            border: '#FEF08A',
            text: '#A16207',
          },
        },
        // Fintech & PayPal Brand Elements
        fintech: {
          navy: {
            50: '#F0F4F8',
            100: '#D9E2EC',
            200: '#BCCCDC',
            300: '#9FB3C8',
            400: '#829AB1',
            500: '#627D98',
            600: '#486581',
            700: '#334E68',
            800: '#1E3652',
            900: '#25263A',
            950: '#1A1B29',
          },
          paypal: {
            dark: '#003087',
            blue: '#0070BA',
            light: '#009CDE',
            subtle: '#EBF4FA',
          },
          emerald: {
            50: '#F0FDF4',
            100: '#DCFCE7',
            500: '#86DDBB',
            600: '#10B981',
            700: '#047857',
          },
          violet: {
            50: '#F5F3FF',
            100: '#EDE9FE',
            500: '#A78BFA',
            600: '#8B5CF6',
            700: '#6D28D9',
          },
          amber: {
            50: '#FEFCE8',
            100: '#FEF9C3',
            500: '#FDE68A',
            600: '#F59E0B',
          },
          rose: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            500: '#FDBA9A',
            600: '#E11D48',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'card-subtle': '0 1px 3px 0 rgba(37, 38, 58, 0.04), 0 1px 2px 0 rgba(37, 38, 58, 0.02)',
        'card-hover': '0 6px 16px -2px rgba(37, 38, 58, 0.08), 0 2px 6px -1px rgba(37, 38, 58, 0.04)',
        'modal-elevated': '0 20px 30px -8px rgba(37, 38, 58, 0.12), 0 8px 12px -4px rgba(37, 38, 58, 0.06)',
        'drawer-elevated': '-10px 0 30px -5px rgba(37, 38, 58, 0.12)',
        'pastel-glow-lavender': '0 0 20px rgba(167, 139, 250, 0.25)',
        'pastel-glow-blue': '0 0 20px rgba(147, 197, 253, 0.25)',
        'pastel-glow-mint': '0 0 20px rgba(134, 221, 187, 0.25)',
      },
      borderRadius: {
        'fintech': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

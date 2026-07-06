/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── "Safar" palette ─────────────────────────────────────────────
        raat: '#101418', // deep charcoal base
        surface: '#1A2027',
        surface2: '#232B34',
        hairline: '#2E3843',
        kesar: { DEFAULT: '#FF7A1A', dark: '#E96A0A', soft: '#FF9A4D' }, // saffron — primary action
        neela: { DEFAULT: '#2FB8C6', dark: '#249AA6' }, // teal — rider highlights / info
        gulabi: { DEFAULT: '#F5488F', dark: '#DB2F77' }, // hot pink — negotiation moments only
        body: '#EDF1F5',
        muted: '#93A0AE',
        success: '#34D399',
        warn: '#FBBF24',
        danger: '#F4534A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 122, 26, 0.45)' },
          '70%': { boxShadow: '0 0 0 14px rgba(255, 122, 26, 0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down-in': {
          from: { transform: 'translateY(calc(-100% - 24px))' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'ping-dot': {
          '75%, 100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 1.8s ease-out infinite',
        'slide-up': 'slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down-in': 'slide-down-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 180ms ease-out',
        'ping-dot': 'ping-dot 1.4s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};

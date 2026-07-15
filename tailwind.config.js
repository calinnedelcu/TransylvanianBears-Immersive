/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bear: {
          night: '#1A0509',
          wine: '#2A0810',
          deep: '#4A0E1F',
          burgundy: '#6B1A2A',
          crimson: '#8B1E2F',
          fur: '#A0623A',
          gold: '#E8B547',
          goldlight: '#F5D78A',
          cream: '#F8E8D0',
          bone: '#E8DFD0',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        'mega': '-0.045em',
        'tightest': '-0.035em',
        'editorial-2': '0.18em',
        'editorial-3': '0.28em',
        'editorial-4': '0.42em',
      },
      fontSize: {
        'display-xs': ['3rem', { lineHeight: '0.9', letterSpacing: '-0.02em' }],
        'display-sm': ['4.5rem', { lineHeight: '0.88', letterSpacing: '-0.025em' }],
        'display-md': ['6rem', { lineHeight: '0.86', letterSpacing: '-0.03em' }],
        'display-lg': ['8rem', { lineHeight: '0.84', letterSpacing: '-0.035em' }],
        'display-xl': ['11rem', { lineHeight: '0.82', letterSpacing: '-0.045em' }],
      },
      boxShadow: {
        burgundy: '0 8px 30px rgba(107, 26, 42, 0.3)',
        'burgundy-lg': '0 12px 40px rgba(107, 26, 42, 0.45)',
        gold: '0 8px 30px rgba(232, 181, 71, 0.25)',
        'inset-edge': 'inset 0 1px 0 rgba(245, 215, 138, 0.08), inset 0 -1px 0 rgba(0,0,0,0.4)',
        'card-rest': '0 1px 0 rgba(245, 215, 138, 0.06) inset, 0 18px 42px -28px rgba(74, 14, 31, 0.85)',
        'card-hover': '0 1px 0 rgba(245, 215, 138, 0.12) inset, 0 26px 60px -22px rgba(74, 14, 31, 0.95)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #E8B547 0%, #F5D78A 100%)',
        'gradient-burgundy': 'linear-gradient(135deg, #6B1A2A 0%, #4A0E1F 100%)',
        'gradient-night': 'linear-gradient(180deg, #1A0509 0%, #2A0810 100%)',
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        'fog-l': 'fogDriftL 30s linear infinite',
        'fog-r': 'fogDriftR 45s linear infinite',
        twinkle: 'twinkle 2.5s ease-in-out infinite',
        'bat-flap': 'batFlap 0.45s linear infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        fogDriftL: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fogDriftR: {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        batFlap: {
          '0%, 24%': { backgroundPosition: '0% center' },
          '25%, 49%': { backgroundPosition: '33.333% center' },
          '50%, 74%': { backgroundPosition: '66.667% center' },
          '75%, 100%': { backgroundPosition: '100% center' },
        },
      },
    },
  },
  plugins: [],
};

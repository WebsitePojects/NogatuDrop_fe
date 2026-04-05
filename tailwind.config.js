import flowbite from 'flowbite/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './node_modules/flowbite-react/lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"DM Serif Display"', 'Georgia', 'serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Coffee Brand Palette
        coffee: {
          950: '#1C0A00',
          900: '#2D1200',
          800: '#4A1E00',
          700: '#6B2D0E',
          600: '#8B3A12',
          500: '#B35A1F',
          400: '#D4722A',
          300: '#E8955A',
          200: '#F2BB93',
          100: '#FAE4CF',
          50:  '#FFF8F0',
        },
        // Super Admin sidebar/portal
        main: {
          sidebar:       '#1C0A00',
          'sidebar-hover':'#2D1200',
          bg:            '#FFF8F0',
          card:          '#FFFFFF',
          accent:        '#D97706',
          active:        '#F59E0B',
          text:          '#1C0A00',
          'text-muted':  '#78564A',
          border:        '#E8D5C0',
        },
        // Stockist portal
        stockist: {
          sidebar:       '#0A2E0A',
          'sidebar-hover':'#152015',
          bg:            '#F0F9F0',
          card:          '#FFFFFF',
          accent:        '#2D8A2D',
          active:        '#22C55E',
          text:          '#0B3D0B',
          'text-muted':  '#4A7A4A',
          border:        '#C8E6C8',
        },
        // Mobile portal
        mobile: {
          bg:            '#FFFFFF',
          accent:        '#F59E0B',
          text:          '#1A1A1A',
          'text-muted':  '#6B7280',
          border:        '#E5E7EB',
        },
        // Status colors
        status: {
          pending:    '#F59E0B',
          approved:   '#3B82F6',
          delivering: '#8B5CF6',
          delivered:  '#10B981',
          cancelled:  '#EF4444',
          rejected:   '#DC2626',
          paid:       '#059669',
          unpaid:     '#F97316',
          active:     '#10B981',
          inactive:   '#6B7280',
          suspended:  '#EF4444',
        },
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 14px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'modal':      '0 20px 60px rgba(0,0,0,0.20)',
        'sidebar':    '4px 0 16px rgba(0,0,0,0.18)',
        'xl':         '0 8px 32px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'skeleton': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'countdown-urgent': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up':        'fade-up 0.35s ease both',
        'fade-in':        'fade-in 0.25s ease both',
        'slide-in-right': 'slide-in-right 0.3s ease both',
        'skeleton':       'skeleton 1.8s ease-in-out infinite',
        'countdown':      'countdown-urgent 1s ease-in-out infinite',
      },
      spacing: {
        'sidebar': '256px',
        'topbar':  '64px',
      },
    },
  },
  plugins: [flowbite],
};

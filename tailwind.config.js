/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'trading-green': '#00ff88',
        'trading-red': '#ff4757',
        'trading-blue': '#3742fa',
        'trading-dark': '#0f0f23',
        'trading-darker': '#1a1a2e',
        'trading-card': '#16213e',
        'trading-gray': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 255, 136, 0.4)' },
        },
      },
      backgroundImage: {
        'trading-gradient': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      },
      boxShadow: {
        'trading-glow': '0 0 20px rgba(0, 255, 136, 0.3)',
        'trading-red-glow': '0 0 20px rgba(255, 71, 87, 0.3)',
        'trading-blue-glow': '0 0 20px rgba(55, 66, 250, 0.3)',
      },
    },
  },
  plugins: [],
}

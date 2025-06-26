/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: "2rem",
  		screens: {
  			"2xl": "1400px",
  		},
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			'trading-green': '#00ff88',
  			'trading-red': '#ff4757',
  			'trading-blue': '#3742fa',
  			'trading-yellow': '#fbbf24',
  			'trading-dark': '#0f0f23',
  			'trading-darker': '#1a1a2e',
  			'trading-card': '#16213e',
  			'trading-gray': {
  				'50': '#f8fafc',
  				'100': '#f1f5f9',
  				'200': '#e2e8f0',
  				'300': '#cbd5e1',
  				'400': '#94a3b8',
  				'500': '#64748b',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1e293b',
  				'900': '#0f172a'
  			},
  			trading: {
  				dark: '#0f172a',
  				darker: '#020617',
  				card: '#1e293b',
  				border: '#334155',
  				accent: '#818cf8',
  				success: '#34d399',
  				warning: '#fbbf24',
  				danger: '#ef4444',
  				text: {
  					primary: '#f1f5f9',
  					secondary: '#94a3b8',
  					accent: '#818cf8'
  				}
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
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
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		animation: {
  			'gradient-x': 'gradient-x 15s ease infinite',
  			'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			glow: 'glow 2s ease-in-out infinite alternate',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fadeIn': 'fadeIn 0.5s ease-out',
  			'slideIn': 'slideIn 0.5s ease-out',
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
  				}
  			},
  			glow: {
  				'0%': {
  					boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)'
  				},
  				'100%': {
  					boxShadow: '0 0 30px rgba(0, 255, 136, 0.4)'
  				}
  			},
  			'accordion-down': {
  				from: { height: 0 },
  				to: { height: 'var(--radix-accordion-content-height)' },
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: 0 },
  			},
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' },
  			},
  			slideIn: {
  				'0%': { transform: 'translateY(20px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' },
  			}
  		},
  		backgroundImage: {
  			'trading-gradient': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
  		},
  		boxShadow: {
  			'trading-glow': '0 0 20px rgba(0, 255, 136, 0.3)',
  			'trading-red-glow': '0 0 20px rgba(255, 71, 87, 0.3)',
  			'trading-blue-glow': '0 0 20px rgba(55, 66, 250, 0.3)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

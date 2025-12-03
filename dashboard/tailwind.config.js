/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          600: '#7c3aed',
          700: '#6d28d9'
        },
        cyber: {
          blue: '#22d3ee',
          purple: '#a855f7',
          pink: '#ec4899',
        }
      },
      animation: {
        'float': 'float linear infinite',
        'stream': 'stream 3s linear infinite',
        'gradient': 'gradient 3s ease infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'grid-flow': 'grid-flow 20s linear infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.3)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.5), 0 0 40px rgba(236, 72, 153, 0.3)',
      }
    },
  },
  plugins: [],
  safelist: [
    'from-cyan-500',
    'to-blue-600',
    'from-green-500',
    'to-emerald-600',
    'from-red-500',
    'to-pink-600',
    'from-orange-500',
    'to-amber-600',
    'from-purple-500',
    'to-violet-600',
    'shadow-cyan-500/50',
    'shadow-green-500/50',
    'shadow-red-500/50',
    'shadow-orange-500/50',
    'shadow-purple-500/50',
  ]
}
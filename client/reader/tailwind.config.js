/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Locus ID: blanco, celeste, lima y azul petróleo para texto.
        ink: { DEFAULT: '#0B2F45', soft: '#4A6375', mute: '#7B8FA0' },
        surface: '#F4F8FB',
        line: '#DCE7EF',
        celeste: { 50: '#EEF8FD', 100: '#D6EEF9', 200: '#ADDDF3', 400: '#38A9DB', 600: '#1A7DB5', 700: '#14668F' },
        lima: { 50: '#F5FDE6', 100: '#E7F9C4', 400: '#A3E635', 600: '#65A30D', 800: '#3F6212' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,47,69,0.04), 0 4px 16px rgba(11,47,69,0.06)',
      },
    },
  },
  plugins: [],
};

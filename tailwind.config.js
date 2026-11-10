const tokens = require('./src/constants/design-tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      borderRadius: Object.fromEntries(Object.entries(tokens.radius).map(([name, value]) => [name, `${value}px`])),
      spacing: { 'card-gap': `${tokens.spacing.four}px` },
      colors: {
        'warning-base': tokens.color.warningBase,
        canvas: '#F0F8FF',
        brand: '#112F6F',
        action: '#245399',
        'action-hover': '#1A3E78',
        'text-secondary': '#4A607A',
      },
      fontFamily: {
        poppins: ['Poppins_400Regular'],
        'poppins-semibold': ['Poppins_600SemiBold'],
        'poppins-bold': ['Poppins_700Bold'],
      },
    },
  },
  plugins: [],
};

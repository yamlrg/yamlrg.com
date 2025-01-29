import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          background: '#ffffff',
          text: '#1a1a1a',
        },
        // Dark mode colors
        dark: {
          background: '#1a1a1a',
          text: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};

export default config;

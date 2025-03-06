/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
      "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class', // This enables dark mode with the 'class' strategy
    theme: {
      extend: {
        colors: {
          // Light mode colors
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9', // Main primary color
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49',
          },
          secondary: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
            950: '#042f2e',
          },
          // Dark mode specific colors
          dark: {
            background: '#121212',
            surface: '#1e1e1e',
            primary: '#90caf9',   // Lighter blue for dark mode
            secondary: '#66bb6a', // Lighter green for dark mode
            accent: '#ce93d8',    // Lighter purple for dark mode
            muted: '#6c757d',
            border: '#2d2d2d',
            card: '#252525',
            hover: '#2c2c2c',
          },
        },
        backgroundColor: {
          light: '#f9fafb',
          dark: '#121212',
        },
        textColor: {
          light: {
            primary: '#111827',
            secondary: '#4b5563',
            muted: '#6b7280',
          },
          dark: {
            primary: '#f9fafb',
            secondary: '#e5e7eb',
            muted: '#9ca3af',
          },
        },
        borderColor: {
          light: '#e5e7eb',
          dark: '#2d2d2d',
        },
        // Custom shadows for light/dark mode
        boxShadow: {
          'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
          'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -1px rgba(0, 0, 0, 0.7)',
          'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.8)',
        },
      },
    },
    plugins: [],
    // Custom variants
    variants: {
      extend: {
        backgroundColor: ['dark', 'dark-hover'],
        textColor: ['dark', 'dark-hover'],
        borderColor: ['dark', 'dark-hover'],
      },
    },
  };
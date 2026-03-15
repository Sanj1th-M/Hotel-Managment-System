/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#172554',
                },
                hotel: {
                    pearl: '#ffffff',
                    canvas: '#f9fafb',
                    line: '#f3f4f6',
                    ink: '#0f172a',
                    muted: '#64748b',
                },
            },
            boxShadow: {
                panel: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                float: '0 18px 32px -18px rgba(15, 23, 42, 0.16)',
            },
        },
    },
    plugins: [],
}

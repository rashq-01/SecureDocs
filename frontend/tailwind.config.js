/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#1F4E79',
          hover: '#183C5D',
          subtle: '#EAF0F6',
        },
        border: '#E1E4E8',
        text: {
          primary: '#1A1D23',
          secondary: '#5B6270',
          tertiary: '#9AA1AC',
        },
        bg: {
          primary: '#FFFFFF',
          secondary: '#F7F8FA',
          tertiary: '#EEF0F3',
        },
        status: {
          success: '#1E6B3E',
          successBg: '#E8F3EC',
          warning: '#8A6116',
          warningBg: '#FBF3E1',
          danger: '#9B2C2C',
          dangerBg: '#FBEAEA',
          neutral: '#5B6270',
          neutralBg: '#EEF0F3',
          info: '#1F4E79',
          infoBg: '#EAF0F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        md: ['16px', '22px'],
        lg: ['20px', '28px'],
        xl: ['24px', '32px'],
      },
    },
  },
  plugins: [],
}
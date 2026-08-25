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
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
          glow: 'var(--accent-glow)',
        },
        border: 'var(--border-glass)',
        borderHighlight: 'var(--border-glass-highlight)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        bg: {
          primary: 'var(--bg-base)', /* For backward compatibility with body bg */
          secondary: 'var(--bg-base)', /* Replacing old bg-secondary */
          tertiary: 'var(--surface-glass)', /* For nested items or old dividers */
          base: 'var(--bg-base)',
          surface: 'var(--surface-glass)',
          surfaceRaised: 'var(--surface-glass-raised)',
        },
        status: {
          success: 'var(--status-success)',
          successBg: 'var(--status-success-bg)',
          warning: 'var(--status-warning)',
          warningBg: 'var(--status-warning-bg)',
          danger: 'var(--status-danger)',
          dangerBg: 'var(--status-danger-bg)',
          neutral: 'var(--status-neutral)',
          neutralBg: 'var(--status-neutral-bg)',
          info: 'var(--accent)',
          infoBg: 'var(--accent-subtle)',
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
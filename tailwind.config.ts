import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 김(海苔) + 바다 컨셉 브랜드 팔레트
        sea: {
          50: '#eef6f7', 100: '#d6eaee', 200: '#aed4dd', 300: '#7db8c6',
          400: '#4b96a9', 500: '#2f7a8e', 600: '#246275', 700: '#1e4f5e',
          800: '#1a404c', 900: '#173540', 950: '#0c2029',
        },
        gim: {
          50: '#f6f5f2', 100: '#e9e6df', 200: '#d3cdc0', 300: '#b6ac97',
          400: '#9b8e74', 500: '#87795f', 600: '#6d6049', 700: '#584d3d',
          800: '#4a4136', 900: '#403931', 950: '#231e19',
        },
        point: { DEFAULT: '#c8442f', dark: '#a53522' },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'Malgun Gothic', 'sans-serif'],
      },
      maxWidth: { container: '1200px' },
    },
  },
  plugins: [],
} satisfies Config;

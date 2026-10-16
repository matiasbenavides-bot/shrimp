import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // rutas relativas: imprescindible para que el WebView de Capacitor
  // encuentre los assets desde file:// / https://localhost
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // fechas locales: forzamos una zona con horario de verano para cazar bugs de DST
    env: { TZ: 'Europe/Madrid' },
  },
})

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // rutas relativas: imprescindible para que el WebView de Capacitor
  // encuentre los assets desde file:// / https://localhost
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    // `android/` y `dist/` NO son código fuente. Gradle y `cap sync` escriben
    // miles de ficheros ahí, y el watcher recargaba la página y reoptimizaba
    // las dependencias a media carga: la app se quedaba en blanco o daba
    // "504 Outdated Optimize Dep". Pasó de verdad (page reload de
    // android/build/reports/problems-report.html mientras se cargaba).
    watch: {
      ignored: ['**/android/**', '**/dist/**'],
    },
  },
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

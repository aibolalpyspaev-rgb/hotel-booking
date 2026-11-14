import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Запросы /api/* проксируются на Laravel (php artisan serve на порту 8000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

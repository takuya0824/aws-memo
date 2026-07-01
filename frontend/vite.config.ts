/// <reference types="node" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env['API_TARGET'] || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

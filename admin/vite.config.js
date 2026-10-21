import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Loads all VITE_* env variables from .env files based on the current mode
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL || 'https://eldoria-lopd.onrender.com',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

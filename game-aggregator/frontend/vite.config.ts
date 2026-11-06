import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'interface compilée est servie par FastAPI depuis backend/app/static.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../backend/app/static', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8000' } },
})

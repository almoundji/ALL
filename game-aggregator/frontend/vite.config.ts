import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// mode "netlify" : sortie dans frontend/dist (publiée par Netlify) ; sinon l'interface est servie par FastAPI.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: { outDir: mode === 'netlify' ? 'dist' : '../backend/app/static', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8000' } },
}))

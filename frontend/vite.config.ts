import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** `/welcome` (no slash) would fall back to the app's index.html; send it to the welcome document. */
const welcomeSlash: Plugin = {
  name: 'welcome-slash',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/welcome' || req.url?.startsWith('/welcome?')) req.url = req.url.replace('/welcome', '/welcome/')
      next()
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/welcome' || req.url?.startsWith('/welcome?')) req.url = req.url.replace('/welcome', '/welcome/')
      next()
    })
  },
}

// Two documents: the forum app at / (index.html) and the welcome page at /welcome (welcome/index.html).
// Both load src/shared/styles/index.css; motion, section grounds and three.js load on the welcome page only.
export default defineConfig({
  plugins: [react(), tailwindcss(), welcomeSlash],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        welcome: resolve(import.meta.dirname, 'welcome/index.html'),
      },
    },
  },
})

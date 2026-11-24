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

/**
 * The gateway's paths, the same list as nginx.conf. '/api' covers '/api-docs' too; the logout key is a regex so it
 * matches /logout exactly. Everything else, /signin and /signup included, is the React app.
 */
const gatewayPaths = ['/api', '/oauth2', '/login/oauth2', '^/logout$', '/connect', '/.well-known', '/swagger-ui', '/v3/api-docs']
const toGateway = { target: 'http://localhost:8080', xfwd: true } // Host stays localhost:3000 (no changeOrigin)

// Two documents: the forum app at / (index.html) and the welcome page at /welcome (welcome/index.html).
// Both load src/shared/styles/index.css; motion, section grounds and three.js load on the welcome page only.
export default defineConfig({
  plugins: [react(), tailwindcss(), welcomeSlash],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  // Port 3000 is the public origin (the issuer, and where logins come back to), so the dev server must run there.
  // Compose's frontend container uses it too: run one or the other (docker compose stop frontend).
  server: {
    port: 3000,
    strictPort: true,
    proxy: Object.fromEntries(gatewayPaths.map(path => [path, toGateway])),
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        welcome: resolve(import.meta.dirname, 'welcome/index.html'),
      },
    },
  },
})

import { defineConfig, loadEnv } from 'vite'
import type { Plugin, ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { getNorthflankLive } from './src/shared/nf-live'

const root = fileURLToPath(new URL('./src/renderer', import.meta.url))
const envDir = fileURLToPath(new URL('.', import.meta.url))
const appVersion = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')
).version as string

// Strip Domain/Secure/SameSite from backend cookies so they stick to the local
// renderer origin instead of the public backend domain.
function localizeCookies(proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0]) {
  proxy.on('proxyRes', (proxyRes) => {
    const raw = proxyRes.headers['set-cookie']
    if (!Array.isArray(raw)) return
    proxyRes.headers['set-cookie'] = raw.map((cookie: string) => {
      const kept = cookie
        .split(';')
        .filter((part) => !/^\s*(domain|secure|samesite|partitioned)\b/i.test(part))
        .join(';')
      return `${kept}; SameSite=Lax`
    })
  })
}

// Exposes live Northflank service metrics to the renderer on the same origin.
// The renderer never sees the API token; this middleware only returns the
// summarized service info and the last 20 minutes of samples.
function northflankLive(envDir: string): Plugin {
  return {
    name: 'shen-northflank-live',
    configureServer(server) {
      server.middlewares.use('/__nf/live', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        getNorthflankLive([envDir])
          .then((data) => res.end(JSON.stringify(data)))
          .catch((err: unknown) => {
            res.statusCode = 502
            res.end(
              JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
            )
          })
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  const apiTarget = (env.SHEN_API_URL || 'https://shen.zagan.space').replace(/\/+$/, '')

  return {
    root,
    define: {
      // Lets the renderer start Discord OAuth on the backend origin, which is
      // where the hosted callback lands (see loginUrl in renderer/api.ts).
      'import.meta.env.VITE_SHEN_API_URL': JSON.stringify(apiTarget),
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    // The renderer always calls same-origin /api routes; this proxy forwards
    // them to the hosted Shen backend so cookies stay first-party.
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: true, configure: localizeCookies },
        '/health': { target: apiTarget, changeOrigin: true, secure: true }
      }
    },
    plugins: [
      react(),
      tailwindcss(),
      northflankLive(envDir),
      electron([
        {
          entry: fileURLToPath(new URL('./src/main/index.ts', import.meta.url)),
          vite: {
            build: {
              outDir: fileURLToPath(new URL('./dist-electron/main', import.meta.url)),
              rollupOptions: { external: ['electron', 'electron-updater'] }
            }
          }
        }
      ])
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src/renderer/src', import.meta.url))
      }
    },
    build: {
      outDir: fileURLToPath(new URL('./dist', import.meta.url)),
      // dist lives outside the Vite root (src/renderer), so opt in explicitly;
      // otherwise stale bundles accumulate and end up inside the installer.
      emptyOutDir: true
    }
  }
})

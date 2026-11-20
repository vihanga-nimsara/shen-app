import { app, BrowserWindow, ipcMain, Menu, Notification, session, shell } from 'electron'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { getNorthflankLive } from '../shared/nf-live'
import type { UpdateStatus } from '../shared/update-types'

// electron-updater is CommonJS; require it so the ESM main bundle keeps it
// external instead of inlining (and so node_modules/electron-updater is used).
const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Opt-in DevTools protocol endpoint for automation/screenshots in development.
if (process.env.SHEN_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env.SHEN_DEBUG_PORT)
}

process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '..', 'dist')

// Hosted Cloudy/Shen backend (Northflank). Override with SHEN_API_URL to point
// the desktop app at another deployment or a local dev server.
const API_BASE = (process.env.SHEN_API_URL || 'https://shen.zagan.space').replace(/\/+$/, '')

// The renderer is served from this origin, so session cookies must live here.
const LOCAL_ORIGIN = 'http://localhost:5173/'

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function rewriteSetCookie(cookie: string) {
  const kept = cookie
    .split(';')
    .filter((part) => !/^\s*(domain|secure|samesite|partitioned)\b/i.test(part))
    .join(';')
  return `${kept}; SameSite=Lax`
}

function proxyToBackend(req: http.IncomingMessage, res: http.ServerResponse) {
  const target = new URL(req.url || '/', API_BASE)
  const transport = target.protocol === 'https:' ? https : http
  const proxyReq = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers: { ...req.headers, host: target.host }
    },
    (proxyRes) => {
      const headers = { ...proxyRes.headers }
      const cookies = proxyRes.headers['set-cookie']
      if (cookies) headers['set-cookie'] = cookies.map(rewriteSetCookie)
      res.writeHead(proxyRes.statusCode || 502, headers)
      proxyRes.pipe(res)
    }
  )
  proxyReq.on('error', (err) => {
    console.error('[proxy] error:', err.message)
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Bad gateway')
  })
  req.pipe(proxyReq)
}

// Serve the production build from http://localhost:5173 so the renderer keeps a
// single, stable origin. API calls are proxied to the hosted backend, which
// keeps cookies first-party and avoids CORS entirely.
function startStaticServer(root: string, port = 5173): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      if (urlPath === '/__nf/live') {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        getNorthflankLive([
          process.cwd(),
          path.join(process.env.DIST_ELECTRON!, '..'),
          path.dirname(process.execPath)
        ])
          .then((data) => res.end(JSON.stringify(data)))
          .catch((err: unknown) => {
            res.statusCode = 502
            res.end(
              JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
            )
          })
        return
      }
      if (urlPath.startsWith('/api/') || urlPath === '/health') {
        proxyToBackend(req, res)
        return
      }
      let file = path.join(root, urlPath)
      try {
        if (urlPath === '/' || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          file = path.join(root, 'index.html')
        }
        const data = fs.readFileSync(file)
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream')
        res.end(data)
      } catch {
        res.statusCode = 404
        res.end('Not found')
      }
    })
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(`http://localhost:${port}/`))
  })
}

async function resolveAppUrl(): Promise<string> {
  if (process.env.VITE_DEV_SERVER_URL) return process.env.VITE_DEV_SERVER_URL
  try {
    return await startStaticServer(process.env.DIST!)
  } catch (err) {
    console.error('[server] static server failed, falling back to file://', err)
    return `file://${path.join(process.env.DIST!, 'index.html').replace(/\\/g, '/')}`
  }
}

let mainWindow: BrowserWindow | null = null

// ----- browser login handoff -----
// The system browser does the Discord OAuth dance, then redirects to this
// loopback listener with a one-time token. We exchange it for the session id and
// install the same cookie the backend would have set in the browser.
let loginPort: number | null = null

async function finishDesktopLogin(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const res = await fetch(
      `${API_BASE}/api/auth/desktop/exchange?token=${encodeURIComponent(token)}`
    )
    const data = (await res.json().catch(() => ({}))) as { sessionId?: string; error?: string }
    if (!res.ok || !data.sessionId) {
      console.error('[auth] desktop exchange failed:', data.error || res.status)
      return false
    }
    await session.defaultSession.cookies.set({
      url: LOCAL_ORIGIN,
      name: 'cloudy_session',
      value: data.sessionId,
      httpOnly: true,
      sameSite: 'lax',
      expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    })
    return true
  } catch (err) {
    console.error('[auth] desktop exchange error:', err)
    return false
  }
}

async function ensureLoginServer(): Promise<number> {
  if (loginPort) return loginPort
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        res.statusCode = 404
        res.end('Not found')
        return
      }
      const token = url.searchParams.get('token') || ''
      void finishDesktopLogin(token).then((ok) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        const heading = ok ? 'Signed in to Shen' : 'Could not finish sign-in'
        const copy = ok
          ? 'You can close this tab and return to the app.'
          : 'Go back to the app and try signing in again.'
        res.end(
          '<!doctype html><meta charset="utf-8"><title>Shen</title>' +
            '<body style="font-family:system-ui,sans-serif;padding:48px;background:#111;color:#eee">' +
            `<h2 style="margin:0 0 8px">${heading}</h2>` +
            `<p style="margin:0;color:#aaa">${copy}</p>` +
            '</body>'
        )
      })
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        loginPort = address.port
        resolve(address.port)
      } else {
        reject(new Error('could not determine login callback port'))
      }
    })
  })
}

function openLoginInBrowser(rawUrl: string) {
  void (async () => {
    try {
      const port = await ensureLoginServer()
      const requested = new URL(rawUrl)
      // Start OAuth on the backend's own origin, not the local proxy. The
      // /api/auth/discord handler stores the OAuth state in a cookie, and
      // Discord redirects back to the hosted callback (shen.zagan.space), so
      // that cookie only survives when the flow starts on the same origin.
      const url = new URL('/api/auth/discord', API_BASE)
      url.search = requested.search
      url.searchParams.set('desktop', `http://127.0.0.1:${port}/callback`)
      console.log('[auth] opening browser login at', url.origin)
      await shell.openExternal(url.toString())
    } catch (err) {
      console.error('[auth] could not open browser:', err)
    }
  })()
}

function createWindow(appUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    show: false,
    title: 'Shen',
    backgroundColor: '#080808',
    titleBarStyle: 'hidden',
    ...(process.platform === 'win32'
      ? {
          titleBarOverlay: {
            // Transparent so the app's own titlebar strip shows through in
            // both the dark and light themes; a mid grey keeps the window
            // symbols legible on either background.
            color: '#00000000',
            symbolColor: '#9a9a9a',
            height: 36
          }
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload', 'index.cjs')
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[window] failed to load', code, desc, url)
  })

  // Never open login (or any external link) inside the app: hand it to the
  // system browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/api/auth/discord')) openLoginInBrowser(url)
    else void shell.openExternal(url)
    return { action: 'deny' }
  })

  void mainWindow.loadURL(appUrl)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.SHEN_SCREENSHOT) {
    mainWindow.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 8000))
      const image = await mainWindow!.webContents.capturePage()
      fs.writeFileSync(process.env.SHEN_SCREENSHOT!, image.toPNG())
      app.quit()
    })
  }
}

function broadcastUpdate(status: UpdateStatus) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('shen:update-status', status)
  }
}

function showUpdateNotification(title: string, body: string, onClick?: () => void) {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  if (onClick) notification.on('click', onClick)
  notification.show()
}

function setupUpdateIpc() {
  ipcMain.handle('shen:version', () => app.getVersion())
  ipcMain.handle('shen:check-updates', async () => {
    if (!app.isPackaged) {
      broadcastUpdate({ state: 'dev' })
      return
    }
    broadcastUpdate({ state: 'checking' })
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      broadcastUpdate({
        state: 'error',
        message: err instanceof Error ? err.message : String(err)
      })
    }
  })
  ipcMain.handle('shen:install-update', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function setupAutoUpdates() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console
  autoUpdater.on('checking-for-update', () => broadcastUpdate({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    broadcastUpdate({ state: 'available', version: info.version })
    // Native OS toast, in addition to the in-app Update card.
    showUpdateNotification(
      'Shen update available',
      `Version ${info.version} is downloading in the background.`
    )
  })
  autoUpdater.on('update-not-available', () => broadcastUpdate({ state: 'idle' }))
  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdate({ state: 'downloading', percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdate({ state: 'downloaded', version: info.version })
    showUpdateNotification(
      'Shen update ready',
      `Version ${info.version} will install when you quit. Click to restart now.`,
      () => autoUpdater.quitAndInstall(false, true)
    )
  })
  autoUpdater.on('error', (err) => {
    console.error('[update] error:', err.message)
    broadcastUpdate({ state: 'error', message: err.message })
  })
  // Let the window settle before hitting GitHub.
  setTimeout(() => {
    void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[update] check failed:', err instanceof Error ? err.message : err)
    })
  }, 6000)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    app.setAppUserModelId('space.zagan.shen')
    Menu.setApplicationMenu(null)
    setupUpdateIpc()
    void ensureLoginServer().catch((err) => console.error('[auth] login server failed:', err))
    const appUrl = await resolveAppUrl()
    createWindow(appUrl)
    setupAutoUpdates()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void resolveAppUrl().then(createWindow)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

import type { NfLive } from '../../shared/nf-types'

export type { NfLive, NfMetric, NfService } from '../../shared/nf-types'

// Public endpoint on the hosted Shen backend. It performs the Northflank call
// with a server-side token, so no credential ever ships with the app and other
// users can open Status without owning a Northflank account.
async function getHostedLive(): Promise<NfLive | null> {
  const res = await fetch('/api/metrics', { cache: 'no-store', credentials: 'include' })
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !type.includes('application/json')) return null
  const data = (await res.json().catch(() => null)) as
    | (NfLive & { configured?: boolean })
    | null
  if (!data || !data.service || !data.metrics) return null
  return data
}

// Local fallback for development: the Vite dev server and the Electron static
// server resolve a token from .env or the `northflank login` session and never
// expose it to the renderer.
async function getLocalLive(): Promise<NfLive> {
  const res = await fetch('/__nf/live', { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as NfLive | { error?: string }
  if (!res.ok) {
    const message =
      'error' in data && data.error ? data.error : `Northflank request failed (${res.status})`
    throw new Error(message)
  }
  return data as NfLive
}

export async function getNorthflankLive(): Promise<NfLive> {
  const hosted = await getHostedLive().catch(() => null)
  if (hosted) return hosted
  return getLocalLive()
}

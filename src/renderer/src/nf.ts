import type { NfLive } from '../../shared/nf-types'

export type { NfLive, NfMetric, NfService } from '../../shared/nf-types'

// Same-origin endpoint served by the Vite dev server and the Electron static
// server. The API token is resolved in the main process and never reaches here.
export async function getNorthflankLive(): Promise<NfLive> {
  const res = await fetch('/__nf/live', { cache: 'no-store' })
  const data = (await res.json().catch(() => ({}))) as NfLive | { error?: string }
  if (!res.ok) {
    const message = 'error' in data && data.error ? data.error : `Northflank request failed (${res.status})`
    throw new Error(message)
  }
  return data as NfLive
}

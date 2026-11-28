// Client for the Cloudy/Shen backend (F:\cloudy). Mirrors web/src/api.js but is
// typed and talks to the backend origin directly so the Electron session cookie
// set during Discord login is used for authenticated writes.

// Every call is same-origin: the Vite dev server and the Electron static server
// proxy /api to the hosted Cloudy/Shen backend (see SHEN_API_URL). Keeping the
// renderer on its own origin means the session cookie stays first-party, so
// credentialed requests work the same in dev and in the packaged app.
export const API_BASE = ''

export interface Track {
  id?: string | null
  url: string
  title: string
  artist?: string | null
  channelId?: string | null
  duration?: number
  durationRaw?: string | null
  thumbnail?: string | null
  source?: string
  addedAt?: number
  playedAt?: number
}

export interface GuildVoice {
  id: string
  name: string
  inVoice?: boolean
  voiceChannelId?: string | null
  voiceChannelName?: string | null
  voiceChannels?: { id: string; name: string }[]
}

export interface Playlist {
  id: string
  name: string
  createdAt?: number
  tracks: Track[]
}

export interface Status {
  nowPlaying: Track | null
  playing: boolean
  paused: boolean
  loop: boolean
  position: number
  startedAt: number | null
  queueLength: number
  queue: Track[]
  pending: Track[]
  library: Track[]
  history: Track[]
  guildId: string | null
  botReady?: boolean
  guilds?: GuildVoice[]
  volume?: number
}

export interface User {
  id: string
  username?: string
  global_name?: string | null
  avatar?: string | null
}

interface RequestOptions {
  method?: string
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'include'
  }
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }

  const res = await fetch(`${API_BASE}${path}`, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || res.statusText || `Request failed (${res.status})`
    )
  }
  return data as T
}

export function audioUrl(track: Track): string {
  return `${API_BASE}/api/audio?url=${encodeURIComponent(track.url)}`
}

export function eventsUrl(): string {
  return `${API_BASE}/api/events`
}

export function loginUrl(): string {
  // OAuth must start on the backend's own origin: /api/auth/discord stores the
  // state in a cookie, and Discord redirects back to the hosted callback
  // (shen.zagan.space), which only sees that cookie on the same origin. In the
  // desktop app the main process also rewrites this to SHEN_API_URL and appends
  // the loopback desktop callback.
  const external = import.meta.env.VITE_SHEN_API_URL as string | undefined
  const base =
    external && /^https?:\/\//i.test(external) ? external.replace(/\/+$/, '') : ''
  return base ? `${base}/api/auth/discord` : `${window.location.origin}/api/auth/discord`
}

export function videoIdOf(track: Track | null | undefined): string | null {
  if (!track) return null
  if (track.id && /^[\w-]{11}$/.test(track.id)) return track.id
  try {
    const u = new URL(track.url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null
    return u.searchParams.get('v')
  } catch {
    return null
  }
}

// Music search sometimes returns channel avatars on yt3.googleusercontent.com,
// which often refuse to hotlink. i.ytimg.com always serves the video still, so
// prefer it whenever we can recover the video id.
export function coverUrl(track: Track | null | undefined): string | null {
  if (!track) return null
  const id = videoIdOf(track)
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  return track.thumbnail ?? null
}

export async function searchTracks(q: string, source: 'music' | 'video'): Promise<Track[]> {
  const data = await request<{ results: Track[] }>(
    `/api/search?q=${encodeURIComponent(q)}&source=${source}`
  )
  return data.results
}

export async function getLibrary(): Promise<Track[]> {
  const data = await request<{ library: Track[] }>('/api/library')
  return data.library
}

export async function getPlaylists(): Promise<{ playlists: Playlist[]; favorites: Track[] }> {
  const data = await request<{ playlists: Playlist[]; favorites: Track[] }>('/api/playlists')
  return { playlists: data.playlists ?? [], favorites: data.favorites ?? [] }
}

export async function getStatus(): Promise<Status> {
  return request<Status>('/api/status')
}

export async function getMe(): Promise<User | null> {
  const data = await request<{ user: User | null }>('/api/auth/me')
  return data.user ?? null
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' })
}

export interface AddUrlResult {
  type: 'track' | 'playlist'
  added: number
  tracks: Track[]
}

export async function queueByUrl(url: string): Promise<AddUrlResult> {
  return request<AddUrlResult>('/api/add-url', { method: 'POST', body: { input: url } })
}

export async function saveByUrl(url: string): Promise<void> {
  await request('/api/library', { method: 'POST', body: { input: url } })
}

export async function removeFromLibrary(id: string): Promise<void> {
  await request(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function removePendingTrack(id: string): Promise<void> {
  await request(`/api/queue/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function clearPending(): Promise<void> {
  await request('/api/queue', { method: 'DELETE' })
}

export async function removeLiveTrack(index: number): Promise<void> {
  await request(`/api/queue/live/${index}`, { method: 'DELETE' })
}

export async function reorderQueue(from: number, to: number): Promise<void> {
  await request('/api/queue/reorder', { method: 'POST', body: { from, to } })
}

export async function reorderPending(from: number, to: number): Promise<void> {
  await request('/api/queue/pending/reorder', { method: 'POST', body: { from, to } })
}

export async function createPlaylist(name: string): Promise<Playlist> {
  return request<Playlist>('/api/playlists', { method: 'POST', body: { name } })
}

export async function deletePlaylist(id: string): Promise<void> {
  await request(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function addTrackToPlaylist(id: string, track: Track): Promise<Playlist> {
  return request<Playlist>(`/api/playlists/${encodeURIComponent(id)}/tracks`, {
    method: 'POST',
    body: { track }
  })
}

export async function removeTrackFromPlaylist(id: string, key: string): Promise<Playlist> {
  return request<Playlist>(
    `/api/playlists/${encodeURIComponent(id)}/tracks/${encodeURIComponent(key)}`,
    { method: 'DELETE' }
  )
}

export async function toggleFavorite(track: Track): Promise<void> {
  await request('/api/favorites', { method: 'POST', body: { track } })
}

export async function removeFavorite(key: string): Promise<void> {
  await request(`/api/favorites/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export async function reportNowPlaying(track: Track | null): Promise<void> {
  await request('/api/web/now-playing', { method: 'POST', body: { track } })
}

export async function discordPlay(url: string): Promise<void> {
  await request('/api/control/play', { method: 'POST', body: { url } })
}

export async function discordSkip(): Promise<void> {
  await request('/api/control/skip', { method: 'POST', body: {} })
}

export async function discordStop(): Promise<void> {
  await request('/api/control/stop', { method: 'POST', body: {} })
}

export async function discordSetVolume(volume: number): Promise<void> {
  await request('/api/control/volume', { method: 'POST', body: { volume } })
}

export function trackKey(track: Track | null | undefined): string {
  if (!track) return ''
  return track.url || track.id || `k-${track.title}`
}

export function formatDuration(sec: number | null | undefined): string {
  const total = Math.max(0, Number(sec) || 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

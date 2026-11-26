import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from 'react'
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Heart,
  SkipForward,
  Search as SearchIcon,
  ListMusic,
  LibraryBig,
  Disc3,
  Radio,
  RefreshCw,
  LogOut,
  ArrowLeft,
  X,
  Square,
  RotateCcw,
  Volume2,
  Settings as SettingsIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUp,
  ArrowDown,
  Music2,
  Film,
  SearchX,
  Activity,
  Info,
  ArrowUpRight,
  House,
  ShieldCheck,
  Clock3,
  Mic2,
  LifeBuoy,
  Bug,
  Lightbulb,
  Sun,
  Moon,
  CircleUserRound,
  Monitor,
  Laptop,
  Terminal,
  Cpu,
  MemoryStick,
  ArrowDownToLine,
  ArrowUpFromLine,
  AppWindow,
  Boxes,
  GitBranch,
  Download,
  Globe
} from 'lucide-react'
import {
  audioUrl,
  eventsUrl,
  loginUrl,
  searchTracks,
  getLibrary,
  getPlaylists,
  getStatus,
  getMe,
  logout,
  queueByUrl,
  saveByUrl,
  removeFromLibrary,
  removePendingTrack,
  clearPending,
  removeLiveTrack,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  toggleFavorite,
  removeFavorite,
  reportNowPlaying,
  discordPlay,
  discordSkip,
  discordStop,
  discordSetVolume,
  reorderQueue,
  reorderPending,
  trackKey,
  formatDuration,
  coverUrl,
  type Track,
  type Playlist,
  type Status,
  type User
} from './api'
import { getNorthflankLive, type NfLive, type NfMetric } from './nf'
import appIcon from '../../../build/icon.png'
import { devStatus } from './dev-data'
import { submitFeedback, type FeedbackKind, type FeedbackResult } from './feedback'
import type { UpdateStatus } from '../../shared/update-types'
import { Ring } from './components/ring'
import { DiscordIcon } from './components/discord-icon'
import SoftAurora from './components/SoftAurora'
import {
  ListeningActivity,
  type ListeningLevel
} from './components/ui/listening-activity'
import { VitalsWidget, type VitalsRing, type VitalsStat } from './components/ui/vitals-widget'
import { MinimalStepsCard } from './components/ui/minimal-steps-card'
import { Alert, AlertAction, AlertDescription } from './components/ui/alert'
import { Button } from './components/ui/button'

type View =
  | 'home'
  | 'search'
  | 'now'
  | 'queue'
  | 'library'
  | 'playlists'
  | 'favorites'
  | 'status'
  | 'about'
  | 'support'
  | 'settings'

type Theme = 'dark' | 'light' | 'system'

const SCALES = [90, 100, 110, 125]

type Font = 'native' | 'inter' | 'segoe' | 'ubuntu' | 'roboto'
const FONTS: Font[] = ['native', 'inter', 'segoe', 'ubuntu', 'roboto']
const FONT_LABEL: Record<Font, string> = {
  native: 'Native',
  inter: 'Inter',
  segoe: 'Segoe UI',
  ubuntu: 'Ubuntu',
  roboto: 'Roboto'
}

// One bar count for every sparkline in the app, so the connection strip, the
// Status cards and the Now Playing card all share the same rhythm.
const SPIKE_SLOTS = 44
const CONN_SLOTS = 80

const NAV: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <House size={15} /> },
  { id: 'search', label: 'Search', icon: <SearchIcon size={15} /> },
  { id: 'now', label: 'Now Playing', icon: <Radio size={15} /> },
  { id: 'queue', label: 'Queue', icon: <ListMusic size={15} /> },
  { id: 'library', label: 'Library', icon: <LibraryBig size={15} /> },
  { id: 'playlists', label: 'Playlists', icon: <Disc3 size={15} /> },
  { id: 'favorites', label: 'Favorites', icon: <Heart size={15} /> },
  { id: 'status', label: 'Status', icon: <Activity size={15} /> },
  { id: 'about', label: 'About', icon: <Info size={15} /> },
  { id: 'support', label: 'Support', icon: <LifeBuoy size={15} /> }
]

const TITLES: Record<View, string> = {
  home: 'Home',
  search: 'Search',
  now: 'Now Playing',
  queue: 'Queue',
  library: 'Library',
  playlists: 'Playlists',
  favorites: 'Favorites',
  status: 'Status',
  about: 'About',
  support: 'Support',
  settings: 'Settings'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [source, setSource] = useState<'music' | 'video'>('music')
  const [lastQuery, setLastQuery] = useState('')
  const [reordering, setReordering] = useState(false)

  const [library, setLibrary] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [favorites, setFavorites] = useState<Track[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [newPlaylist, setNewPlaylist] = useState('')

  const [status, setStatus] = useState<Status | null>(() =>
    import.meta.env.DEV ? devStatus() : null
  )
  const [user, setUser] = useState<User | null>(null)

  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [volume, setVolume] = useState(100)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [signedInHint, setSignedInHint] = useState(false)
  const [nf, setNf] = useState<NfLive | null>(null)
  const [nfError, setNfError] = useState('')
  const [nfLoading, setNfLoading] = useState(false)
  const [discordPending, setDiscordPending] = useState<string | null>(null)
  const [pingSamples, setPingSamples] = useState<{ at: number; ms: number }[]>([])
  const [dismissedAlert, setDismissedAlert] = useState(false)
  const [update, setUpdate] = useState<UpdateStatus>({ state: 'idle' })
  const [appVersion, setAppVersion] = useState(__APP_VERSION__)
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind | null>(null)
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackBody, setFeedbackBody] = useState('')
  const [feedbackEmail, setFeedbackEmail] = useState('')
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('shen-theme')
    return stored === 'light' || stored === 'system' ? stored : 'dark'
  })
  const [scale, setScale] = useState<number>(() => {
    const stored = Number(localStorage.getItem('shen-scale'))
    return SCALES.includes(stored) ? stored : 100
  })
  const [font, setFont] = useState<Font>(() => {
    const stored = localStorage.getItem('shen-font')
    return FONTS.includes(stored as Font) ? (stored as Font) : 'native'
  })
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('shen-sidebar') !== 'closed')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuIndex, setMenuIndex] = useState(0)
  const [accountMenu, setAccountMenu] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountMenu) return
    const close = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenu(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenu(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [accountMenu])

  useEffect(() => {
    localStorage.setItem('shen-sidebar', sidebarOpen ? 'open' : 'closed')
  }, [sidebarOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) setMenuIndex(0)
  }, [menuOpen])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
    }
    apply()
    localStorage.setItem('shen-theme', theme)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.zoom = String(scale / 100)
    localStorage.setItem('shen-scale', String(scale))
  }, [scale])

  useEffect(() => {
    if (font === 'native') delete document.documentElement.dataset.font
    else document.documentElement.dataset.font = font
    localStorage.setItem('shen-font', font)
  }, [font])

  const refreshLibrary = useCallback(async () => setLibrary(await getLibrary()), [])
  const refreshPlaylists = useCallback(async () => {
    const data = await getPlaylists()
    setPlaylists(data.playlists)
    setFavorites(data.favorites)
  }, [])
  const refreshUser = useCallback(async () => setUser(await getMe()), [])
  const refreshStatus = useCallback(async () => {
    const next = await getStatus()
    setStatus(import.meta.env.DEV ? devStatus(next) : next)
  }, [])

  const loadNf = useCallback(async () => {
    setNfLoading(true)
    try {
      const data = await getNorthflankLive()
      setNf(data)
      setNfError('')
    } catch (err) {
      setNfError(errorMessage(err))
    } finally {
      setNfLoading(false)
    }
  }, [])

  // Live tab: poll while visible, stop when navigating away.
  useEffect(() => {
    if (view !== 'status') return
    void loadNf()
    const timer = window.setInterval(() => void loadNf(), 5000)
    return () => window.clearInterval(timer)
  }, [view, loadNf])

  // Native update bridge (preload): version + live update status.
  useEffect(() => {
    const api = window.shen
    if (!api) return
    void api.getVersion().then(setAppVersion).catch(() => {})
    return api.onUpdate(setUpdate)
  }, [])

  // When the Discord bot starts a new track, bring the app to Now Playing.
  const lastDiscordTrack = useRef<string | null>(null)
  useEffect(() => {
    const url = status?.nowPlaying?.url ?? null
    if (url && url !== lastDiscordTrack.current) {
      lastDiscordTrack.current = url
      setView('now')
    } else if (!url) {
      lastDiscordTrack.current = null
    }
  }, [status?.nowPlaying?.url])

  // Round-trip samples for the connection card on Now Playing.
  useEffect(() => {
    if (view !== 'now') return
    let cancelled = false
    let timer: number | undefined
    const sample = async () => {
      const started = performance.now()
      try {
        const res = await fetch('/health', { cache: 'no-store' })
        await res.text()
        if (cancelled) return
        const ms = Math.max(1, Math.round(performance.now() - started))
        setPingSamples((prev) => [...prev.slice(-CONN_SLOTS), { at: Date.now(), ms }])
      } catch {
        if (cancelled) return
        setPingSamples((prev) => [...prev.slice(-CONN_SLOTS), { at: Date.now(), ms: 0 }])
      }
      if (!cancelled) timer = window.setTimeout(() => void sample(), 3000)
    }
    void sample()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [view])

  // Optimistic reorder: the list moves immediately, the API call follows in the
  // background and the server's view is re-read afterwards.
  const moveItem = useCallback(
    <T,>(list: T[], from: number, to: number): T[] | null => {
      if (to < 0 || to >= list.length || from === to) return null
      const next = list.slice()
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    },
    []
  )

  const moveLive = useCallback(
    (from: number, to: number) => {
      if (!status) return
      const next = moveItem(status.queue, from, to)
      if (!next) return
      setStatus({ ...status, queue: next })
      setReordering(true)
      void reorderQueue(from, to)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => {
          setReordering(false)
          void refreshStatus().catch(() => {})
        })
    },
    [status, moveItem, refreshStatus]
  )

  const movePending = useCallback(
    (from: number, to: number) => {
      if (!status) return
      const next = moveItem(status.pending, from, to)
      if (!next) return
      setStatus({ ...status, pending: next })
      setReordering(true)
      void reorderPending(from, to)
        .catch((err) => setError(errorMessage(err)))
        .finally(() => {
          setReordering(false)
          void refreshStatus().catch(() => {})
        })
    },
    [status, moveItem, refreshStatus]
  )

  const bootstrap = useCallback(async () => {
    await Promise.allSettled([
      refreshLibrary(),
      refreshPlaylists(),
      refreshUser(),
      refreshStatus()
    ])
  }, [refreshLibrary, refreshPlaylists, refreshUser, refreshStatus])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const es = new EventSource(eventsUrl())
    es.onmessage = (ev) => {
      try {
        const next = JSON.parse(ev.data) as Status
        setStatus(import.meta.env.DEV ? devStatus(next) : next)
        if (Array.isArray(next.library)) setLibrary(next.library)
      } catch {
        /* ignore malformed frames */
      }
    }
    return () => es.close()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void refreshUser().catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshUser])

  useEffect(() => {
    if (user) setSignedInHint(false)
  }, [user])

  useEffect(() => {
    if (user || !signedInHint) return
    const timer = window.setInterval(() => {
      void refreshUser().catch(() => {})
    }, 1500)
    return () => window.clearInterval(timer)
  }, [user, signedInHint, refreshUser])


  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!current) {
      audio.removeAttribute('src')
      audio.load()
      return
    }
    audio.src = audioUrl(current)
    setPosition(0)
    setDuration(0)
    void audio.play().catch(() => {})
    void reportNowPlaying(current).catch(() => {})
  }, [current])

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }, [])

  const play = useCallback((track: Track) => {
    setCurrent(track)
  }, [])

  const queue = useCallback(
    (track: Track) =>
      run(async () => {
        await queueByUrl(track.url)
        await refreshStatus()
      }),
    [run, refreshStatus]
  )

  // Start a track in Discord with a loader on that row instead of a global
  // refresh spinner.
  const startDiscord = useCallback(
    async (track: Track) => {
      const key = trackKey(track)
      setDiscordPending(key)
      setError('')
      try {
        await discordPlay(track.url)
        await refreshStatus()
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setDiscordPending(null)
      }
    },
    [refreshStatus]
  )

  const save = useCallback(
    (track: Track) =>
      run(async () => {
        await saveByUrl(track.url)
        await refreshLibrary()
        await refreshStatus()
      }),
    [run, refreshLibrary, refreshStatus]
  )

  const favorite = useCallback(
    (track: Track) =>
      run(async () => {
        const exists = favorites.some((f) => trackKey(f) === trackKey(track))
        if (exists) await removeFavorite(trackKey(track))
        else await toggleFavorite(track)
        await refreshPlaylists()
      }),
    [run, favorites, refreshPlaylists]
  )

  const isFavorite = useCallback(
    (track: Track) => favorites.some((f) => trackKey(f) === trackKey(track)),
    [favorites]
  )

  const addToPlaylist = useCallback(
    (playlistId: string, track: Track) =>
      run(async () => {
        const updated = await addTrackToPlaylist(playlistId, track)
        setPlaylists((list) => list.map((p) => (p.id === updated.id ? updated : p)))
      }),
    [run]
  )

  const runSearch = useCallback(
    async (q: string, nextSource: 'music' | 'video') => {
      const term = q.trim()
      if (!term) return
      setSearching(true)
      setError('')
      try {
        const found = await searchTracks(term, nextSource)
        setResults(found)
        setLastQuery(term)
      } catch (err) {
        setError(errorMessage(err))
        setResults([])
      } finally {
        setSearching(false)
      }
    },
    []
  )

  const doSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      void runSearch(query, source)
    },
    [query, source, runSearch]
  )

  const changeSource = useCallback(
    (next: 'music' | 'video') => {
      setSource(next)
      const term = query.trim() || lastQuery
      if (term) void runSearch(term, next)
    },
    [query, lastQuery, runSearch]
  )

  const signIn = useCallback(() => {
    window.open(loginUrl(), '_blank')
    setSignedInHint(true)
  }, [])

  const signOut = useCallback(
    () =>
      run(async () => {
        await logout()
        setUser(null)
        setSignedInHint(false)
      }),
    [run]
  )

  const openFeedback = (kind: FeedbackKind) => {
    setFeedbackKind(kind)
    setFeedbackTitle('')
    setFeedbackBody('')
    setFeedbackEmail('')
    setFeedbackResult(null)
  }

  const closeFeedback = () => {
    if (feedbackBusy) return
    setFeedbackKind(null)
  }

  useEffect(() => {
    if (!feedbackKind) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!feedbackBusy) setFeedbackKind(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedbackKind, feedbackBusy])

  const sendFeedback = async (event: FormEvent) => {
    event.preventDefault()
    if (!feedbackKind || !feedbackTitle.trim() || !feedbackBody.trim()) return
    setFeedbackBusy(true)
    setFeedbackResult(null)
    const result = await submitFeedback({
      kind: feedbackKind,
      title: feedbackTitle.trim(),
      body: feedbackBody.trim(),
      email: feedbackEmail.trim() || undefined,
      version: appVersion,
      platform: navigator.userAgent
    })
    setFeedbackResult(result)
    setFeedbackBusy(false)
    if (result.ok) {
      setFeedbackTitle('')
      setFeedbackBody('')
      setFeedbackEmail('')
    }
  }

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (audio.paused) void audio.play().catch(() => {})
    else audio.pause()
  }, [current])

  const seek = useCallback((value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setPosition(value)
  }, [])

  const changeVolume = useCallback((value: number) => {
    setVolume(value)
    if (audioRef.current) audioRef.current.volume = value / 100
  }, [])

  const openPlaylist = (id: string) => {
    setSelectedPlaylist(id)
    setView('playlists')
  }

  const playlist = playlists.find((p) => p.id === selectedPlaylist) ?? null

  // Most recently played songs, shown in the sidebar like OpenCode's recents.
  // The list fills whatever height is left between the nav and the account
  // card, so it is sliced to the rows that actually fit instead of scrolling.
  const recentTracks = (status?.history ?? []).filter(
    (track, index, list) =>
      list.findIndex((other) => trackKey(other) === trackKey(track)) === index
  )
  const recentListRef = useRef<HTMLDivElement>(null)
  const [recentSlots, setRecentSlots] = useState(8)

  useEffect(() => {
    const el = recentListRef.current
    if (!el) return
    const rowHeight = 44
    const gap = 1
    const measure = () =>
      setRecentSlots(Math.max(1, Math.floor((el.clientHeight + gap) / (rowHeight + gap))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sidebarOpen, view, recentTracks.length])

  const history = status?.history ?? []

  const listeningSeconds = history.reduce((total, track) => total + (track.duration ?? 0), 0)
  const topArtist =
    [...history.reduce((counts, track) => {
      const name = track.artist?.trim()
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      return counts
    }, new Map<string, number>())]
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Covers for the home stat cards. YouTube artwork makes the numbers feel like
  // actual listening instead of four empty figures.
  const coversOf = (tracks: Track[], limit = 4) => {
    const seen = new Set<string>()
    const art: string[] = []
    for (const track of tracks) {
      const src = coverUrl(track)
      if (!src || seen.has(src)) continue
      seen.add(src)
      art.push(src)
      if (art.length >= limit) break
    }
    return art
  }
  const topArtistTracks =
    topArtist === '—'
      ? []
      : history.filter((track) => (track.artist?.trim() || '') === topArtist)
  const artistCovers = coversOf(topArtistTracks.length > 0 ? topArtistTracks : history, 1)
  const savedCovers = coversOf(library)

  // Status tab vitals: the latest sample of each live metric plus the local
  // latency average, folded into three rings and a single health score.
  const latestSample = (metric: NfMetric | null) => {
    const last = metric?.points[metric.points.length - 1]
    return typeof last?.v === 'number' ? last.v : null
  }
  const clampPct = (value: number) => Math.min(100, Math.max(0, value))
  const cpuPct = latestSample(nf?.metrics.cpu ?? null)
  const memoryPct = latestSample(nf?.metrics.memory ?? null)
  const avgPing = pingSamples.length
    ? Math.round(
        pingSamples.reduce((total, sample) => total + sample.ms, 0) / pingSamples.length
      )
    : null
  const formatPct = (value: number) => `${Number(value.toFixed(value < 1 ? 2 : 1))}%`
  const statusPingBars = [
    ...Array.from(
      { length: Math.max(0, CONN_SLOTS - pingSamples.slice(-CONN_SLOTS).length) },
      () => 0
    ),
    ...pingSamples.slice(-CONN_SLOTS).map((sample) => sample.ms)
  ]
  const statusLastPing = pingSamples[pingSamples.length - 1]?.ms ?? null
  const statusPingMin = pingSamples.length
    ? Math.min(...pingSamples.slice(-CONN_SLOTS).map((s) => s.ms))
    : null
  const statusPingMax = pingSamples.length
    ? Math.max(...pingSamples.slice(-CONN_SLOTS).map((s) => s.ms))
    : null
  const statusPingCount = pingSamples.slice(-CONN_SLOTS).length
  const vitalsStats: VitalsStat[] = [
    {
      value: cpuPct === null ? '—' : formatPct(cpuPct),
      label: 'CPU',
      color: '#7388ff',
      icon: <Cpu />
    },
    {
      value: memoryPct === null ? '—' : formatPct(memoryPct),
      label: 'Memory',
      color: '#f0577a',
      icon: <MemoryStick />
    }
  ]
  const vitalsRings: VitalsRing[] = [
    ...(cpuPct === null
      ? []
      : [{ label: 'CPU', value: clampPct(cpuPct), color: '#7388ff' }]),
    ...(memoryPct === null
      ? []
      : [{ label: 'Memory', value: clampPct(memoryPct), color: '#f0577a' }]),
    ...(avgPing === null
      ? []
      : [{ label: 'Latency', value: Math.min(100, Math.max(0, avgPing)), color: '#5fe24f' }])
  ]
  const vitalsScore = Math.round(
    [
      100 - clampPct(cpuPct ?? 0),
      100 - clampPct(memoryPct ?? 0),
      avgPing === null ? 100 : 100 - Math.min(100, avgPing / 2)
    ].reduce((total, part) => total + part, 0) / 3
  )

  // A year of daily plays for the home heatmap. Days run Sunday→Saturday so
  // the columns line up; today and the rest of the week simply have no plays.
  const listeningDays = (() => {
    const keyOf = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`
    const counts = new Map<string, number>()
    for (const track of history) {
      if (!track.playedAt) continue
      const key = keyOf(new Date(track.playedAt))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setDate(end.getDate() + (6 - end.getDay()))
    const start = new Date(end)
    start.setDate(start.getDate() - (53 * 7 - 1))
    const days: { date: string; count: number }[] = []
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = keyOf(cursor)
      days.push({ date: key, count: counts.get(key) ?? 0 })
    }
    const max = Math.max(1, ...days.map((day) => day.count))
    return days.map((day) => ({
      ...day,
      level: (day.count === 0
        ? 0
        : Math.min(4, Math.ceil((day.count / max) * 4))) as ListeningLevel
    }))
  })()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greetingMark = greetingEmoji(new Date())
  const ua = navigator.userAgent
  const electronVersion = ua.match(/Electron\/([\d.]+)/)?.[1] ?? '—'
  const chromiumVersion = ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0] ?? '—'
  const architecture = /arm64|aarch64/i.test(ua) ? 'arm64' : 'x64'

  const dockTrack = current ?? status?.nowPlaying ?? null
  const nowTrack = current ?? status?.nowPlaying ?? null
  const relatedTracks = (() => {
    const pool = [...library, ...(status?.history ?? [])]
    const seen = new Set<string>()
    const sameArtist: Track[] = []
    const others: Track[] = []
    for (const track of pool) {
      const key = track.id ?? track.title
      if (seen.has(key)) continue
      seen.add(key)
      if (!nowTrack || key === (nowTrack.id ?? nowTrack.title)) continue
      if (nowTrack.artist && track.artist === nowTrack.artist) sameArtist.push(track)
      else others.push(track)
    }
    return [...sameArtist, ...others].slice(0, 8)
  })()
  const dockSource = current ? 'Browser' : dockTrack ? 'Discord' : null
  const updateInfo = updateMessage(update)
  const statusGuild =
    status?.guilds?.find((entry) => entry.inVoice) ??
    status?.guilds?.find((entry) => entry.id === status.guildId) ??
    null

  // The titlebar menu is a short command list, not a second copy of the
  // sidebar. Only the seven places people jump between live here plus the
  // app-level actions and Settings; Status, About and Support stay in the sidebar.
  const PALETTE_VIEWS: View[] = ['home', 'search', 'now', 'queue', 'library', 'playlists', 'favorites']
  const openView = (next: View) => {
    setView(next)
    if (next !== 'playlists') setSelectedPlaylist(null)
  }
  type MenuAction = {
    id: string
    label: string
    icon: ReactNode
    run: () => void
  }
  const menuActions: MenuAction[] = [
    ...NAV.filter((item) => PALETTE_VIEWS.includes(item.id)).map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      run: () => openView(item.id)
    })),
    {
      id: 'theme',
      label: `Theme: ${theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}`,
      icon: theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />,
      run: () => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
    },
    {
      id: 'updates',
      label: 'Check for updates',
      icon: <RefreshCw size={15} />,
      run: () => {
        setView('support')
        setSelectedPlaylist(null)
        void window.shen?.checkForUpdates()
      }
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon size={15} />,
      run: () => openView('settings')
    },
    {
      id: 'sidebar',
      label: sidebarOpen ? 'Hide sidebar' : 'Show sidebar',
      icon: sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />,
      run: () => setSidebarOpen((open) => !open)
    },
    ...(user
      ? [
          {
            id: 'signout',
            label: 'Sign out',
            icon: <LogOut size={15} />,
            run: () => void signOut()
          }
        ]
      : [])
  ]
  const visibleActions = menuActions

  const renderTrackList = (
    list: Track[],
    empty: string,
    options?: {
      onRemove?: (track: Track) => void
      removeLabel?: string
      playlistId?: string
    }
  ) => {
    if (list.length === 0) return <div className="empty">{empty}</div>
    return (
      <div className="list">
        {list.map((track, index) => {
          const active = trackKey(track) === trackKey(current)
          return (
            <TrackRow
              key={`${trackKey(track)}-${track.addedAt ?? ''}`}
              track={track}
              index={index}
              active={active}
              playing={active && playing}
              onPlay={() => play(track)}
              playlists={playlists}
              onAddToPlaylist={options?.playlistId ? undefined : (id) => addToPlaylist(id, track)}
              favorite={isFavorite(track)}
              onFavorite={() => favorite(track)}
              onQueue={() => queue(track)}
              onSave={() => save(track)}
              onDiscord={() => void startDiscord(track)}
              discordBusy={discordPending === trackKey(track)}
              onRemove={options?.onRemove ? () => options.onRemove!(track) : undefined}
              removeLabel={options?.removeLabel}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={`window${isWindows ? ' is-windows' : ''}`}>
      <header className="titlebar">
        <div className="tb-group">
          <button
            className={`tb-btn${menuOpen ? ' active' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            title="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Menu size={15} />
          </button>
          <button
            className="tb-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-pressed={!sidebarOpen}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
        </div>
        <div className="titlebar-spacer" />
      </header>

      {menuOpen ? (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div
            className="cmdk"
            role="dialog"
            aria-modal="true"
            aria-label="App menu"
            tabIndex={-1}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setMenuIndex((index) =>
                  visibleActions.length === 0 ? 0 : (index + 1) % visibleActions.length
                )
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setMenuIndex((index) =>
                  visibleActions.length === 0
                    ? 0
                    : (index - 1 + visibleActions.length) % visibleActions.length
                )
              } else if (event.key === 'Enter') {
                event.preventDefault()
                visibleActions[menuIndex]?.run()
                setMenuOpen(false)
              }
            }}
          >
            <div className="cmdk-list">
              {visibleActions.map((action, index) => (
                <button
                  key={action.id}
                  className={`cmdk-item${index === menuIndex ? ' active' : ''}`}
                  onMouseMove={() => setMenuIndex(index)}
                  onClick={() => {
                    action.run()
                    setMenuOpen(false)
                  }}
                >
                  <span className="cmdk-icon">{action.icon}</span>
                  <span className="cmdk-label">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className={`app${sidebarOpen ? '' : ' collapsed'}`}>
        <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => {
                setView(item.id)
                if (item.id !== 'playlists') setSelectedPlaylist(null)
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        {recentTracks.length > 0 ? (
          <div className="sidebar-recent">
            <div className="recent-list" ref={recentListRef}>
              {recentTracks.slice(0, recentSlots).map((track, index) => (
                <button
                  key={`${trackKey(track)}-${index}`}
                  className="recent-item"
                  onClick={() => play(track)}
                  title={`Play ${track.title}`}
                >
                  <span className="recent-art">
                    {coverUrl(track) ? (
                      <img
                        src={coverUrl(track) ?? undefined}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.visibility = 'hidden'
                        }}
                      />
                    ) : (
                      <Music2 size={12} />
                    )}
                  </span>
                  <span className="recent-copy">
                    <span className="recent-title">{track.title}</span>
                    <span className="recent-meta">{track.artist || 'Unknown artist'}</span>
                  </span>
                  <span className="recent-time">{relativePlayedAt(track.playedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="sidebar-footer">
          {user ? (
            <div className="account-wrap" ref={accountMenuRef}>
              <button
                className={`account-card${accountMenu ? ' open' : ''}`}
                onClick={() => setAccountMenu((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={accountMenu}
                title="Account menu"
              >
                <span className="account-avatar-wrap">
                  <img
                    className="account-avatar"
                    src={user.avatar ?? undefined}
                    alt=""
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                  />
                  <span className="account-presence" aria-hidden="true" />
                </span>
                <div className="account-meta">
                  <div className="account-name">{user.global_name || user.username || 'Shen user'}</div>
                  <div className="muted account-provider">
                    <DiscordIcon width={9} height={9} /> Signed in
                  </div>
                </div>
              </button>
              {accountMenu ? (
                <div className="account-menu" role="menu">
                  <div className="account-menu-head">
                    <span className="account-menu-avatar">
                      <img
                        src={user.avatar ?? undefined}
                        alt=""
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                      />
                      <span className="account-presence" aria-hidden="true" />
                    </span>
                    <span className="account-menu-copy">
                      <span className="account-menu-name">
                        {user.global_name || user.username || 'Shen user'}
                      </span>
                      <span className="account-menu-sub">
                        {user.username ? `@${user.username}` : 'Signed in with Discord'}
                      </span>
                    </span>
                  </div>
                  <div className="account-menu-sep" />
                  <button
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenu(false)
                      if (user.id) {
                        window.open(
                          `https://discord.com/users/${user.id}`,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                    }}
                  >
                    <CircleUserRound size={16} />
                    <span>My profile</span>
                  </button>
                  <button
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenu(false)
                      openView('settings')
                    }}
                  >
                    <SettingsIcon size={16} />
                    <span>Settings</span>
                  </button>
                  <button
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenu(false)
                      setView('support')
                      setSelectedPlaylist(null)
                      void window.shen?.checkForUpdates()
                    }}
                  >
                    <RefreshCw size={16} />
                    <span>Check for updates</span>
                  </button>
                  <div className="account-menu-sep" />
                  <button
                    className="account-menu-item destructive"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenu(false)
                      signOut()
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button className="signin" onClick={signIn} title="Sign in with Discord">
              <DiscordIcon width={15} height={15} /> <span>Sign in with Discord</span>
            </button>
          )}
          {!user && signedInHint ? (
            <div className="signin-hint" role="status">
              <div className="signin-hint-head">
                <Ring className="signin-hint-loader" />
                <strong>Finish signing in</strong>
                <button
                  className="signin-hint-close"
                  onClick={() => setSignedInHint(false)}
                  title="Dismiss"
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
              <p>Complete Discord sign-in in your browser, then check again.</p>
              <button
                className="btn small signin-hint-action"
                disabled={busy}
                onClick={() => run(async () => { await refreshUser() })}
              >
                {busy ? (
                  <Ring className="row-loader" />
                ) : (
                  <RefreshCw size={12} />
                )}{' '}
                Refresh status
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{selectedPlaylist && playlist ? playlist.name : TITLES[view]}</h1>
          <div className="spacer" />
          {view === 'search' ? (
            <form className="searchbar" onSubmit={doSearch}>
              <div className="segmented" role="tablist" aria-label="Search source">
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'music'}
                  className={source === 'music' ? 'active' : ''}
                  onClick={() => changeSource('music')}
                  title="Search YouTube Music"
                >
                  <Music2 size={12} /> Music
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'video'}
                  className={source === 'video' ? 'active' : ''}
                  onClick={() => changeSource('video')}
                  title="Search YouTube videos"
                >
                  <Film size={12} /> Video
                </button>
              </div>
              <div className="searchfield">
                <SearchIcon size={13} className="searchfield-icon" aria-hidden="true" />
                <input
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={source === 'music' ? 'Songs, artists, albums…' : 'Search videos…'}
                  autoFocus
                />
                {query ? (
                  <button
                    type="button"
                    className="searchfield-clear"
                    title="Clear search"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery('')
                      setResults([])
                      setLastQuery('')
                    }}
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
              <button className="btn primary" type="submit" disabled={searching}>
                {searching ? <span className="spinner small" /> : <SearchIcon size={13} />}
                {searching ? 'Searching' : 'Search'}
              </button>
            </form>
          ) : null}
        </header>

        <section className="content" key={view}>
          {error ? (
            <div className="banner">
              <span>{error}</span>
              <button onClick={() => setError('')}>
                <X size={13} /> Dismiss
              </button>
            </div>
          ) : null}

          {view === 'home' ? (
            <div className="home">
              {!user && !dismissedAlert ? (
                <Alert>
                  <ShieldCheck />
                  <AlertDescription>
                    Sign in with Discord to sync your library, playlists and queue.
                  </AlertDescription>
                  <AlertAction>
                    <Button variant="outline" size="sm" onClick={() => setDismissedAlert(true)}>
                      Dismiss
                    </Button>
                    <Button size="sm" onClick={signIn}>
                      Sign in
                    </Button>
                  </AlertAction>
                </Alert>
              ) : null}

              <div className="home-hero">
                <div>
                  <h2 className="home-greeting">
                    {greeting} {greetingMark}
                  </h2>
                  <p className="home-sub">Here’s what’s been playing on Shen.</p>
                </div>
                <div className="home-now">
                  {status?.nowPlaying ? (
                    <>
                      <span className="live-dot" aria-hidden="true" />
                      <span className="home-now-title">{status.nowPlaying.title}</span>
                    </>
                  ) : (
                    <span className="muted">Nothing playing right now</span>
                  )}
                </div>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-copy">
                    <span className="stat-label">
                      <ListMusic size={13} /> Songs played
                    </span>
                    <b>{history.length}</b>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-copy">
                    <span className="stat-label">
                      <Clock3 size={13} /> Listening time
                    </span>
                    <b>{formatSpan(listeningSeconds)}</b>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-copy">
                    <span className="stat-label">
                      <Mic2 size={13} /> Top artist
                    </span>
                    <b title={topArtist}>{topArtist}</b>
                  </div>
                  <StatArt covers={artistCovers} fallback={<Mic2 size={15} />} />
                </div>
                <div className="stat-card">
                  <div className="stat-copy">
                    <span className="stat-label">
                      <LibraryBig size={13} /> Saved tracks
                    </span>
                    <b>{library.length}</b>
                  </div>
                  <StatArt covers={savedCovers} fallback={<LibraryBig size={15} />} />
                </div>
              </div>

              <div className="home-activity">
                <div className="home-activity-head">
                  <h2>Listening activity</h2>
                  <span className="muted">Last 12 months</span>
                </div>
                <ListeningActivity days={listeningDays} />
              </div>

              <div className="rowgroup">
                <div className="section-head">
                  <h2>Recently played</h2>
                  <span className="muted">{history.length}</span>
                  <button className="btn small" onClick={() => setView('search')}>
                    <SearchIcon size={13} /> Find music
                  </button>
                </div>
                {history.length > 0 ? (
                  <div className="list">
                    {history.slice(0, 6).map((track, index) => (
                      <TrackRow
                        key={track.id ?? `${trackKey(track)}-${index}`}
                        track={track}
                        index={index}
                        note={formatPlayedAt(track.playedAt)}
                        onPlay={() => play(track)}
                        onQueue={() => queue(track)}
                        favorite={isFavorite(track)}
                        onFavorite={() => favorite(track)}
                        onSave={() => save(track)}
                        onDiscord={() => void startDiscord(track)}
                        discordBusy={discordPending === trackKey(track)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty">Nothing played yet. Start something from Search.</div>
                )}
              </div>
            </div>
          ) : null}

          {view === 'search' ? (
            searching ? (
              <div className="rowgroup">
                <div className="section-head">
                  <h2>Searching…</h2>
                </div>
                <div className="list">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      className="row skeleton-row"
                      key={i}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="thumb skeleton" />
                      <div className="meta">
                        <div
                          className="skeleton skeleton-line"
                          style={{ width: `${48 + ((i * 13) % 34)}%` }}
                        />
                        <div className="skeleton skeleton-line short" />
                      </div>
                      <div className="skeleton skeleton-dur" />
                    </div>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="empty">
                <div className="empty-inner">
                  {lastQuery ? <SearchX size={22} /> : <SearchIcon size={22} />}
                  <span>
                    {lastQuery
                      ? `No results for “${lastQuery}”.`
                      : 'Search for a song, artist, or paste a YouTube URL.'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="section-head results-head">
                  <h2>Results for “{lastQuery}”</h2>
                  <span className="muted">{results.length}</span>
                  <span className="source-tag">{source === 'music' ? 'Music' : 'Video'}</span>
                </div>
                {renderTrackList(results, 'No results.')}
              </>
            )
          ) : null}

          {view === 'now' ? (
            <NowPlaying
              current={current}
              playing={playing}
              status={status}
              pingSamples={pingSamples}
              relatedTracks={relatedTracks}
              onPlay={play}
              onSkip={() =>
                run(async () => {
                  await discordSkip()
                  await refreshStatus()
                })
              }
              onStop={() =>
                run(async () => {
                  await discordStop()
                  await refreshStatus()
                })
              }
              onVolume={(v) =>
                run(async () => {
                  await discordSetVolume(v)
                  await refreshStatus()
                })
              }
            />
          ) : null}

          {view === 'queue' ? (
            <>
              <div className="rowgroup">
                <div className="section-head">
                  <h2>Live queue</h2>
                  <span className="muted">{status?.queue.length ?? 0}</span>
                  <span className="section-note">Playing in Discord</span>
                </div>
                {status && status.queue.length > 0 ? (
                  <div className={`list${reordering ? ' is-reordering' : ''}`}>
                    {status.queue.map((track, index) => (
                      <TrackRow
                        key={`${trackKey(track)}-${index}`}
                        track={track}
                        index={index}
                        active={index === status.position}
                        playing={index === status.position && status.playing}
                        onPlay={() => play(track)}
                        favorite={isFavorite(track)}
                        onFavorite={() => favorite(track)}
                        onMoveUp={() => moveLive(index, index - 1)}
                        onMoveDown={() => moveLive(index, index + 1)}
                        canMoveUp={index > 0}
                        canMoveDown={index < status.queue.length - 1}
                        onRemove={() =>
                          run(async () => {
                            await removeLiveTrack(index)
                            await refreshStatus()
                          })
                        }
                        removeLabel="Remove"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty">Nothing playing in Discord.</div>
                )}
              </div>

              <div className="rowgroup">
                <div className="section-head">
                  <h2>Pending</h2>
                  <span className="muted">{status?.pending.length ?? 0}</span>
                  {status && status.pending.length > 0 ? (
                    <button
                      className="btn small"
                      onClick={() =>
                        run(async () => {
                          await clearPending()
                          await refreshStatus()
                        })
                      }
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  ) : null}
                </div>
                {status && status.pending.length > 0 ? (
                  <div className={`list${reordering ? ' is-reordering' : ''}`}>
                    {status.pending.map((track, index) => (
                      <TrackRow
                        key={track.id ?? `${trackKey(track)}-${index}`}
                        track={track}
                        index={index}
                        onPlay={() => play(track)}
                        favorite={isFavorite(track)}
                        onFavorite={() => favorite(track)}
                        onMoveUp={() => movePending(index, index - 1)}
                        onMoveDown={() => movePending(index, index + 1)}
                        canMoveUp={index > 0}
                        canMoveDown={index < status.pending.length - 1}
                        onRemove={() =>
                          run(async () => {
                            if (track.id) await removePendingTrack(track.id)
                            await refreshStatus()
                          })
                        }
                        removeLabel="Remove"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty">No queued tracks.</div>
                )}
              </div>
            </>
          ) : null}

          {view === 'library'
            ? renderTrackList(library, 'Nothing saved yet. Use “Save” on a track.', {
                onRemove: (track) =>
                  run(async () => {
                    if (track.id) await removeFromLibrary(track.id)
                    await refreshLibrary()
                  }),
                removeLabel: 'Remove'
              })
            : null}

          {view === 'favorites'
            ? renderTrackList(favorites, 'No favorites yet.', {
                onRemove: (track) => favorite(track),
                removeLabel: 'Unfavorite'
              })
            : null}

          {view === 'status' ? (
            <div className="nflive">
              {nfError ? (
                <div className="nf-error">
                  <div className="nf-error-title">Status is offline</div>
                  <p>
                    Live service health comes from the hosted Shen backend. Its metrics endpoint
                    isn’t reachable right now, so there’s nothing to show yet.
                  </p>
                  <p className="muted">{nfError}</p>
                  <button className="btn small" onClick={() => void loadNf()} disabled={nfLoading}>
                    <RefreshCw size={12} className={nfLoading ? 'spin' : undefined} /> Try again
                  </button>
                </div>
              ) : nf ? (
                <>
﻿                  <div className="status-conn-card">
                    <MinimalStepsCard
                      title="Connection"
                      subtitle={status?.botReady ? 'Discord connected' : 'Discord offline'}
                      value={statusLastPing}
                      unit="ms"
                      icon={<DiscordIcon width={15} height={15} />}
                      data={statusPingBars}
                      tone={status?.botReady ? 'green' : 'red'}
                      footer={
                        <>
                          <span>
                            {statusPingMin === null
                              ? 'Waiting for latency'
                              : `min ${statusPingMin} ms`}
                          </span>
                          <span>
                            {statusPingMax === null ? '' : `max ${statusPingMax} ms`}
                          </span>
                          <span>
                            {statusPingCount
                              ? `${statusPingCount} sample${statusPingCount === 1 ? '' : 's'}`
                              : ''}
                          </span>
                        </>
                      }
                    />
                    {statusGuild?.name ? (
                      <div className="status-conn-meta">
                        <span className="muted">{statusGuild.name}</span>
                        <span className="muted">
                          {statusGuild.voiceChannelName ?? 'Not connected'}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <VitalsWidget
                    className="status-vitals"
                    title="Server"
                    stats={vitalsStats}
                    rings={vitalsRings}
                    score={vitalsScore}
                    scoreLabel="Health"
                  />

                  <div className="spark-grid">
                    <MetricStepsCard
                      label="CPU"
                      metric={nf.metrics.cpu}
                      tone="green"
                      icon={<Cpu />}
                      minutes={Math.round(nf.duration / 60)}
                    />
                    <MetricStepsCard
                      label="Memory"
                      metric={nf.metrics.memory}
                      tone="green"
                      icon={<MemoryStick />}
                      minutes={Math.round(nf.duration / 60)}
                    />
                    <MetricStepsCard
                      label="Network in"
                      metric={nf.metrics.networkIngress}
                      tone="green"
                      icon={<ArrowDownToLine />}
                      minutes={Math.round(nf.duration / 60)}
                    />
                    <MetricStepsCard
                      label="Network out"
                      metric={nf.metrics.networkEgress}
                      tone="red"
                      icon={<ArrowUpFromLine />}
                      minutes={Math.round(nf.duration / 60)}
                    />
                  </div>

                  <div className="nf-foot">
                    <span className="muted">
                      Last {Math.round(nf.duration / 60)} minutes · refreshed every 5s
                    </span>
                    <button className="btn small" onClick={() => void loadNf()} disabled={nfLoading}>
                      <RefreshCw size={12} className={nfLoading ? 'spin' : undefined} /> Refresh
                    </button>
                  </div>
                </>
              ) : (
                <div className="spark-grid">
                  {[0, 1, 2, 3].map((i) => (
                    <div className="spark-card" key={i}>
                      <div className="skeleton skeleton-line" style={{ width: '30%' }} />
                      <div className="skeleton skeleton-spikes" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {view === 'about' ? (
            <div className="about">
              <div className="about-card">
                <img className="about-logo" src={appIcon} alt="Shen logo" />
                <div className="about-copy">
                  <h2>Shen</h2>
                  <p>
                    A desktop music companion for the Shen Discord bot. Search, queue, and
                    listen together with your server.
                  </p>
                  <div className="about-tags">
                    <span className="about-tag">
                      <Monitor size={11} /> Desktop
                    </span>
                    <span className="about-tag">
                      <DiscordIcon width={10} height={10} /> Discord bot
                    </span>
                    <span className="about-tag">
                      <RefreshCw size={11} /> Auto-updates
                    </span>
                  </div>
                </div>
                <span className="pill">v{appVersion}</span>
              </div>

              <div className="about-grid">
                <section className="about-panel">
                  <h3>Details</h3>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <Cpu size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">Electron</span>
                      <span className="about-row-sub">Desktop runtime</span>
                    </span>
                    <span className="about-row-value">{electronVersion}</span>
                  </div>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <AppWindow size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">Chromium</span>
                      <span className="about-row-sub">Rendering engine</span>
                    </span>
                    <span className="about-row-value">{chromiumVersion}</span>
                  </div>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <Boxes size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">Architecture</span>
                      <span className="about-row-sub">Build target</span>
                    </span>
                    <span className="about-row-value">{architecture}</span>
                  </div>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <Download size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">Updates</span>
                      <span className="about-row-sub">Delivered automatically</span>
                    </span>
                    <span className="about-row-value">GitHub</span>
                  </div>
                </section>

                <section className="about-panel">
                  <h3>Supported platforms</h3>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <Monitor size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">Windows</span>
                      <span className="about-row-sub">10 / 11 · 64-bit</span>
                    </span>
                    <span className="about-status supported">
                      <span className="about-dot" aria-hidden="true" />
                      Available
                    </span>
                  </div>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <Laptop size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">macOS</span>
                      <span className="about-row-sub">Apple silicon / Intel</span>
                    </span>
                    <span className="about-status">Not yet</span>
                  </div>
                  <div className="about-row">
                    <span className="about-row-icon">
                      <Terminal size={14} />
                    </span>
                    <span className="about-row-copy">
                      <span className="about-row-name">Linux</span>
                      <span className="about-row-sub">x64 builds</span>
                    </span>
                    <span className="about-status">Not yet</span>
                  </div>
                </section>
              </div>

              <div className="about-made">
                <div>
                  <div className="about-label">Designed and built by</div>
                  <div className="about-author">Zagan</div>
                </div>
                <a
                  className="about-site"
                  href="https://zagan.space"
                  target="_blank"
                  rel="noreferrer"
                >
                  zagan.space <ArrowUpRight size={12} />
                </a>
              </div>

              <div className="about-links">
                <a
                  className="about-link"
                  href="https://github.com/vihanga-nimsara/shen-app"
                  target="_blank"
                  rel="noreferrer"
                >
                  <GitBranch size={13} /> Repository <ArrowUpRight size={11} />
                </a>
                <a
                  className="about-link"
                  href="https://github.com/vihanga-nimsara/shen-app/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={13} /> Releases <ArrowUpRight size={11} />
                </a>
              </div>

              <div className="about-foot">
                <span className="muted">Made for the Shen community.</span>
                <span className="muted">{new Date().getFullYear()}</span>
              </div>
            </div>
          ) : null}

          {view === 'support' ? (
            <div className="support">
              <div className="about-card">
                <img className="about-logo" src={appIcon} alt="Shen logo" />
                <div className="about-copy">
                  <h2>Support</h2>
                  <p>Get help, report issues, and keep Shen up to date.</p>
                  <div className="about-tags">
                    <span className="about-tag">
                      <RefreshCw size={11} /> Auto-updates
                    </span>
                    <span className="about-tag">
                      <Bug size={11} /> Bug reports
                    </span>
                    <span className="about-tag">
                      <Lightbulb size={11} /> Feature ideas
                    </span>
                  </div>
                </div>
                <span className="pill">v{appVersion}</span>
              </div>

              <div className="support-card">
                <div className="support-head">
                  <span className="with-icon">
                    <RefreshCw size={13} /> Updates
                  </span>
                  <span className="pill">v{appVersion}</span>
                </div>
                <div className="support-row">
                  <div className="support-copy">
                    <div className="setting-name">{updateInfo.title}</div>
                    <div className="setting-desc">{updateInfo.body}</div>
                  </div>
                  {update.state === 'downloaded' ? (
                    <Button size="sm" onClick={() => void window.shen?.installUpdate()}>
                      Restart & install
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !window.shen ||
                        update.state === 'checking' ||
                        update.state === 'downloading' ||
                        update.state === 'dev'
                      }
                      onClick={() => void window.shen?.checkForUpdates()}
                    >
                      {update.state === 'checking' || update.state === 'downloading' ? (
                        <Ring className="row-loader" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Check for updates
                    </Button>
                  )}
                </div>
                {update.state === 'downloading' ? (
                  <div className="update-progress">
                    <span style={{ width: `${update.percent ?? 0}%` }} />
                  </div>
                ) : null}
                <div className={`support-note${update.state === 'error' ? ' error' : ''}`}>
                  {update.state === 'error'
                    ? update.message
                    : 'Updates come from GitHub releases and install when Shen restarts.'}
                </div>
              </div>

              <div className="support-grid">
                <button
                  type="button"
                  className="support-card support-link"
                  onClick={() => openFeedback('bug')}
                >
                  <div className="support-link-head">
                    <span className="support-icon">
                      <Bug size={16} />
                    </span>
                    <span className="support-copy">
                      <span className="setting-name">Report a bug</span>
                    </span>
                    <ArrowUpRight size={14} className="support-arrow" />
                  </div>
                  <span className="support-desc">
                    Something broken? Tell us what happened and we’ll look into it.
                  </span>
                </button>
                <button
                  type="button"
                  className="support-card support-link"
                  onClick={() => openFeedback('feature')}
                >
                  <div className="support-link-head">
                    <span className="support-icon">
                      <Lightbulb size={16} />
                    </span>
                    <span className="support-copy">
                      <span className="setting-name">Request a feature</span>
                    </span>
                    <ArrowUpRight size={14} className="support-arrow" />
                  </div>
                  <span className="support-desc">
                    Tell us what would make Shen better.
                  </span>
                </button>
              </div>

              <div className="about-links">
                <a
                  className="about-link"
                  href="https://github.com/vihanga-nimsara/shen-app"
                  target="_blank"
                  rel="noreferrer"
                >
                  <GitBranch size={13} /> Repository <ArrowUpRight size={11} />
                </a>
                <a
                  className="about-link"
                  href="https://github.com/vihanga-nimsara/shen-app/issues"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Bug size={13} /> Report an issue <ArrowUpRight size={11} />
                </a>
                <a
                  className="about-link"
                  href="https://github.com/vihanga-nimsara/shen-app/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={13} /> Releases <ArrowUpRight size={11} />
                </a>
                <a
                  className="about-link"
                  href="https://zagan.space"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe size={13} /> Website <ArrowUpRight size={11} />
                </a>
              </div>

              <div className="support-foot">
                Feedback goes to the Shen team. Releases and updates come from GitHub.
              </div>
            </div>
          ) : null}

          {view === 'playlists' ? (
            playlist ? (
              <>
                <div className="section-head">
                  <button className="btn small" onClick={() => setSelectedPlaylist(null)}>
                    <ArrowLeft size={13} /> All playlists
                  </button>
                  <span className="muted">{playlist.tracks.length} tracks</span>
                </div>
                {renderTrackList(playlist.tracks, 'This playlist is empty.', {
                  playlistId: playlist.id,
                  removeLabel: 'Remove',
                  onRemove: (track) =>
                    run(async () => {
                      const updated = await removeTrackFromPlaylist(playlist.id, trackKey(track))
                      setPlaylists((list) =>
                        list.map((p) => (p.id === updated.id ? updated : p))
                      )
                    })
                })}
              </>
            ) : (
              <>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const name = newPlaylist.trim()
                    if (!name) return
                    run(async () => {
                      const created = await createPlaylist(name)
                      setPlaylists((list) => [...list, created])
                      setNewPlaylist('')
                    })
                  }}
                >
                  <input
                    className="input"
                    value={newPlaylist}
                    onChange={(e) => setNewPlaylist(e.target.value)}
                    placeholder="New playlist name"
                  />
                  <button className="btn primary" type="submit" disabled={busy}>
                    <Plus size={14} /> Create
                  </button>
                </form>
                {playlists.length === 0 ? (
                  <div className="empty">No playlists yet.</div>
                ) : (
                  <div className="playlists">
                    {playlists.map((p) => (
                      <div className="playlist-row" key={p.id}>
                        <div className="meta" onDoubleClick={() => openPlaylist(p.id)}>
                          <div className="name">{p.name}</div>
                          <div className="muted">{p.tracks.length} tracks</div>
                        </div>
                        <button className="btn small" onClick={() => openPlaylist(p.id)}>
                          <ListMusic size={13} /> Open
                        </button>
                        <button
                          className="btn link danger"
                          title="Delete playlist"
                          onClick={() =>
                            run(async () => {
                              await deletePlaylist(p.id)
                              setPlaylists((list) => list.filter((x) => x.id !== p.id))
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          ) : null}

          {view === 'settings' ? (
            <div className="settings">
              <div className="settings-group">
                <div className="settings-title">Appearance</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-copy">
                      <div className="setting-name">Theme</div>
                      <div className="setting-desc">Follow the system or pick a palette.</div>
                    </div>
                    <div className="segmented">
                      {(['dark', 'light', 'system'] as Theme[]).map((item) => (
                        <button
                          key={item}
                          className={theme === item ? 'active' : ''}
                          onClick={() => setTheme(item)}
                        >
                          {item === 'dark' ? 'Dark' : item === 'light' ? 'Light' : 'System'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-row">
                    <div className="setting-copy">
                      <div className="setting-name">Interface scale</div>
                      <div className="setting-desc">Scale the whole interface up or down.</div>
                    </div>
                    <div className="segmented">
                      {SCALES.map((item) => (
                        <button
                          key={item}
                          className={scale === item ? 'active' : ''}
                          onClick={() => setScale(item)}
                        >
                          {item}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-row">
                    <div className="setting-copy">
                      <div className="setting-name">UI font</div>
                      <div className="setting-desc">
                        Pick a typeface. Native uses the fonts shipped with your OS.
                      </div>
                    </div>
                    <div className="segmented">
                      {FONTS.map((item) => (
                        <button
                          key={item}
                          className={font === item ? 'active' : ''}
                          onClick={() => setFont(item)}
                        >
                          {FONT_LABEL[item]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-copy">
                      <div className="setting-name">
                        <DiscordIcon width={12} height={12} className="setting-icon" />
                        Discord bot
                      </div>
                      <div className="setting-desc">Connection used for remote playback.</div>
                    </div>
                    <span className="setting-value">{status?.botReady ? 'Connected' : 'Offline'}</span>
                  </div>
                  <div className="setting-row">
                    <div className="setting-copy">
                      <div className="setting-name">Playback volume</div>
                      <div className="setting-desc">Level used by browser playback.</div>
                    </div>
                    <span className="setting-value">{volume}%</span>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-title">About</div>
                <div className="settings-card">
                  <div className="setting-row">
                    <div className="setting-copy">
                      <div className="setting-name">Shen</div>
                      <div className="setting-desc">Desktop music companion.</div>
                    </div>
                    <span className="setting-value">v{appVersion}</span>
                  </div>
                </div>
              </div>

              <div className="settings-foot">
                <span>Settings are saved on this device.</span>
                <button className="btn link" onClick={() => void bootstrap()} title="Refresh data">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <footer className="player">
          {coverUrl(dockTrack) ? (
            <img className="thumb" src={coverUrl(dockTrack) ?? undefined} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
          ) : (
            <div className="thumb" />
          )}
          <div className="meta">
            <div className="title">{dockTrack?.title ?? 'No track playing'}</div>
            <div className="sub muted">
              {dockTrack
                ? [dockTrack.artist || 'Unknown artist', dockSource].filter(Boolean).join(' · ')
                : 'Ready to play'}
            </div>
          </div>
          <div className="transport">
            <button
              className="btn small"
              onClick={togglePlay}
              disabled={!current}
              title="Play / pause"
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              className="btn small"
              onClick={() => seek(0)}
              disabled={!current}
              title="Restart"
            >
              <RotateCcw size={13} />
            </button>
          </div>
          <div className="seek">
            <span className="time">{formatDuration(position)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, Math.floor(duration))}
              step={1}
              value={Math.min(Math.floor(position), Math.floor(duration))}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={!current}
            />
            <span className="time">{formatDuration(duration)}</span>
          </div>
          <div className="volume">
            <Volume2 size={14} className="muted" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
            />
          </div>
          <div className="controls">
            {status?.nowPlaying ? (
              <span className="pill" title="Currently playing in Discord">
                Discord: {status.nowPlaying.title}
              </span>
            ) : null}
            {current ? (
              <button
                className="btn small"
                onClick={() => void startDiscord(current)}
                disabled={discordPending === trackKey(current)}
                title="Play this track in Discord"
              >
                {discordPending === trackKey(current) ? (
                  <Ring className="row-loader" />
                ) : (
                  <DiscordIcon width={13} height={13} />
                )}{' '}
                Discord
              </button>
            ) : null}
          </div>
          <audio
            ref={audioRef}
            className="audio-hidden"
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          />
        </footer>
      </main>
      </div>

      {feedbackKind ? (
        <div className="modal-backdrop" onClick={closeFeedback}>
          <form
            className="feedback-dialog"
            onClick={(event) => event.stopPropagation()}
            onSubmit={sendFeedback}
          >
            <div className="feedback-head">
              <div>
                <h2>{feedbackKind === 'bug' ? 'Report a bug' : 'Request a feature'}</h2>
                <p>
                  {feedbackKind === 'bug'
                    ? 'What happened, and what did you expect instead?'
                    : 'What would you like Shen to do?'}
                </p>
              </div>
              <button
                type="button"
                className="feedback-close"
                onClick={closeFeedback}
                disabled={feedbackBusy}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {feedbackResult?.ok ? (
              <div className="feedback-done">
                <ShieldCheck size={18} />
                <div>
                  <b>Thanks — message sent.</b>
                  <p>We read every report.</p>
                </div>
              </div>
            ) : (
              <>
                <label className="feedback-field">
                  <span>Title</span>
                  <input
                    autoFocus
                    required
                    maxLength={120}
                    value={feedbackTitle}
                    onChange={(event) => setFeedbackTitle(event.target.value)}
                    placeholder={
                      feedbackKind === 'bug' ? 'Queue stopped updating' : 'Sleep timer for Discord'
                    }
                  />
                </label>
                <label className="feedback-field">
                  <span>Details</span>
                  <textarea
                    required
                    rows={5}
                    maxLength={4000}
                    value={feedbackBody}
                    onChange={(event) => setFeedbackBody(event.target.value)}
                    placeholder="Add the steps, what you saw, and anything else that helps."
                  />
                </label>
                <label className="feedback-field">
                  <span>
                    Email <em>optional</em>
                  </span>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(event) => setFeedbackEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                {feedbackResult && !feedbackResult.ok ? (
                  <div className="feedback-error">
                    <span>{feedbackResult.message}</span>
                    {feedbackResult.issueUrl ? (
                      <a href={feedbackResult.issueUrl} target="_blank" rel="noreferrer">
                        Open a GitHub issue instead
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="feedback-actions">
                  <span className="muted">Shen v{appVersion}</span>
                  <div className="feedback-buttons">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeFeedback}
                      disabled={feedbackBusy}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={feedbackBusy || !feedbackTitle.trim() || !feedbackBody.trim()}
                    >
                      {feedbackBusy ? <Ring className="row-loader" /> : null} Send
                    </Button>
                  </div>
                </div>
              </>
            )}

            {feedbackResult?.ok ? (
              <div className="feedback-actions">
                <span className="muted">Shen v{appVersion}</span>
                <div className="feedback-buttons">
                  <Button variant="outline" size="sm" onClick={closeFeedback}>
                    Close
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  )
}

function TrackRow({
  track,
  index = 0,
  active,
  playing,
  onPlay,
  onQueue,
  onSave,
  onFavorite,
  favorite,
  onDiscord,
  onRemove,
  removeLabel,
  onAddToPlaylist,
  playlists,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  discordBusy,
  note
}: {
  track: Track
  index?: number
  active?: boolean
  playing?: boolean
  onPlay: () => void
  onQueue?: () => void
  onSave?: () => void
  onFavorite?: () => void
  favorite?: boolean
  onDiscord?: () => void
  onRemove?: () => void
  removeLabel?: string
  onAddToPlaylist?: (playlistId: string) => void
  playlists?: Playlist[]
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  discordBusy?: boolean
  note?: string
}) {
  const art = coverUrl(track)
  return (
    <div
      className={`row${active ? ' active' : ''}${playing ? ' playing' : ''}`}
      onDoubleClick={onPlay}
      style={{ animationDelay: `${Math.min(index, 9) * 18}ms` }}
    >
      {art ? (
        <img className="thumb" src={art} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
      ) : (
        <div className="thumb" />
      )}
      <div className="meta" onClick={onPlay} style={{ cursor: 'pointer' }}>
        <div className="title">
          {playing ? (
            <span className="eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          ) : null}
          {track.title}
        </div>
        <div className="sub">{track.artist || 'Unknown artist'}</div>
      </div>
      {note ? <span className="row-note">{note}</span> : null}
      <span className="dur">
        {track.duration ? formatDuration(track.duration) : track.durationRaw || ''}
      </span>
      <div
        className="actions"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button className="btn link" onClick={onPlay} title="Play">
          <Play size={14} />
        </button>
        {onQueue ? (
          <button className="btn link" onClick={onQueue} title="Add to queue">
            <Plus size={14} />
          </button>
        ) : null}
        {onSave ? (
          <button className="btn link" onClick={onSave} title="Save to library">
            <LibraryBig size={14} />
          </button>
        ) : null}
        {onFavorite ? (
          <button
            className={`btn link${favorite ? ' favorite' : ''}`}
            onClick={onFavorite}
            title={favorite ? 'Remove favorite' : 'Favorite'}
          >
            <Heart size={14} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        ) : null}
        {onAddToPlaylist && playlists && playlists.length > 0 ? (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onAddToPlaylist(e.target.value)
            }}
            title="Add to playlist"
            className="select compact"
          >
            <option value="">+ Playlist</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
        {onDiscord ? (
          <button
            className="btn link"
            onClick={onDiscord}
            disabled={discordBusy}
            title="Play in Discord"
          >
            {discordBusy ? (
              <Ring className="row-loader" />
            ) : (
              <DiscordIcon width={14} height={14} />
            )}
          </button>
        ) : null}
        {onMoveUp ? (
          <button className="btn link" onClick={onMoveUp} disabled={!canMoveUp} title="Move up">
            <ArrowUp size={14} />
          </button>
        ) : null}
        {onMoveDown ? (
          <button className="btn link" onClick={onMoveDown} disabled={!canMoveDown} title="Move down">
            <ArrowDown size={14} />
          </button>
        ) : null}
        {onRemove ? (
          <button className="btn link danger" onClick={onRemove} title={removeLabel ?? 'Remove'}>
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function NowPlaying({
  current,
  playing,
  status,
  pingSamples,
  relatedTracks,
  onPlay,
  onSkip,
  onStop,
  onVolume
}: {
  current: Track | null
  playing: boolean
  status: Status | null
  pingSamples: { at: number; ms: number }[]
  relatedTracks?: Track[]
  onPlay: (track: Track) => void
  onSkip: () => void
  onStop: () => void
  onVolume: (volume: number) => void
}) {
  const track = current ?? status?.nowPlaying ?? null
  const lastPing = pingSamples[pingSamples.length - 1]?.ms ?? null
  const online = Boolean(status?.botReady)

  // Latency bars share the Status tab's slot count so both views read the same.
  const recentPings = pingSamples.slice(-SPIKE_SLOTS).map((sample) => sample.ms)
  const pingBars = [
    ...Array.from({ length: Math.max(0, SPIKE_SLOTS - recentPings.length) }, () => 0),
    ...recentPings
  ]
  const pingMin = recentPings.length ? Math.min(...recentPings) : null
  const pingMax = recentPings.length ? Math.max(...recentPings) : null


  return (
    <div className="now-tab">
      <div className="now-ambient" aria-hidden="true">
        {coverUrl(track) ? (
          <img className="now-ambient-cover" src={coverUrl(track) ?? undefined} alt="" />
        ) : null}
        <SoftAurora
          speed={3}
          scale={0.1}
          brightness={1.35}
          color1="#f7f7f7"
          color2="#e100ff"
          bandHeight={0}
          bandSpread={1}
          enableMouseInteraction
          mouseInfluence={0}
          spectrum={1}
          colorSpeed={1}
          noiseFrequency={2.5}
          noiseAmplitude={0}
          tilt={0}
          octaveDecay={0}
          layerOffset={0}
          clickPulse={false}
          intro
          lightMode={false}
        />
        <div className="now-veil" />
      </div>

      <div className="now-inner">
﻿        {track ? (
          <div className="now-card">
            {coverUrl(track) ? (
              <img src={coverUrl(track) ?? undefined} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
            ) : (
              <div />
            )}
            <div>
              <div className="pill">{current ? 'Browser' : 'Discord'}</div>
              <h2>{track.title}</h2>
              <div className="muted">
                {track.artist || 'Unknown artist'}
                {track.duration ? ` · ${formatDuration(track.duration)}` : ''}
              </div>
              <div className="button-row">
                <button className="btn primary" onClick={() => onPlay(track)}>
                  <Play size={14} /> {playing && current ? 'Playing' : 'Play here'}
                </button>
                <button className="btn" onClick={onSkip}>
                  <SkipForward size={14} /> Skip in Discord
                </button>
                <button className="btn" onClick={onStop}>
                  <Square size={13} /> Stop Discord
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="now-empty">Nothing is playing. Search or pick a track to start.</div>
        )}

        {track && relatedTracks && relatedTracks.length > 0 ? (
          <div className="now-related">
            <div className="now-related-title">Related songs</div>
            <div className="now-related-list">
              {relatedTracks.map((item) => (
                <div className="now-related-row" key={item.id ?? item.title}>
                  {coverUrl(item) ? (
                    <img src={coverUrl(item) ?? undefined} alt="" />
                  ) : (
                    <div className="now-related-cover" />
                  )}
                  <div className="now-related-meta">
                    <div className="now-related-name">{item.title}</div>
                    <div className="now-related-artist">{item.artist || 'Unknown artist'}</div>
                  </div>
                  <button className="btn small" onClick={() => onPlay(item)}>
                    <Play size={12} /> Play here
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function updateMessage(status: UpdateStatus): { title: string; body: string } {
  switch (status.state) {
    case 'dev':
      return {
        title: 'Updates are checked in the packaged app',
        body: 'Run the installed build to check GitHub releases.'
      }
    case 'checking':
      return { title: 'Checking for updates…', body: 'Looking at the latest GitHub release.' }
    case 'available':
      return {
        title: `Shen ${status.version} is available`,
        body: 'Downloading in the background.'
      }
    case 'downloading':
      return {
        title: `Downloading ${status.version ? `Shen ${status.version}` : 'update'}`,
        body: `${status.percent ?? 0}% complete.`
      }
    case 'downloaded':
      return {
        title: 'Update ready to install',
        body: `Shen ${status.version} installs the next time you quit.`
      }
    case 'error':
      return {
        title: 'Update check failed',
        body: status.message || 'Could not reach GitHub.'
      }
    default:
      return { title: 'Shen is up to date', body: 'You are on the latest GitHub release.' }
  }
}

// One face for the time of day plus a seasonal or holiday mark, so the home
// greeting stays current without anyone touching the copy each December.
function greetingEmoji(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const face = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 17 ? '😄' : hour < 22 ? '😌' : '🌙'
  const seasonal =
    month === 12 && day >= 24 && day <= 26
      ? '🎄'
      : (month === 12 && day === 31) || (month === 1 && day === 1)
        ? '🎉'
        : month === 10 && day === 31
          ? '🎃'
          : month === 2 && day === 14
            ? '💘'
            : month === 12 || month === 1 || month === 2
              ? '❄️'
              : month >= 3 && month <= 5
                ? '🌸'
                : month >= 6 && month <= 8
                  ? '☀️'
                  : '🍂'
  return face === seasonal ? face : `${face} ${seasonal}`
}

function formatSpan(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${total}s`
}

function relativePlayedAt(timestamp?: number): string {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diff < minute) return 'now'
  if (diff < hour) return `${Math.floor(diff / minute)}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < day * 30) return `${Math.floor(diff / day)}d`
  if (diff < day * 365) return `${Math.floor(diff / (day * 30))}mo`
  return `${Math.floor(diff / (day * 365))}y`
}

function formatPlayedAt(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const startOf = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const dayDiff = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (dayDiff === 0) return `Today · ${time}`
  if (dayDiff === 1) return `Yesterday · ${time}`
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`
}

// One stray sample shouldn't flatten the rest of a chart: when the maximum is
// far above the typical value, scale to the median and let outliers clamp.
function PingChart({
  samples,
  tone = 'green',
  compact = false
}: {
  samples: { at: number; ms: number }[]
  tone?: 'green' | 'red' | 'neutral'
  compact?: boolean
}) {
  if (samples.length === 0) {
    return <div className="spark-blank small">Measuring latency…</div>
  }
  const values = samples.map((sample) => sample.ms)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const ceiling = Math.max(max, 1)
  const slots: ({ at: number; ms: number } | null)[] = [
    ...Array.from({ length: Math.max(0, SPIKE_SLOTS - samples.length) }, () => null),
    ...samples.slice(-SPIKE_SLOTS)
  ]
  return (
    <>
      <div className={`spikes conn-spikes ${tone}`} aria-hidden="true">
        {slots.map((sample, index) =>
          sample ? (
            <span
              key={`slot-${index}`}
              className={`spike${index === slots.length - 1 ? ' last' : ''}`}
              style={{
                height: `${Math.max(6, Math.min(100, (sample.ms / ceiling) * 100))}%`
              }}
              title={`${sample.ms} ms`}
            />
          ) : (
            <span
              key={`slot-${index}`}
              className="spike placeholder"
              style={{ height: '2px' }}
            />
          )
        )}
      </div>
      {compact ? null : (
        <div className="spark-foot">
          <span>min {min} ms</span>
          <span>max {max} ms</span>
          <span>now {values[values.length - 1]} ms</span>
        </div>
      )}
    </>
  )
}

function StatArt({ covers, fallback }: { covers: string[]; fallback: ReactNode }) {
  if (covers.length === 0) return <span className="stat-art is-empty">{fallback}</span>
  return (
    <span className={`stat-art count-${Math.min(covers.length, 4)}`} aria-hidden="true">
      {covers.slice(0, 4).map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden'
          }}
        />
      ))}
    </span>
  )
}

function MetricStepsCard({
  label,
  metric,
  tone = 'neutral',
  icon,
  minutes
}: {
  label: string
  metric: NfMetric | null
  tone?: 'green' | 'red' | 'neutral'
  icon: ReactNode
  minutes: number
}) {
  if (!metric || metric.points.length === 0) {
    return (
      <div className="msc">
        <div className="msc-head">
          <div className="msc-heading">
            <h2 className="msc-title">{label}</h2>
            <p className="msc-sub">Last {minutes} minutes</p>
          </div>
          <div className={`msc-icon ${tone}`}>{icon}</div>
        </div>
        <div className="spark-blank">No samples in this window</div>
      </div>
    )
  }

  const values = metric.points.map((point) => point.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const last = values[values.length - 1]
  const unit = metric.unit === 'pct' ? '%' : metric.unit

  // Resample to a fixed bar count so every card has the same rhythm. Averages
  // keep the bars from getting jagged when the raw window has uneven spacing.
  const BAR_COUNT = SPIKE_SLOTS
  const bars = Array.from({ length: BAR_COUNT }, (_, index) => {
    const start = Math.floor((index * metric.points.length) / BAR_COUNT)
    const end = Math.max(
      start + 1,
      Math.floor(((index + 1) * metric.points.length) / BAR_COUNT)
    )
    const slice = metric.points.slice(start, end)
    return slice.reduce((total, point) => total + point.v, 0) / slice.length
  })

  const fmt = (value: number) => {
    if (Math.abs(value) >= 100) return value.toFixed(0)
    if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '')
    return value.toFixed(2).replace(/\.?0+$/, '')
  }
  const precision = Math.abs(last) >= 100 ? 0 : Math.abs(last) >= 10 ? 1 : 2

  return (
    <MinimalStepsCard
      title={label}
      subtitle={`Last ${minutes} minutes`}
      value={last}
      unit={unit}
      precision={precision}
      icon={icon}
      data={bars}
      tone={tone}
      footer={
        <>
          <span>
            min {fmt(min)}
            {unit}
          </span>
          <span>
            max {fmt(max)}
            {unit}
          </span>
          <span>{metric.points.length} pts</span>
        </>
      }
    />
  )
}

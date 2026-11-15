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
  Lightbulb
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
import type { UpdateStatus } from '../../shared/update-types'
import { Classic } from './components/classic'
import { DiscordIcon } from './components/discord-icon'
import SoftAurora from './components/SoftAurora'
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

  const [status, setStatus] = useState<Status | null>(null)
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
  const [appVersion, setAppVersion] = useState('0.1.0')

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
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('shen-sidebar') !== 'closed')
  const [menuOpen, setMenuOpen] = useState(false)

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

  const refreshLibrary = useCallback(async () => setLibrary(await getLibrary()), [])
  const refreshPlaylists = useCallback(async () => {
    const data = await getPlaylists()
    setPlaylists(data.playlists)
    setFavorites(data.favorites)
  }, [])
  const refreshUser = useCallback(async () => setUser(await getMe()), [])
  const refreshStatus = useCallback(async () => setStatus(await getStatus()), [])

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
        setPingSamples((prev) => [...prev.slice(-31), { at: Date.now(), ms }])
      } catch {
        if (cancelled) return
        setPingSamples((prev) => [...prev.slice(-31), { at: Date.now(), ms: 0 }])
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
        setStatus(next)
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
  const recentTracks = (status?.history ?? [])
    .filter(
      (track, index, list) =>
        list.findIndex((other) => trackKey(other) === trackKey(track)) === index
    )
    .slice(0, 5)

  const history = status?.history ?? []

  const listeningSeconds = history.reduce((total, track) => total + (track.duration ?? 0), 0)
  const topArtist =
    [...history.reduce((counts, track) => {
      const name = track.artist?.trim()
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
      return counts
    }, new Map<string, number>())]
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const activity = (() => {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      const start = date.getTime()
      return {
        label: weekday.format(date),
        start,
        end: start + 86_400_000,
        count: 0
      }
    })
    for (const track of history) {
      if (!track.playedAt) continue
      const day = days.find((entry) => track.playedAt! >= entry.start && track.playedAt! < entry.end)
      if (day) day.count += 1
    }
    return days
  })()
  const activityMax = Math.max(1, ...activity.map((day) => day.count))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const dockTrack = current ?? status?.nowPlaying ?? null
  const dockSource = current ? 'Browser' : dockTrack ? 'Discord' : null
  const updateInfo = updateMessage(update)

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
          <div className="appmenu" role="menu">
            {NAV.map((item) => (
              <button
                key={item.id}
                role="menuitem"
                className={view === item.id ? 'active' : ''}
                onClick={() => {
                  setView(item.id)
                  if (item.id !== 'playlists') setSelectedPlaylist(null)
                  setMenuOpen(false)
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            <div className="appmenu-sep" />
            <button
              role="menuitem"
              className={view === 'settings' ? 'active' : ''}
              onClick={() => {
                setView('settings')
                setSelectedPlaylist(null)
                setMenuOpen(false)
              }}
            >
              <SettingsIcon size={15} />
              <span>Settings</span>
            </button>
            <div className="appmenu-sep" />
            <button
              role="menuitem"
              onClick={() => {
                setSidebarOpen((v) => !v)
                setMenuOpen(false)
              }}
            >
              {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              <span>{sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}</span>
            </button>
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
            <div className="recent-head">Recent</div>
            <div className="recent-list">
              {recentTracks.map((track, index) => (
                <button
                  key={`${trackKey(track)}-${index}`}
                  className="recent-item"
                  onClick={() => play(track)}
                  title={`Play ${track.title}`}
                >
                  <span className="recent-copy">
                    <span className="recent-title">{track.title}</span>
                    <span className="recent-time">{formatPlayedAt(track.playedAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="sidebar-footer">
          <button
            className={`signin${view === 'settings' ? ' active' : ''}`}
            onClick={() => {
              setView('settings')
              setSelectedPlaylist(null)
            }}
            title="Settings"
          >
            <SettingsIcon size={15} /> <span>Settings</span>
          </button>
          {user ? (
            <div className="account-card">
              <img
                className="account-avatar"
                src={user.avatar ?? undefined}
                alt=""
                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
              />
              <div className="account-meta">
                <div className="account-name">{user.global_name || user.username || 'Shen user'}</div>
                <div className="muted account-provider">
                  <DiscordIcon width={9} height={9} /> Signed in
                </div>
              </div>
              <button className="btn link" onClick={signOut} title="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button className="signin" onClick={signIn} title="Sign in with Discord">
              <DiscordIcon width={15} height={15} /> <span>Sign in with Discord</span>
            </button>
          )}
          {!user && signedInHint ? (
            <div className="signin-hint" role="status">
              <div className="signin-hint-head">
                <Classic className="signin-hint-loader" />
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
                  <Classic className="row-loader" />
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
                  <h2 className="home-greeting">{greeting}</h2>
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
                  <ListMusic size={14} />
                  <span>Songs played</span>
                  <b>{history.length}</b>
                </div>
                <div className="stat-card">
                  <Clock3 size={14} />
                  <span>Listening time</span>
                  <b>{formatSpan(listeningSeconds)}</b>
                </div>
                <div className="stat-card">
                  <Mic2 size={14} />
                  <span>Top artist</span>
                  <b title={topArtist}>{topArtist}</b>
                </div>
                <div className="stat-card">
                  <LibraryBig size={14} />
                  <span>Saved tracks</span>
                  <b>{library.length}</b>
                </div>
              </div>

              <div className="home-activity">
                <div className="home-activity-head">
                  <h2>Listening activity</h2>
                  <span className="muted">Last 7 days</span>
                </div>
                <div className="activity-bars">
                  {activity.map((day) => (
                    <div
                      className="activity-col"
                      key={day.start}
                      title={`${day.label}: ${day.count} song${day.count === 1 ? '' : 's'}`}
                    >
                      <div className="activity-track">
                        <span
                          className="activity-bar"
                          style={{ height: `${8 + (day.count / activityMax) * 92}%` }}
                        />
                      </div>
                      <span className="activity-label">{day.label}</span>
                    </div>
                  ))}
                </div>
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
                  <div className="nf-error-title">Northflank isn’t connected</div>
                  <p>
                    Add <code>NORTHFLANK_API_TOKEN</code> to <code>.env</code>, or run{' '}
                    <code>northflank login</code> on this machine.
                  </p>
                  <p className="muted">{nfError}</p>
                  <button className="btn small" onClick={() => void loadNf()} disabled={nfLoading}>
                    <RefreshCw size={12} className={nfLoading ? 'spin' : undefined} /> Try again
                  </button>
                </div>
              ) : nf ? (
                <>
                  <div className="nf-summary">
                    <div className="nf-headline">
                      <span
                        className={`live-dot${
                          nf.service.paused || nf.service.status !== 'COMPLETED' ? ' idle' : ''
                        }`}
                      />
                      <div className="nf-id">
                        <div className="nf-name">{nf.service.name}</div>
                        <div className="nf-meta">
                          {nf.service.region}
                          {nf.service.plan ? ` · ${nf.service.plan}` : ''}
                          {` · ${nf.service.instances} instance${
                            nf.service.instances === 1 ? '' : 's'
                          }`}
                        </div>
                      </div>
                      <span className="nf-state">{statusLabel(nf.service)}</span>
                    </div>
                    <div className="nf-facts">
                      <div>
                        <span>Commit</span>
                        <b>{nf.service.commit ? nf.service.commit.slice(0, 7) : '—'}</b>
                      </div>
                      <div>
                        <span>Domain</span>
                        <b className="nf-domain" title={nf.service.domain ?? undefined}>
                          {nf.service.domain ?? '—'}
                        </b>
                      </div>
                      <div>
                        <span>Updated</span>
                        <b>{new Date(nf.fetchedAt).toLocaleTimeString()}</b>
                      </div>
                      <div>
                        <span>Source</span>
                        <b>
                          {nf.source === 'cli'
                            ? 'CLI session'
                            : nf.source === 'dotenv'
                              ? '.env token'
                              : 'env token'}
                        </b>
                      </div>
                    </div>
                  </div>

                  <div className="spark-grid">
                    <SparkCard label="CPU" metric={nf.metrics.cpu} />
                    <SparkCard label="Memory" metric={nf.metrics.memory} />
                    <SparkCard label="Network in" metric={nf.metrics.networkIngress} />
                    <SparkCard label="Network out" metric={nf.metrics.networkEgress} />
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
                <div className="about-mark">
                  <Disc3 size={20} />
                </div>
                <div className="about-copy">
                  <h2>Shen</h2>
                  <p>
                    A desktop music companion for the Shen Discord bot. Search, queue, and
                    listen together.
                  </p>
                </div>
                <span className="pill">v{appVersion}</span>
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

              <div className="about-foot">
                <span className="muted">Made for the Shen community.</span>
                <span className="muted">{new Date().getFullYear()}</span>
              </div>
            </div>
          ) : null}

          {view === 'support' ? (
            <div className="support">
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
                        <Classic className="row-loader" />
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
                <a
                  className="support-card support-link"
                  href="https://github.com/vihanga-nimsara/shen-app/issues/new?template=bug_report.yml"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="support-icon">
                    <Bug size={16} />
                  </span>
                  <span className="support-copy">
                    <span className="setting-name">Report a bug</span>
                    <span className="setting-desc">
                      Something broken? Open an issue with your version and logs.
                    </span>
                  </span>
                  <ArrowUpRight size={14} className="support-arrow" />
                </a>
                <a
                  className="support-card support-link"
                  href="https://github.com/vihanga-nimsara/shen-app/issues/new?template=feature_request.yml"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="support-icon">
                    <Lightbulb size={16} />
                  </span>
                  <span className="support-copy">
                    <span className="setting-name">Request a feature</span>
                    <span className="setting-desc">
                      Tell us what would make Shen better.
                    </span>
                  </span>
                  <ArrowUpRight size={14} className="support-arrow" />
                </a>
              </div>

              <div className="support-foot">
                Issues and releases live on github.com/vihanga-nimsara/shen-app
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
                </div>
              </div>

              <div className="settings-group">
                <div className="settings-title">Playback</div>
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
                    <span className="setting-value">v0.1.0</span>
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
            <div className="title">{dockTrack?.title ?? 'Nothing playing'}</div>
            <div className="sub muted">
              {dockTrack
                ? [dockTrack.artist || 'Unknown artist', dockSource].filter(Boolean).join(' · ')
                : 'Browser playback'}
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
                  <Classic className="row-loader" />
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
              <Classic className="row-loader" />
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
  onPlay,
  onSkip,
  onStop,
  onVolume
}: {
  current: Track | null
  playing: boolean
  status: Status | null
  pingSamples: { at: number; ms: number }[]
  onPlay: (track: Track) => void
  onSkip: () => void
  onStop: () => void
  onVolume: (volume: number) => void
}) {
  const track = current ?? status?.nowPlaying ?? null
  const guild =
    status?.guilds?.find((entry) => entry.inVoice) ??
    status?.guilds?.find((entry) => entry.id === status.guildId) ??
    null
  const lastPing = pingSamples[pingSamples.length - 1]?.ms ?? null
  return (
    <>
      {track ? (
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
        <div className="empty">Nothing is playing. Pick a track from Search or Library.</div>
      )}

      {status ? (
        <div className="conn-card">
          <div className="conn-head">
            <span className="with-icon">
              <DiscordIcon width={13} height={13} /> Connection
            </span>
            <span className={`live-dot${status.botReady ? '' : ' idle'}`} aria-hidden="true" />
            <span className="muted">{status.botReady ? 'Online' : 'Offline'}</span>
          </div>
          <div className="conn-grid">
            <div>
              <span>Server</span>
              <b>{guild?.name ?? '—'}</b>
            </div>
            <div>
              <span>Voice channel</span>
              <b>{guild?.voiceChannelName ?? 'Not connected'}</b>
            </div>
            <div>
              <span>Bot</span>
              <b>{status.botReady ? 'Connected' : 'Offline'}</b>
            </div>
            <div>
              <span>API ping</span>
              <b>{lastPing !== null ? `${lastPing} ms` : '—'}</b>
            </div>
          </div>
          <PingChart samples={pingSamples} />
          <div className="volume-row">
            <span className="muted">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={status.volume ?? 100}
              onChange={(e) => onVolume(Number(e.target.value))}
            />
            <span className="muted">{status.volume ?? 100}</span>
          </div>
        </div>
      ) : null}

      <div className="aurora">
        {coverUrl(track) ? (
          <img className="aurora-cover" src={coverUrl(track) ?? undefined} alt="" aria-hidden="true" />
        ) : null}
        <SoftAurora
          speed={3}
          scale={0.1}
          brightness={0.95}
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
        <div className="aurora-caption">
          <span>Now playing</span>
          <span className="muted">Shen · zagan.space</span>
        </div>
      </div>
    </>
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

function formatSpan(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${total}s`
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

function PingChart({ samples }: { samples: { at: number; ms: number }[] }) {
  if (samples.length === 0) {
    return <div className="spark-blank small">Measuring latency…</div>
  }
  const values = samples.map((sample) => sample.ms)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.max(max, 1)
  const slots: ({ at: number; ms: number } | null)[] = [
    ...Array.from({ length: Math.max(0, 32 - samples.length) }, () => null),
    ...samples.slice(-32)
  ]
  return (
    <>
      <div className="spikes conn-spikes" aria-hidden="true">
        {slots.map((sample, index) =>
          sample ? (
            <span
              key={sample.at}
              className={`spike${index === slots.length - 1 ? ' last' : ''}`}
              style={{
                height: `${8 + ((sample.ms - min) / span) * 92}%`,
                animationDelay: `${Math.min(index, 16) * 9}ms`
              }}
              title={`${sample.ms} ms`}
            />
          ) : (
            <span
              key={`empty-${index}`}
              className="spike placeholder"
              style={{ height: '3px' }}
            />
          )
        )}
      </div>
      <div className="spark-foot">
        <span>min {min} ms</span>
        <span>max {max} ms</span>
        <span>now {values[values.length - 1]} ms</span>
      </div>
    </>
  )
}

function statusLabel(service: NfLive['service']): string {
  if (service.paused) return 'Paused'
  if (service.status === 'COMPLETED') return 'Running'
  const words = service.status.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function SparkCard({ label, metric }: { label: string; metric: NfMetric | null }) {
  if (!metric || metric.points.length === 0) {
    return (
      <div className="spark-card">
        <div className="spark-head">
          <span className="spark-label">{label}</span>
        </div>
        <div className="spark-blank">No samples in this window</div>
      </div>
    )
  }

  const values = metric.points.map((point) => point.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const last = values[values.length - 1]
  // Normalise to the window so small real variations stay visible; the exact
  // min/max are printed underneath.
  const span = max - min || Math.max(max, 1)
  const stride = Math.max(1, Math.ceil(metric.points.length / 56))
  const bars = metric.points.filter((_, i) => i % stride === 0)
  const unit = metric.unit === 'pct' ? '%' : metric.unit
  const fmt = (value: number) => {
    if (Math.abs(value) >= 100) return value.toFixed(0)
    if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '')
    return value.toFixed(2).replace(/\.?0+$/, '')
  }

  return (
    <div className="spark-card">
      <div className="spark-head">
        <span className="spark-label">{label}</span>
        <span className="spark-value">
          {fmt(last)}
          <small>{unit}</small>
        </span>
      </div>
      <div className="spikes" aria-hidden="true">
        {bars.map((point, i) => {
          const height = 8 + ((point.v - min) / span) * 92
          return (
            <span
              key={point.t}
              className={`spike${i === bars.length - 1 ? ' last' : ''}`}
              style={{ height: `${height}%`, animationDelay: `${Math.min(i, 24) * 7}ms` }}
              title={`${new Date(point.t).toLocaleTimeString()} · ${fmt(point.v)}${unit}`}
            />
          )
        })}
      </div>
      <div className="spark-foot">
        <span>min {fmt(min)}{unit}</span>
        <span>max {fmt(max)}{unit}</span>
        <span>{bars.length} pts</span>
      </div>
    </div>
  )
}

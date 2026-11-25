import type { Status, Track } from './api'

// Dev-only fixtures: a year of listening history plus ~28 songs, so the home
// view, sidebar recents and heatmap are populated without a signed-in account.
// Everything here is generated once from fixed constants, so the screenshots
// and layout checks stay stable between reloads.

const DAY = 86_400_000
const HOUR = 3_600_000

const CATALOG: { title: string; artist: string; duration: number }[] = [
  { title: 'Savannah', artist: 'Diviners', duration: 208 },
  { title: 'Faded', artist: 'Alan Walker', duration: 212 },
  { title: 'Night Drive', artist: 'Kavinsky', duration: 254 },
  { title: 'Sunset Lover', artist: 'Petit Biscuit', duration: 238 },
  { title: 'Innerbloom', artist: 'RUFUS DU SOL', duration: 575 },
  { title: 'Shelter', artist: 'Porter Robinson', duration: 219 },
  { title: 'Strobe', artist: 'deadmau5', duration: 634 },
  { title: 'Awake', artist: 'Tycho', duration: 260 },
  { title: 'Window', artist: 'The Album Leaf', duration: 281 },
  { title: 'Intro', artist: 'The xx', duration: 127 },
  { title: 'Weird Fishes', artist: 'Radiohead', duration: 328 },
  { title: 'Nights', artist: 'Frank Ocean', duration: 307 },
  { title: 'Redbone', artist: 'Childish Gambino', duration: 326 },
  { title: 'The Less I Know', artist: 'Tame Impala', duration: 216 },
  { title: 'Space Song', artist: 'Beach House', duration: 320 },
  { title: 'Chamber of Reflection', artist: 'Mac DeMarco', duration: 231 },
  { title: 'Show Me How', artist: 'Men I Trust', duration: 215 },
  { title: 'Apocalypse', artist: 'Cigarettes After Sex', duration: 290 },
  { title: 'Genesis', artist: 'Grimes', duration: 255 },
  { title: 'Bloom', artist: 'ODESZA', duration: 240 },
  { title: 'Line of Sight', artist: 'ODESZA', duration: 250 },
  { title: 'Opus', artist: 'Eric Prydz', duration: 540 },
  { title: 'Midnight City', artist: 'M83', duration: 243 },
  { title: 'Feel It All Around', artist: 'Washed Out', duration: 201 },
  { title: 'Sun Structures', artist: 'Temples', duration: 282 },
  { title: 'Weightless', artist: 'Marconi Union', duration: 488 },
  { title: 'An Ending (Ascent)', artist: 'Brian Eno', duration: 264 },
  { title: 'Says', artist: 'Nils Frahm', duration: 508 }
]

// Cover art is an inline gradient with the song's initial, so demo rows render
// properly offline instead of leaving a row of broken image icons.
function cover(title: string, index: number): string {
  const hue = (index * 47) % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 62% 56%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 48) % 360} 58% 32%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="96" height="96" fill="url(#g)"/>` +
    `<text x="48" y="60" text-anchor="middle" font-family="Inter, sans-serif" ` +
    `font-size="38" font-weight="600" fill="rgba(255,255,255,0.92)">` +
    `${title.charAt(0).toUpperCase()}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function trackAt(index: number, playedAt: number): Track {
  const entry = CATALOG[index % CATALOG.length]
  const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id: `dev-${index}`,
    url: `https://example.com/dev/${slug}`,
    title: entry.title,
    artist: entry.artist,
    duration: entry.duration,
    thumbnail: cover(entry.title, index),
    source: 'dev',
    playedAt
  }
}

// One play per song, walking back through the year. The first few days are
// spaced so the sidebar reads 1d / 3d / 6d instead of five identical stamps.
const RECENT_DAYS = [
  1, 3, 6, 9, 14, 18, 24, 31, 38, 45, 53, 61, 70, 80, 91, 103, 116, 130, 145, 161, 178, 196,
  215, 235, 256, 278, 301, 326
]

export function devHistory(): Track[] {
  const now = Date.now()
  const plays: Track[] = []

  RECENT_DAYS.forEach((daysAgo, index) => {
    const offset = (index * 37) % 11
    plays.push(trackAt(index, now - daysAgo * DAY - offset * HOUR))
  })

  // Extra listens scattered over the year so fully empty weeks don't dominate
  // the heatmap. A cheap deterministic walk keeps this identical every load.
  let seed = 0x5eed
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 0x100000000
    return seed / 0x100000000
  }
  for (let i = 0; i < 72; i++) {
    const daysAgo = 3 + Math.floor(Math.pow(next(), 1.25) * 357)
    const index = Math.floor(next() * CATALOG.length)
    const offset = Math.floor(next() * 20)
    plays.push(trackAt(index, now - daysAgo * DAY - offset * HOUR))
  }

  return plays.sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0))
}

const EMPTY: Status = {
  nowPlaying: null,
  playing: false,
  paused: false,
  loop: false,
  position: 0,
  startedAt: null,
  queueLength: 0,
  queue: [],
  pending: [],
  library: [],
  history: [],
  guildId: null
}

export function devStatus(base?: Status): Status {
  return { ...(base ?? EMPTY), history: devHistory() }
}

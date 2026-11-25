import type { Status, Track } from './api'

// Dev-only fixtures: a year of listening history plus ~28 songs, so the home
// view, sidebar recents and heatmap are populated without a signed-in account.
// Everything here is generated once from fixed constants, so the screenshots
// and layout checks stay stable between reloads.

const DAY = 86_400_000
const HOUR = 3_600_000

const CATALOG: { title: string; artist: string; duration: number; art: string }[] = [
  {
    title: 'Savannah',
    artist: 'Diviners',
    duration: 208,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/28/68/91/286891e7-f47b-fd5c-c5c3-885a7c3b32c4/8721465232974.png/300x300bb.jpg'
  },
  {
    title: 'Faded',
    artist: 'Alan Walker',
    duration: 212,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/0d/a3/1a/0da31af7-d0ff-9bee-c427-1b6d0336f6fc/886446321981.jpg/300x300bb.jpg'
  },
  {
    title: 'Night Drive',
    artist: 'Kavinsky',
    duration: 254,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c1/2d/fe/c12dfe8f-cdf6-e179-d69a-8ec35f760266/00602537248681.rgb.jpg/300x300bb.jpg'
  },
  {
    title: 'Sunset Lover',
    artist: 'Petit Biscuit',
    duration: 238,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/78/1c/93/781c934a-c233-cfce-39db-31f7284969b4/cover.jpg/300x300bb.jpg'
  },
  {
    title: 'Innerbloom',
    artist: 'RUFUS DU SOL',
    duration: 575,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/aa/5f/d8/aa5fd889-4c2e-7e24-e8b2-428beaf9d4fe/SWEATA009.jpg/300x300bb.jpg'
  },
  {
    title: 'Shelter',
    artist: 'Porter Robinson',
    duration: 219,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/7f/7e/e5/7f7ee593-6ce6-254a-3325-789f95c3c5fb/653738346720.png/300x300bb.jpg'
  },
  {
    title: 'Strobe',
    artist: 'deadmau5',
    duration: 634,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f7/24/19/f724197c-b6b7-b2ad-94a9-06b2f5f95455/617465226458.jpg/300x300bb.jpg'
  },
  {
    title: 'Awake',
    artist: 'Tycho',
    duration: 260,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7b/b8/d6/7bb8d640-dfdc-1473-3948-4060af9a3819/804297820828.jpg/300x300bb.jpg'
  },
  {
    title: 'Window',
    artist: 'The Album Leaf',
    duration: 281,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/37/20/d9/3720d983-4d25-f353-44af-d796ac45d498/s05.tjsjltyd.jpg/300x300bb.jpg'
  },
  {
    title: 'Intro',
    artist: 'The xx',
    duration: 127,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/28/44/8e/28448e14-19be-438b-bc9b-8c1d3f68f578/609008295069.png/300x300bb.jpg'
  },
  {
    title: 'Weird Fishes',
    artist: 'Radiohead',
    duration: 328,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/300x300bb.jpg'
  },
  {
    title: 'Nights',
    artist: 'Frank Ocean',
    duration: 307,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bb/45/68/bb4568f3-68cd-619d-fbcb-4e179916545d/BlondCover-Final.jpg/300x300bb.jpg'
  },
  {
    title: 'Redbone',
    artist: 'Childish Gambino',
    duration: 326,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f1/3c/d7/f13cd7ab-7319-028a-8807-5991d0b308d4/0044003187658_Cover.jpg/300x300bb.jpg'
  },
  {
    title: 'The Less I Know',
    artist: 'Tame Impala',
    duration: 216,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a0/9a/2c/a09a2ca3-a5a6-814b-0af7-640dc0aef0aa/091012682261.jpg/300x300bb.jpg'
  },
  {
    title: 'Space Song',
    artist: 'Beach House',
    duration: 320,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/09/e0/d5/09e0d559-0682-f0f0-5e0c-3cd11e3114fd/beachhouse_depressioncherry_2400_300.jpg/300x300bb.jpg'
  },
  {
    title: 'Chamber of Reflection',
    artist: 'Mac DeMarco',
    duration: 231,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e0/04/eb/e004eb2b-754f-4a76-9ecc-87d4eea2a327/cover.jpg/300x300bb.jpg'
  },
  {
    title: 'Show Me How',
    artist: 'Men I Trust',
    duration: 215,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/cf/57/39/cf5739e6-332a-e64c-bed0-b763893c0517/artwork.jpg/300x300bb.jpg'
  },
  {
    title: 'Apocalypse',
    artist: 'Cigarettes After Sex',
    duration: 290,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/b3/5e/0f/b35e0fbe-2370-fc48-0f0c-977525e93bf2/720841214601_Cover.jpg/300x300bb.jpg'
  },
  {
    title: 'Genesis',
    artist: 'Grimes',
    duration: 255,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/5e/07/53/5e0753c1-f3fb-e464-908f-8efc0a249b9b/652637320886.png/300x300bb.jpg'
  },
  {
    title: 'Bloom',
    artist: 'ODESZA',
    duration: 240,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/76/5d/55/765d554e-e421-0299-783f-d78ad559d5e5/5021392959191.png/300x300bb.jpg'
  },
  {
    title: 'Line of Sight',
    artist: 'ODESZA',
    duration: 250,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/eb/d4/22/ebd422d1-b959-dd5d-b395-f9413044cff1/5054429119183.png/300x300bb.jpg'
  },
  {
    title: 'Opus',
    artist: 'Eric Prydz',
    duration: 540,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e9/6e/5d/e96e5de7-f9ca-792c-014c-646017c2d854/00602547503701.rgb.jpg/300x300bb.jpg'
  },
  {
    title: 'Midnight City',
    artist: 'M83',
    duration: 243,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/73/c6/ed/73c6edb3-924c-27f0-28f8-1470906d6780/cover.jpg/300x300bb.jpg'
  },
  {
    title: 'Feel It All Around',
    artist: 'Washed Out',
    duration: 201,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b0/74/13/b074138a-9d86-e957-82b1-2fea630ed74f/mzi.fauvphkt.jpg/300x300bb.jpg'
  },
  {
    title: 'Sun Structures',
    artist: 'Temples',
    duration: 282,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/9c/e3/33/9ce333d8-f046-ba93-c07e-f155e91d60e0/886446281773.jpg/300x300bb.jpg'
  },
  {
    title: 'Weightless',
    artist: 'Marconi Union',
    duration: 488,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/3a/d6/c33ad6a3-ec91-62e4-0912-d4a873d4fed0/cover.jpg/300x300bb.jpg'
  },
  {
    title: 'An Ending (Ascent)',
    artist: 'Brian Eno',
    duration: 264,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/99/3b/d1/993bd1fa-13ab-7898-6993-bc4da32be961/00724356364752.rgb.jpg/300x300bb.jpg'
  },
  {
    title: 'Says',
    artist: 'Nils Frahm',
    duration: 508,
    art: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/9f/40/da/9f40da77-e818-f6f8-b252-d02a2ed7c89f/4050486115855_cover.jpg/300x300bb.jpg'
  }
]

function trackAt(index: number, playedAt: number): Track {
  const entry = CATALOG[index % CATALOG.length]
  const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id: `dev-${index}`,
    url: `https://example.com/dev/${slug}`,
    title: entry.title,
    artist: entry.artist,
    duration: entry.duration,
    thumbnail: entry.art,
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

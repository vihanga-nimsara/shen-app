import * as React from 'react'

// Adapted from the rare-ui vitals widget: a dark card with three concentric
// activity rings, a hub score and a small stat list. The rings draw in on
// first view, the hub number eases between values, and the card tilts toward
// the pointer. Icons are supplied by the caller so the app keeps using lucide.

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export interface VitalsStat {
  /** e.g. "7h 24m" */
  value: string
  label: string
  /** Change vs. the previous period, e.g. "8%" */
  delta?: string
  /** Direction of the change (colors the delta) */
  trend?: 'up' | 'down'
  /** Any icon node; sized to 1em */
  icon?: React.ReactNode
  color?: string
}

export interface VitalsRing {
  label: string
  /** 0–100 */
  value: number
  color: string
}

export interface VitalsWidgetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string
  /** Text after the dot in the heading; defaults to today's date ("26 Nov") */
  date?: string
  stats?: VitalsStat[]
  /** Up to three rings, inner to outer */
  rings?: VitalsRing[]
  /** Number in the white center circle */
  score?: number
  scoreLabel?: string
}

const STYLES = `
.vw-card {
  transform: perspective(1000px) rotateX(var(--vw-rx, 0deg)) rotateY(var(--vw-ry, 0deg)) scale(var(--vw-s, 1));
  transition: transform .55s cubic-bezier(.2, .8, .2, 1);
}
.vw-card:active { --vw-s: .988; }
.vw-sheen {
  background: radial-gradient(55% 80% at var(--vw-mx, 30%) var(--vw-my, 0%), rgba(255, 255, 255, .09), transparent 60%);
  opacity: var(--vw-hl, 0);
  transition: opacity .45s ease;
}
.vw-pop { transform-box: fill-box; transform-origin: center; }
.vw-icon svg { width: 1em; height: 1em; }
@media (prefers-reduced-motion: reduce) {
  .vw-card { transition: none; transform: none; }
  .vw-root [data-vw-enter] { transition: none !important; }
}
`

/** Eases a number toward its target every frame, then stops. */
function useSmooth(target: number, speed = 8) {
  const [value, setValue] = React.useState(target)
  const current = React.useRef(target)
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setValue(target)
      return
    }
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const diff = target - current.current
      if (Math.abs(diff) < 0.02) {
        current.current = target
        setValue(target)
        return
      }
      current.current += diff * (1 - Math.exp(-dt * speed))
      setValue(current.current)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, speed])
  return value
}

/* ----------------------------------------- rings ----------------------------------------- */

// The drawing lives in an 830 × 360 box that matches the card's aspect ratio.
const VIEW = { w: 830, h: 360 }
const CENTER = { x: 748, y: 276 }
const HUB = 92
const RING = { first: 130, step: 56, width: 46 }
const START = 90 // every ring starts straight down, below the card's edge
const MAX_END = 288

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [CENTER.x + r * Math.cos(a), CENTER.y + r * Math.sin(a)] as const
}

function arcPath(r: number, from: number, to: number) {
  const [x0, y0] = polar(r, from)
  const [x1, y1] = polar(r, to)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

function Ring({
  ring,
  index,
  seen,
  dimmed,
  active,
  onEnter,
  onLeave,
  onToggle
}: {
  ring: VitalsRing
  index: number
  seen: boolean
  dimmed: boolean
  active: boolean
  onEnter: () => void
  onLeave: () => void
  onToggle: () => void
}) {
  const r = RING.first + index * RING.step
  const [go, setGo] = React.useState(false)
  React.useEffect(() => {
    if (!seen) return
    const id = window.setTimeout(() => setGo(true), 250 + index * 140)
    return () => window.clearTimeout(id)
  }, [seen, index])
  const value = useSmooth(go ? Math.min(Math.max(ring.value, 0), 100) : 0, 3)

  // where this ring crosses the bottom edge of the card: the sweep starts just above it
  const visibleFrom = 180 - (Math.asin(Math.min((VIEW.h - CENTER.y) / r, 1)) * 180) / Math.PI
  // keep a small nub for near-zero readings so the value badge never clips
  const drawn = Math.max(value, 3)
  const end = visibleFrom + 4 + ((MAX_END - visibleFrom - 4) * drawn) / 100
  const [bx, by] = polar(r, end)

  return (
    <g
      style={{ opacity: dimmed ? 0.38 : 1, transition: 'opacity .35s ease', cursor: 'pointer' }}
      onPointerEnter={(e) => e.pointerType !== 'touch' && onEnter()}
      onPointerLeave={(e) => e.pointerType !== 'touch' && onLeave()}
      onClick={onToggle}
    >
      <path
        d={arcPath(r, START, end)}
        fill="none"
        stroke={ring.color}
        strokeWidth={active ? RING.width + 5 : RING.width}
        strokeLinecap="round"
        pointerEvents="stroke"
        style={{ transition: 'stroke-width .35s cubic-bezier(.2,.8,.2,1)' }}
      />
      <g style={{ opacity: go ? 1 : 0, transition: 'opacity .4s ease .15s' }} pointerEvents="none">
        <circle cx={bx} cy={by} r="17.5" fill={`color-mix(in srgb, ${ring.color} 62%, #fff)`} />
        <text
          x={bx}
          y={by + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="15.5"
          fontWeight="700"
          fill={`color-mix(in srgb, ${ring.color} 30%, #000)`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(value)}
        </text>
      </g>
    </g>
  )
}

/* --------------------------------------- component --------------------------------------- */

export function VitalsWidget({
  title = 'Today',
  date,
  stats = [],
  rings = [],
  score = 0,
  scoreLabel = 'Score',
  className,
  ...props
}: VitalsWidgetProps) {
  const hubId = React.useId()
  const ref = React.useRef<HTMLDivElement>(null)
  const card = React.useRef<HTMLDivElement>(null)
  const [seen, setSeen] = React.useState(false)
  const [today, setToday] = React.useState('')
  const [active, setActive] = React.useState<number | null>(null)
  const shown = rings.slice(0, 3)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), {
      threshold: 0.2
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    setToday(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
  }, [])

  const focus = active !== null ? shown[active] : null
  const hubNumber = useSmooth(seen ? (focus ? focus.value : score) : 0, focus || active === null ? 9 : 4)

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = card.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--vw-rx', `${(0.5 - y) * 3.5}deg`)
    el.style.setProperty('--vw-ry', `${(x - 0.5) * 3}deg`)
    el.style.setProperty('--vw-mx', `${x * 100}%`)
    el.style.setProperty('--vw-my', `${y * 100}%`)
    el.style.setProperty('--vw-hl', '1')
  }
  const onLeave = () => {
    const el = card.current
    if (!el) return
    el.style.setProperty('--vw-rx', '0deg')
    el.style.setProperty('--vw-ry', '0deg')
    el.style.setProperty('--vw-hl', '0')
  }

  const enter = (i: number): React.CSSProperties => ({
    opacity: seen ? 1 : 0,
    transform: seen ? 'none' : 'translateY(2cqw)',
    transition: `opacity .6s ease ${0.1 + i * 0.09}s, transform .8s cubic-bezier(.2,.9,.25,1) ${
      0.1 + i * 0.09
    }s`
  })

  return (
    <div ref={ref} className={cn('vw-root', className)} {...props}>
      <style>{STYLES}</style>
      <div className="w-full" style={{ containerType: 'inline-size' }}>
        <div
          data-vw-enter
          style={{
            opacity: seen ? 1 : 0,
            transform: seen ? 'none' : 'translateY(3cqw) scale(.96)',
            filter: seen ? 'none' : 'blur(8px)',
            transition: 'opacity .7s ease, transform .9s cubic-bezier(.2,.9,.25,1), filter .7s ease'
          }}
        >
          <div
            ref={card}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            className="vw-card relative w-full select-none overflow-hidden text-white"
            style={{
              aspectRatio: `${VIEW.w} / ${VIEW.h}`,
              borderRadius: 'var(--radius-panel)',
              background:
                'radial-gradient(90% 120% at 0% 0%, #1d1d1f 0%, rgba(29,29,31,0) 60%), linear-gradient(180deg, #171718 0%, #0c0c0d 100%)',
              boxShadow: '0 24px 48px -28px rgba(0,0,0,.6), 0 4px 12px rgba(0,0,0,.14)'
            }}
          >
            {/* rings */}
            <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <radialGradient id={hubId} cx="42%" cy="36%" r="75%">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#e9e9ee" />
                </radialGradient>
              </defs>
              {[0, 1, 2, 3].map((i) => (
                <circle
                  key={i}
                  cx={CENTER.x}
                  cy={CENTER.y}
                  r={RING.first + i * RING.step}
                  fill="none"
                  stroke="#fff"
                  strokeOpacity={i < shown.length ? 0.032 : 0.016}
                  strokeWidth={RING.width}
                />
              ))}
              {shown
                .map((ring, i) => ({ ring, i }))
                .reverse()
                .map(({ ring, i }) => (
                  <Ring
                    key={i}
                    ring={ring}
                    index={i}
                    seen={seen}
                    active={active === i}
                    dimmed={active !== null && active !== i}
                    onEnter={() => setActive(i)}
                    onLeave={() => setActive(null)}
                    onToggle={() => setActive((a) => (a === i ? null : i))}
                  />
                ))}
              <g
                className="vw-pop"
                style={{
                  transform: seen ? 'scale(1)' : 'scale(.6)',
                  opacity: seen ? 1 : 0,
                  transition:
                    'transform .9s cubic-bezier(.3,1.4,.5,1) .15s, opacity .5s ease .15s'
                }}
              >
                <circle
                  cx={CENTER.x}
                  cy={CENTER.y}
                  r={HUB}
                  fill={`url(#${hubId})`}
                  style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.45))' }}
                />
                <text
                  x={CENTER.x}
                  y={CENTER.y - 16}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="58"
                  fontWeight="700"
                  fill="#0b0b0c"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                >
                  {Math.round(hubNumber)}
                </text>
                <text
                  x={CENTER.x}
                  y={CENTER.y + 33}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="27"
                  fontWeight="700"
                  fill={focus ? `color-mix(in srgb, ${focus.color} 55%, #000)` : '#0b0b0c'}
                  style={{ transition: 'fill .3s ease' }}
                >
                  {focus ? focus.label : scoreLabel}
                </text>
              </g>
            </svg>

            {/* heading + stats */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between"
              style={{ padding: '4.6cqw 0 4.4cqw 4.6cqw', width: '56%' }}
            >
              <h3
                data-vw-enter
                className="whitespace-nowrap"
                style={{
                  ...enter(0),
                  fontSize: '3.6cqw',
                  fontWeight: 700,
                  letterSpacing: '-0.012em',
                  lineHeight: 1.1
                }}
              >
                {title}
                {(date ?? today) && <span> · {date ?? today}</span>}
              </h3>

              <div className="flex flex-col" style={{ gap: '2.4cqw' }}>
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    data-vw-enter
                    className="flex items-center"
                    style={{ ...enter(i + 1), gap: '2.2cqw' }}
                  >
                    <span
                      className="vw-icon flex shrink-0 items-center justify-center"
                      style={{
                        width: '4.6cqw',
                        fontSize: '4.6cqw',
                        color: stat.color ?? '#fff',
                        filter: `drop-shadow(0 0 1.6cqw color-mix(in srgb, ${
                          stat.color ?? '#fff'
                        } 55%, transparent))`
                      }}
                    >
                      {stat.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-start whitespace-nowrap" style={{ gap: '1.2cqw' }}>
                        <span
                          style={{
                            fontSize: '3.1cqw',
                            fontWeight: 500,
                            letterSpacing: '-0.005em',
                            lineHeight: 1.1
                          }}
                        >
                          {stat.value}
                        </span>
                        {stat.delta && (
                          <span
                            className="inline-flex items-center"
                            style={{
                              fontSize: '2.85cqw',
                              fontWeight: 500,
                              lineHeight: 1.2,
                              color: stat.trend === 'down' ? '#ff6961' : '#4cd964'
                            }}
                          >
                            {stat.delta}
                          </span>
                        )}
                      </span>
                      <span
                        className="block whitespace-nowrap"
                        style={{
                          marginTop: '0.4cqw',
                          fontSize: '2.3cqw',
                          fontWeight: 500,
                          color: 'rgba(235,235,245,.42)'
                        }}
                      >
                        {stat.label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <span aria-hidden className="vw-sheen pointer-events-none absolute inset-0" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: 'inherit',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,.1), inset 0 0 0 1px rgba(255,255,255,.04)'
              }}
            />
          </div>
        </div>
      </div>
      <p className="sr-only">
        {title} {date ?? today}. {stats.map((s) => `${s.label}: ${s.value}`).join('. ')}.{' '}
        {shown.map((r) => `${r.label}: ${r.value}`).join('. ')}. {scoreLabel}: {score}.
      </p>
    </div>
  )
}

export default VitalsWidget

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

// A contribution-heatmap ported to Shen: every cell is one day of listening.
// The hue sweeps across the year like a rainbow and the opacity carries the
// play count, so an empty day still has a faint tint. Adapted from
// swamimalode07/rare-ui's github-activity component.

export type ListeningLevel = 0 | 1 | 2 | 3 | 4

export type ListeningDay = {
  date: string
  count: number
  level: ListeningLevel
}

interface ListeningActivityProps {
  days: ListeningDay[]
  months?: number
  cellSize?: number
  showMonths?: boolean
  label?: string
  className?: string
}

const LEVEL_OPACITY: Record<ListeningLevel, number> = {
  0: 0.1,
  1: 0.42,
  2: 0.6,
  3: 0.8,
  4: 1
}

const WEEKS_PER_MONTH = 365.25 / 12 / 7
const MIN_LABEL_WEEKS = 3
const COLUMN_STAGGER = 0.012
const CELL_FADE = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const
const TOOLTIP_FADE = { duration: 0.14, ease: [0.22, 1, 0.36, 1] } as const
const EASE_OUT = [0.22, 1, 0.36, 1] as const
const LABEL_REVEAL = { duration: 0.45, ease: EASE_OUT } as const
const TOOLTIP_EDGE = 8

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const gapFor = (cellSize: number) => Math.max(2, Math.round(cellSize / 4))
const weeksFor = (months: number) => Math.max(1, Math.ceil(months * WEEKS_PER_MONTH))

// 12° → 332°: red through the spectrum and back to magenta, never wrapping
// from magenta straight into red again.
const hueAt = (index: number, total: number) =>
  12 + (index / Math.max(1, total - 1)) * 320

function describeDay({ count, date }: ListeningDay) {
  const noun = count === 1 ? 'play' : 'plays'
  return `${count} ${noun} on ${DATE_FORMAT.format(new Date(`${date}T00:00:00`))}`
}

function toWeeks(days: ListeningDay[]) {
  const weeks: ListeningDay[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

function toMonthLabels(weeks: ListeningDay[][]) {
  const labels: (string | null)[] = weeks.map(() => null)
  const monthAt = (index: number) => weeks[index]?.[0]?.date.slice(5, 7)

  let start = 0
  for (let i = 1; i <= weeks.length; i++) {
    if (i < weeks.length && monthAt(i) === monthAt(start)) continue
    // a shorter run is narrower than the label itself, so it would sit under the next month
    if (i - start >= MIN_LABEL_WEEKS) {
      labels[start] = MONTH_NAMES[Number(monthAt(start)) - 1] ?? null
    }
    start = i
  }
  return labels
}

function useFittedColumns(cellSize: number, gap: number) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [columns, setColumns] = React.useState<number>()

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setColumns(Math.max(1, Math.floor((el.clientWidth + gap) / (cellSize + gap))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [cellSize, gap])

  return [ref, columns] as const
}

type HoveredDay = { day: ListeningDay; x: number; y: number }

function Tooltip({ hovered, reduceMotion }: { hovered: HoveredDay; reduceMotion: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [left, setLeft] = React.useState(hovered.x)

  React.useLayoutEffect(() => {
    const half = (ref.current?.offsetWidth ?? 0) / 2
    const edge = TOOLTIP_EDGE + half
    setLeft(Math.min(Math.max(hovered.x, edge), window.innerWidth - edge))
  }, [hovered])

  return createPortal(
    <div
      className="la-tip-anchor"
      style={{ left, top: hovered.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
    >
      <motion.div
        ref={ref}
        className="la-tip"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        transition={reduceMotion ? { duration: 0 } : TOOLTIP_FADE}
      >
        {describeDay(hovered.day)}
      </motion.div>
    </div>,
    document.body
  )
}

export function ListeningActivity({
  days,
  months = 12,
  cellSize = 12,
  showMonths = true,
  label = 'Listening activity',
  className
}: ListeningActivityProps) {
  const reduceMotion = useReducedMotion() ?? false
  const weeks = React.useMemo(() => toWeeks(days), [days])
  const gap = gapFor(cellSize)
  const [ref, columns] = useFittedColumns(cellSize, gap)
  const [hovered, setHovered] = React.useState<HoveredDay>()

  const cap = Math.min(weeks.length, weeksFor(months))
  const visible = weeks.slice(-Math.min(cap, columns ?? cap))
  const sweepEnd = (visible.length - 1) * COLUMN_STAGGER + CELL_FADE.duration

  const hover = (day: ListeningDay) => (event: React.PointerEvent) => {
    const cell = event.currentTarget.getBoundingClientRect()
    setHovered({ day, x: cell.left + cell.width / 2, y: cell.top })
  }

  return (
    <div className={cn('la', className)}>
      <div ref={ref} className="la-grid-wrap" role="img" aria-label={label}>
        {showMonths ? (
          <motion.div
            className="la-months"
            style={{ gap, marginBottom: gap }}
            initial={reduceMotion ? false : { opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ ...LABEL_REVEAL, delay: reduceMotion ? 0 : sweepEnd }}
          >
            {toMonthLabels(visible).map((month, index) => (
              <div key={index} className="la-month" style={{ width: cellSize }}>
                {month ? <span>{month}</span> : null}
              </div>
            ))}
          </motion.div>
        ) : null}

        <div className="la-grid" style={{ gap }} onPointerLeave={() => setHovered(undefined)}>
          {visible.map((week, weekIndex) => (
            <div key={weekIndex} className="la-col" style={{ gap }}>
              {week.map((day) => (
                <motion.div
                  key={day.date}
                  onPointerEnter={hover(day)}
                  className="la-cell"
                  style={{ width: cellSize, height: cellSize }}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    ...CELL_FADE,
                    delay: reduceMotion ? 0 : weekIndex * COLUMN_STAGGER
                  }}
                >
                  <span
                    className="la-fill"
                    style={{
                      backgroundColor: `hsl(${hueAt(weekIndex, visible.length)} 70% 58%)`,
                      opacity: LEVEL_OPACITY[day.level]
                    }}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hovered ? (
          <Tooltip key="tooltip" hovered={hovered} reduceMotion={reduceMotion} />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default ListeningActivity

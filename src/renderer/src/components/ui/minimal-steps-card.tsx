import * as React from 'react'
import { motion, useSpring, useTransform, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

// Adapted from the minimal-steps card: a quiet header with an icon, one big
// animated metric and a dense bar chart that fills in from the bottom. The
// original relies on Tailwind's shadcn tokens, which this app doesn't ship, so
// the styling lives in index.css under the `msc-` prefix instead.

export interface MinimalStepsCardProps {
  title: string
  /** Small line under the title, e.g. "Last 20 minutes" */
  subtitle: string
  /** Number the counter eases toward; null shows a dash */
  value: number | null
  unit?: string
  /** Decimal places used by the counter and footer */
  precision?: number
  icon?: React.ReactNode
  /** Values drawn as bars, oldest to newest */
  data: number[]
  tone?: 'green' | 'red' | 'neutral'
  footer?: React.ReactNode
  className?: string
}

const CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.012 } }
}

const BAR: Variants = {
  hidden: { height: '0%' },
  visible: (height: string) => ({
    height,
    transition: { type: 'spring', stiffness: 100, damping: 12 }
  })
}

export function MinimalStepsCard({
  title,
  subtitle,
  value,
  unit,
  precision = 0,
  icon,
  data,
  tone = 'neutral',
  footer,
  className
}: MinimalStepsCardProps) {
  const maxValue = React.useMemo(() => Math.max(...data, 1), [data])
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    }).format(current)
  )

  React.useEffect(() => {
    spring.set(value ?? 0)
  }, [spring, value])

  return (
    <div
      className={cn('msc', className)}
      role="figure"
      aria-label={`${title} for ${subtitle}: ${value ?? '—'} ${unit ?? ''}`.trim()}
    >
      <header className="msc-head">
        <div className="msc-heading">
          <h2 className="msc-title">{title}</h2>
          <p className="msc-sub">{subtitle}</p>
        </div>
        {icon ? <div className={cn('msc-icon', tone)}>{icon}</div> : null}
      </header>

      <p className="msc-value" aria-live="polite">
        {value === null ? <b>—</b> : <motion.b>{display}</motion.b>}
        {unit ? <span>{unit}</span> : null}
      </p>

      <motion.div
        className={cn('msc-bars', tone)}
        variants={CONTAINER}
        initial="hidden"
        animate="visible"
        aria-hidden="true"
      >
        {data.map((item, index) => {
          const height = `${Math.max(0, Math.min(100, (item / maxValue) * 100))}%`
          return (
            <span key={index} className="msc-bar">
              <span className="msc-bar-track" />
              <motion.span
                className="msc-bar-fill"
                variants={BAR}
                custom={height}
              />
            </span>
          )
        })}
      </motion.div>

      {footer ? <footer className="msc-foot">{footer}</footer> : null}
    </div>
  )
}

export default MinimalStepsCard

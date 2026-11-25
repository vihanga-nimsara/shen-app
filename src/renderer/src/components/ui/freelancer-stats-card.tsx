import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Adapts the freelancer-stats card to Shen's OpenCode-derived tokens. The
// structure mirrors the original: header, headline stat, two sub stats, a
// highlight row and a staggered bar chart. The chart reuses the Status tab's
// green/red spike language so live data reads the same everywhere.

type SubStat = {
  value: string | number
  label: string
  subLabel: string
}

type AvailabilityBar = {
  /** Fill amount between 0 and 1. */
  level: number
}

interface FreelancerStatsCardProps {
  title: string
  timeFrame: string
  headline: {
    label: string
    value: string
    change: string
    positive: boolean
  }
  subStats: [SubStat, SubStat]
  highlight: {
    place: string
    category: string
    icon?: React.ReactNode
  }
  availability: {
    title: string
    bars: AvailabilityBar[]
    label: string
  }
  tone?: 'green' | 'red' | 'neutral'
  className?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } }
}

export const FreelancerStatsCard = React.forwardRef<HTMLDivElement, FreelancerStatsCardProps>(
  ({ title, timeFrame, headline, subStats, highlight, availability, tone = 'green', className }, ref) => (
    <div ref={ref} className={cn('fsc', className)} aria-labelledby="fsc-title">
      <header className="fsc-head">
        <h2 id="fsc-title" className="fsc-title">
          {title}
        </h2>
        <span className="fsc-chip">{timeFrame}</span>
      </header>

      <section className="fsc-main" aria-label={headline.label}>
        <p className="fsc-eyebrow">{headline.label}</p>
        <h3 className="fsc-value">{headline.value}</h3>
        <p className={cn('fsc-change', headline.positive ? 'up' : 'down')}>{headline.change}</p>
      </section>

      <section className="fsc-grid" aria-label={`${title} details`}>
        {subStats.map((stat, index) => (
          <div key={index} className="fsc-sub">
            <p className="fsc-sub-value">
              {stat.value} <span>{stat.label}</span>
            </p>
            <p className="fsc-sub-label">{stat.subLabel}</p>
          </div>
        ))}
      </section>

      <section className="fsc-highlight" aria-label={`${highlight.place}, ${highlight.category}`}>
        <div>
          <h4>{highlight.place}</h4>
          <p>{highlight.category}</p>
        </div>
        {highlight.icon ? (
          <span className="fsc-highlight-icon" aria-hidden="true">
            {highlight.icon}
          </span>
        ) : null}
      </section>

      <section className="fsc-avail" aria-labelledby="fsc-avail-title">
        <h4 id="fsc-avail-title">{availability.title}</h4>
        <motion.div
          className={cn('fsc-bars', tone)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-label="Latency spikes"
        >
          {availability.bars.map((bar, index) => (
            <span key={index} className="fsc-bar-slot">
              {bar.level === 0 ? (
                <span className="fsc-bar is-empty" style={{ height: 2 }} />
              ) : (
                <motion.span
                  className={cn('fsc-bar', tone, index === availability.bars.length - 1 && 'last')}
                  initial={{ height: '0%', opacity: 0 }}
                  animate={{ height: `${Math.max(8, bar.level * 100)}%`, opacity: 1 }}
                  transition={{ duration: 0.45, delay: Math.min(index, 24) * 0.012, ease: 'easeOut' }}
                />
              )}
            </span>
          ))}
        </motion.div>
        <p className="fsc-avail-label">{availability.label}</p>
      </section>
    </div>
  )
)

FreelancerStatsCard.displayName = 'FreelancerStatsCard'

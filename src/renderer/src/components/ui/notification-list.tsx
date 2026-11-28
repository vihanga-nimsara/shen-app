"use client"

import { motion, type Transition } from "framer-motion"
import { RotateCcw, ArrowUpRight } from "lucide-react"

export interface AppNotification {
  id: string
  title: string
  subtitle: string
  time: string
  count?: number
  tone?: "default" | "success" | "danger"
}

const transition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 26,
}

const getCardVariants = (i: number) => ({
  collapsed: {
    marginTop: i === 0 ? 0 : -44,
    scaleX: 1 - i * 0.05,
  },
  expanded: {
    marginTop: i === 0 ? 0 : 4,
    scaleX: 1,
  },
})

const textSwitchTransition: Transition = {
  duration: 0.22,
  ease: "easeInOut",
}

const notificationTextVariants = {
  collapsed: { opacity: 1, y: 0, pointerEvents: "auto" as const },
  expanded: { opacity: 0, y: -16, pointerEvents: "none" as const },
}

const viewAllTextVariants = {
  collapsed: { opacity: 0, y: 16, pointerEvents: "none" as const },
  expanded: { opacity: 1, y: 0, pointerEvents: "auto" as const },
}

interface NotificationListProps {
  items: AppNotification[]
  onOpen?: () => void
}

function NotificationList({ items, onOpen }: NotificationListProps) {
  if (items.length === 0) return null

  return (
    <motion.div
      className="notif-list"
      initial="collapsed"
      whileHover="expanded"
      aria-label="Notifications"
    >
      <div>
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            className={`notif-card${item.tone && item.tone !== "default" ? ` is-${item.tone}` : ""}`}
            variants={getCardVariants(i)}
            transition={transition}
            style={{ zIndex: items.length - i }}
          >
            <div className="notif-card-top">
              <span className="notif-title">{item.title}</span>
              {item.count !== undefined ? (
                <span className="notif-recount">
                  <RotateCcw size={11} />
                  <span>{item.count}</span>
                </span>
              ) : null}
            </div>
            <div className="notif-meta">
              <span>{item.time}</span>
              <span className="notif-dot">·</span>
              <span>{item.subtitle}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="notif-foot">
        <span className="notif-badge">{items.length}</span>
        <span className="notif-switch">
          <motion.span
            className="notif-label"
            variants={notificationTextVariants}
            transition={textSwitchTransition}
          >
            Notifications
          </motion.span>
          <motion.button
            type="button"
            className="notif-label notif-viewall"
            variants={viewAllTextVariants}
            transition={textSwitchTransition}
            onClick={onOpen}
          >
            View all <ArrowUpRight size={13} />
          </motion.button>
        </span>
      </div>
    </motion.div>
  )
}

export { NotificationList }

export default NotificationList

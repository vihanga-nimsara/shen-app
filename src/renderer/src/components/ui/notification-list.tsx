"use client"

import * as React from "react"

import { RotateCcw, ArrowUpRight } from "lucide-react"
import { motion, type Transition } from "framer-motion"

const notifications = [
  {
    id: 1,
    title: "NPM Install Complete",
    subtitle: "1,227 packages added!",
    time: "just now",
    count: 2,
  },
  {
    id: 2,
    title: "Build Succeeded",
    subtitle: "Build finished in 12.34s",
    time: "1m 11s",
  },
  {
    id: 3,
    title: "Lint Passed",
    subtitle: "No problems found",
    time: "5m",
  },
]

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

function NotificationList() {
  return (
    <motion.div
      className="notif-list"
      initial="collapsed"
      whileHover="expanded"
      aria-label="Notifications"
    >
      <div>
        {notifications.map((notification, i) => (
          <motion.div
            key={notification.id}
            className="notif-card"
            variants={getCardVariants(i)}
            transition={transition}
            style={{ zIndex: notifications.length - i }}
          >
            <div className="notif-card-top">
              <span className="notif-title">{notification.title}</span>
              {notification.count ? (
                <span className="notif-recount">
                  <RotateCcw size={11} />
                  <span>{notification.count}</span>
                </span>
              ) : null}
            </div>
            <div className="notif-meta">
              <span>{notification.time}</span>
              <span className="notif-dot">·</span>
              <span>{notification.subtitle}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="notif-foot">
        <span className="notif-badge">{notifications.length}</span>
        <span className="notif-switch">
          <motion.span
            className="notif-label"
            variants={notificationTextVariants}
            transition={textSwitchTransition}
          >
            Notifications
          </motion.span>
          <motion.span
            className="notif-label notif-viewall"
            variants={viewAllTextVariants}
            transition={textSwitchTransition}
          >
            View all <ArrowUpRight size={13} />
          </motion.span>
        </span>
      </div>
    </motion.div>
  )
}

export { NotificationList }

export default NotificationList
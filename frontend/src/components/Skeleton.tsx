import { motion } from 'motion/react'

import type { CSSProperties } from 'react'

type BoneProps = {
  className?: string
  style?: CSSProperties
}

export function Bone({ className = '', style }: BoneProps) {
  return <div className={`skel-bone ${className}`.trim()} style={style} aria-hidden />
}

export function BootLoader({ label = 'BLOK' }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <motion.div
        className="boot-loader"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      >
        <div className="boot-mark" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="boot-label">{label}</p>
        <p className="boot-sub">Loading…</p>
      </motion.div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="task-list skel-list" role="status" aria-live="polite" aria-busy="true" aria-label="Loading tasks">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="skel-task"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 360, damping: 28 }}
        >
          <Bone className="skel-handle" />
          <div className="skel-task-main">
            <Bone className="skel-line skel-line-lg" />
            <Bone className="skel-line skel-line-md" />
            <div className="skel-meta">
              <Bone className="skel-chip" />
              <Bone className="skel-chip skel-chip-wide" />
            </div>
          </div>
          <div className="skel-task-actions">
            <Bone className="skel-btn" />
            <Bone className="skel-btn" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function FocusSkeleton() {
  return (
    <div className="page focus-page" role="status" aria-live="polite" aria-busy="true" aria-label="Loading focus">
      <motion.div
        className="focus-stage skel-focus"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <Bone className="skel-line skel-line-sm" style={{ margin: '0 auto 1rem' }} />
        <Bone className="skel-line skel-line-title" style={{ margin: '0 auto 0.75rem' }} />
        <Bone className="skel-line skel-line-md" style={{ margin: '0 auto 1.5rem' }} />
        <Bone className="skel-timer" style={{ margin: '0 auto 1.25rem' }} />
        <div className="focus-controls skel-focus-controls">
          <Bone className="skel-btn skel-btn-lg" />
          <Bone className="skel-btn skel-btn-lg" />
          <Bone className="skel-btn skel-btn-lg" />
        </div>
      </motion.div>
    </div>
  )
}

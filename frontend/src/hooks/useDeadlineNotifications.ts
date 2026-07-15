import { useEffect, useRef } from 'react'
import type { Task } from '../lib/types'

const STORAGE_KEY = 'blok_notified_deadlines_v1'
const HOUR_MS = 60 * 60 * 1000
const CHECK_MS = 60_000

function loadNotified(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

function saveNotified(map: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function notifyKey(task: Task) {
  return `${task.id}:${task.dueAt ?? ''}`
}

function maybeNotify(tasks: Task[]) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const now = Date.now()
  const notified = loadNotified()
  let changed = false

  for (const task of tasks) {
    if (task.status !== 'active' || !task.dueAt) continue
    const due = Date.parse(task.dueAt)
    if (Number.isNaN(due)) continue
    const delta = due - now
    if (delta > HOUR_MS) continue
    const key = notifyKey(task)
    if (notified[key]) continue

    const title = delta < 0 ? 'Task overdue' : 'Task due soon'
    const body = delta < 0 ? `"${task.title}" is past due.` : `"${task.title}" is due within an hour.`
    try {
      new Notification(title, {
        body,
        tag: key,
        requireInteraction: false,
      })
      notified[key] = now
      changed = true
    } catch {
      void 0
    }
  }

  if (changed) saveNotified(notified)
}

export function useDeadlineNotifications(tasks: Task[], enabled: boolean) {
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  useEffect(() => {
    if (!enabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    maybeNotify(tasksRef.current)
    const timer = window.setInterval(() => maybeNotify(tasksRef.current), CHECK_MS)
    return () => window.clearInterval(timer)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    maybeNotify(tasks)
  }, [tasks, enabled])
}

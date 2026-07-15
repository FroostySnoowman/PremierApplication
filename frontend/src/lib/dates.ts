export function dueLabel(dueAt: string | null): { text: string; urgency: 'ok' | 'soon' | 'overdue' } | null {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return null

  const now = new Date()
  const ms = due.getTime() - now.getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const text = due.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  if (ms < 0) return { text, urgency: 'overdue' }
  if (ms <= dayMs) return { text, urgency: 'soon' }
  return { text, urgency: 'ok' }
}

export function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInputValue(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

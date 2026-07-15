export type DbUser = {
  id: string
  email: string
  password_hash: string
  name: string
  created_at: string
  updated_at: string
}

export type DbTask = {
  id: string
  user_id: string
  title: string
  description: string
  due_at: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed'
  sort_order: number
  created_at: string
  updated_at: string
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function addMinutesIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

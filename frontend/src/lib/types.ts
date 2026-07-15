export type User = {
  id: string
  email: string
  name: string
}

export type Priority = 'low' | 'medium' | 'high'
export type TaskStatus = 'active' | 'completed'
export type TaskFilter = 'all' | 'active' | 'completed'

export type Task = {
  id: string
  title: string
  description: string
  dueAt: string | null
  priority: Priority
  status: TaskStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
}

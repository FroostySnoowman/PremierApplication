import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskForm } from '../components/TaskForm'
import { BoardSkeleton } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useDeadlineNotifications } from '../hooks/useDeadlineNotifications'
import { api, ApiError } from '../lib/api'
import type { Priority, Task, TaskFilter } from '../lib/types'

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

export function BoardPage() {
  const { user } = useAuth()
  const { push } = useToast()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  useDeadlineNotifications(tasks, Boolean(user))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ tasks: Task[] }>(`/tasks?filter=${filter}`)
      setTasks(data.tasks)
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not load tasks')
    } finally {
      setLoading(false)
    }
  }, [filter, push])

  useEffect(() => {
    void load()
  }, [load])

  const ids = useMemo(() => tasks.map((t) => t.id), [tasks])

  async function createTask(input: {
    title: string
    description: string
    dueAt: string | null
    priority: Priority
  }) {
    try {
      if (editing) {
        const data = await api.patch<{ task: Task }>(`/tasks/${editing.id}`, {
          title: input.title,
          description: input.description,
          due_at: input.dueAt,
          priority: input.priority,
        })
        setTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)))
        setEditing(null)
        push('Task updated', 'ok')
      } else {
        const data = await api.post<{ task: Task }>('/tasks', {
          title: input.title,
          description: input.description,
          due_at: input.dueAt,
          priority: input.priority,
        })
        if (filter !== 'completed') {
          setTasks((prev) => [...prev, data.task])
        }
        push('Task added', 'ok')
      }
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not save task')
      throw err
    }
  }

  async function onToggle(task: Task) {
    const next = task.status === 'completed' ? 'active' : 'completed'
    try {
      const data = await api.patch<{ task: Task }>(`/tasks/${task.id}`, { status: next })
      setTasks((prev) => {
        if (filter === 'all') return prev.map((t) => (t.id === data.task.id ? data.task : t))
        if (filter === 'active' && next === 'completed') return prev.filter((t) => t.id !== task.id)
        if (filter === 'completed' && next === 'active') return prev.filter((t) => t.id !== task.id)
        return prev.map((t) => (t.id === data.task.id ? data.task : t))
      })
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not update task')
    }
  }

  async function onDelete(task: Task) {
    try {
      await api.delete(`/tasks/${task.id}`)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      if (editing?.id === task.id) setEditing(null)
      push('Task deleted', 'ok')
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not delete task')
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    if (filter !== 'all') return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(tasks, oldIndex, newIndex)
    setTasks(next)
    try {
      await api.put('/tasks/reorder', { orderedIds: next.map((t) => t.id) })
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not reorder')
      void load()
    }
  }

  return (
    <div className="page">
      <header className="board-header">
        <div>
          <h1>Board</h1>
          <p>Hey {user?.name.split(' ')[0] ?? 'there'} — stack it, then focus.</p>
        </div>
        <div className="filters" role="tablist" aria-label="Task filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' ? (
            <button
              type="button"
              className="chip"
              onClick={() => void Notification.requestPermission()}
            >
              Enable alerts
            </button>
          ) : null}
        </div>
      </header>

      <div className="board-grid">
        <section className="panel">
          <h2>{loading ? 'Loading' : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}</h2>
          {loading ? (
            <BoardSkeleton />
          ) : tasks.length === 0 ? (
            <div className="empty">No tasks in this view. Add one on the right.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onDragEnd(e)}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="task-list">
                  <AnimatePresence initial={false}>
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      >
                        <TaskCard
                          task={task}
                          onToggle={(t) => void onToggle(t)}
                          onEdit={setEditing}
                          onDelete={(t) => void onDelete(t)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <aside className="panel">
          <h2>{editing ? 'Edit task' : 'New task'}</h2>
          <TaskForm
            editing={editing}
            onSubmit={createTask}
            onCancelEdit={() => setEditing(null)}
          />
        </aside>
      </div>
    </div>
  )
}

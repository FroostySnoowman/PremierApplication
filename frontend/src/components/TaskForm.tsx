import { useEffect, useState, type FormEvent } from 'react'
import type { Priority, Task } from '../lib/types'
import { fromLocalInputValue, toLocalInputValue } from '../lib/dates'
import { Select } from './Select'

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Low' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'high' as const, label: 'High' },
]

type Props = {
  editing?: Task | null
  onSubmit: (input: {
    title: string
    description: string
    dueAt: string | null
    priority: Priority
  }) => Promise<void>
  onCancelEdit?: () => void
}

export function TaskForm({ editing, onSubmit, onCancelEdit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description)
      setDueAt(toLocalInputValue(editing.dueAt))
      setPriority(editing.priority)
    } else {
      setTitle('')
      setDescription('')
      setDueAt('')
      setPriority('medium')
    }
  }, [editing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        dueAt: fromLocalInputValue(dueAt),
        priority,
      })
      if (!editing) {
        setTitle('')
        setDescription('')
        setDueAt('')
        setPriority('medium')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="field">
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ship the landing page"
        />
      </div>
      <div className="field">
        <label htmlFor="task-desc">Description</label>
        <textarea
          id="task-desc"
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes, links, acceptance criteria…"
        />
      </div>
      <div className="field">
        <label htmlFor="task-due">Due</label>
        <input
          id="task-due"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="task-priority">Priority</label>
        <Select
          id="task-priority"
          value={priority}
          options={PRIORITY_OPTIONS}
          onChange={setPriority}
          aria-label="Priority"
        />
      </div>
      <div className="form-footer">
        <button className="btn btn-lime" type="submit" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
        </button>
        {editing && onCancelEdit ? (
          <button className="btn btn-ghost" type="button" onClick={onCancelEdit}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

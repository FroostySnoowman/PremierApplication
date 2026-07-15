import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import type { Task } from '../lib/types'
import { dueLabel } from '../lib/dates'

type Props = {
  task: Task
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function TaskCard({ task, onToggle, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const due = dueLabel(task.dueAt)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card ${task.status === 'completed' ? 'completed' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ::
      </button>

      <div className="task-main">
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
          <button
            type="button"
            className="check"
            data-on={task.status === 'completed'}
            aria-label={task.status === 'completed' ? 'Mark active' : 'Mark complete'}
            onClick={() => onToggle(task)}
          >
            {task.status === 'completed' ? '✓' : ''}
          </button>
          <div>
            <h3 className="task-title">{task.title}</h3>
            {task.description ? <p className="task-desc">{task.description}</p> : null}
            <div className="task-meta">
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
              {due ? (
                <span className={`badge badge-due ${due.urgency === 'ok' ? '' : due.urgency}`}>
                  {due.urgency === 'overdue' ? 'Overdue · ' : due.urgency === 'soon' ? 'Soon · ' : ''}
                  {due.text}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="task-actions">
        {task.status === 'active' ? (
          <Link className="btn btn-sm btn-coral" to={`/app/focus/${task.id}`}>
            Focus
          </Link>
        ) : null}
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => onEdit(task)}>
          Edit
        </button>
        <button type="button" className="btn btn-sm" onClick={() => onDelete(task)}>
          Delete
        </button>
      </div>
    </article>
  )
}

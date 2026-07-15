import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FocusSkeleton } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { api, ApiError } from '../lib/api'
import type { Task } from '../lib/types'

const DEFAULT_SECONDS = 25 * 60

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { push } = useToast()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!taskId) {
        navigate('/app', { replace: true })
        return
      }
      try {
        const data = await api.get<{ task: Task }>(`/tasks/${taskId}`)
        if (!cancelled) setTask(data.task)
      } catch (err) {
        if (!cancelled) {
          push(err instanceof ApiError ? err.message : 'Could not load task')
          navigate('/app', { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [taskId, navigate, push])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const title = useMemo(() => task?.title ?? 'Focus', [task])

  async function markDone() {
    if (!task) return
    try {
      await api.patch(`/tasks/${task.id}`, { status: 'completed' })
      push('Blocked and done', 'ok')
      navigate('/app')
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not update task')
    }
  }

  if (loading || !task) {
    return <FocusSkeleton />
  }

  return (
    <div className="page focus-page focus-immersive">
      <motion.div
        className="focus-stage"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <p className="focus-label">Focus mode</p>
        <h1 className="focus-title">{title}</h1>
        {task.description ? <p className="focus-desc">{task.description}</p> : null}
        <p className="timer" aria-live="polite">
          {formatTime(seconds)}
        </p>
        <div className="focus-controls">
          <button
            type="button"
            className="btn btn-lime"
            onClick={() => {
              if (seconds === 0) {
                setSeconds(DEFAULT_SECONDS)
                setRunning(true)
                return
              }
              setRunning((v) => !v)
            }}
          >
            {running ? 'Pause' : seconds === 0 ? 'Restart' : 'Start'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRunning(false)
              setSeconds(DEFAULT_SECONDS)
            }}
          >
            Reset
          </button>
          <button type="button" className="btn btn-coral" onClick={() => void markDone()}>
            Mark done
          </button>
          <Link className="btn btn-ghost" to="/app">
            Exit
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

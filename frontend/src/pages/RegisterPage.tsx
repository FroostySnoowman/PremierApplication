import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../lib/api'

export function RegisterPage() {
  const { user, register, loading } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await register(name, email, password)
      push('Account ready', 'ok')
      navigate('/app', { replace: true })
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not create account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page auth-layout">
      <motion.div
        className="auth-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <h1>Sign up</h1>
        <p className="sub">Your board. Your blocks. Locked to you.</p>
        <form className="form" onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field-hint">At least 12 characters, with a letter and a number.</span>
          </div>
          <div className="form-footer">
            <button className="btn btn-lime" type="submit" disabled={busy}>
              {busy ? 'Working…' : 'Create account'}
            </button>
            <p className="muted-link">
              Have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

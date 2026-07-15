import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../lib/api'

export function Nav() {
  const { user, logout } = useAuth()
  const { push } = useToast()

  async function onLogout() {
    try {
      await logout()
      push('Signed out', 'ok')
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not sign out')
    }
  }

  return (
    <header className="site-nav">
      <Link to={user ? '/app' : '/'} className="brand">
        BLO<span>K</span>
      </Link>
      <div className="nav-actions">
        {user ? (
          <>
            <span className="muted-link" style={{ color: 'var(--muted)' }}>
              {user.name}
            </span>
            <Link className="btn btn-sm btn-ghost" to="/app">
              Board
            </Link>
            <button type="button" className="btn btn-sm" onClick={() => void onLogout()}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-sm btn-ghost" to="/login">
              Log in
            </Link>
            <Link className="btn btn-sm btn-lime" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="page">
      <section className="hero">
        <motion.h1
          className="hero-brand"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          BLOK
        </motion.h1>
        <motion.p
          className="hero-line"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 24 }}
        >
          Cut the noise. Stack your work. Drop into focus.
        </motion.p>
        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, type: 'spring', stiffness: 260, damping: 24 }}
        >
          {user ? (
            <Link className="btn btn-lime" to="/app">
              Open board
            </Link>
          ) : (
            <>
              <Link className="btn btn-lime" to="/register">
                Start free
              </Link>
              <Link className="btn" to="/login">
                Log in
              </Link>
            </>
          )}
        </motion.div>
      </section>

      <section className="section">
        <h2>Built for deep work</h2>
        <p>Prioritize, filter, and lock in with Focus Mode — a timer that hides everything else.</p>
        <div className="feature-row">
          <article className="feature">
            <h3>Hard edges</h3>
            <p>Tasks with priority, due dates, and clean filters. No cluttered dashboards.</p>
          </article>
          <article className="feature">
            <h3>Focus Mode</h3>
            <p>Pick one task, start a countdown, and stay on the block until it is done.</p>
          </article>
          <article className="feature">
            <h3>Your list</h3>
            <p>Drag to reorder. Your board stays private to your account.</p>
          </article>
        </div>
      </section>
    </div>
  )
}

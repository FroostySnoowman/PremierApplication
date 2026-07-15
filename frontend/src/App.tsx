import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Nav } from './components/Nav'
import { ProtectedRoute } from './components/ProtectedRoute'
import { BoardPage } from './pages/BoardPage'
import { FocusPage } from './pages/FocusPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/app/focus')

  return (
    <div className={`app-shell ${hideNav ? 'focus-shell' : ''}`}>
      {hideNav ? null : <Nav />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageFade>
                <LandingPage />
              </PageFade>
            }
          />
          <Route
            path="/login"
            element={
              <PageFade>
                <LoginPage />
              </PageFade>
            }
          />
          <Route
            path="/register"
            element={
              <PageFade>
                <RegisterPage />
              </PageFade>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <PageFade>
                  <BoardPage />
                </PageFade>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/focus/:taskId"
            element={
              <ProtectedRoute>
                <PageFade>
                  <FocusPage />
                </PageFade>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

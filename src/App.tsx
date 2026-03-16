import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { StageManagerDashboard } from './pages/StageManagerDashboard'
import { EventDirectorDashboard } from './pages/EventDirectorDashboard'
import { DevSeedPage } from './pages/DevSeedPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-tedx-red flex items-center justify-center">
          <span className="text-lg font-black text-white">TEDx</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-tedx-red animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: React.ReactNode
  allowedRole: 'stage_manager' | 'event_director'
}) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <LoadingScreen />
  if (profile.role !== allowedRole) {
    // Redirect to the correct dashboard
    if (profile.role === 'stage_manager') return <Navigate to="/stage-manager" replace />
    if (profile.role === 'event_director') return <Navigate to="/director" replace />
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AuthRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <LoadingScreen />
  if (profile.role === 'stage_manager') return <Navigate to="/stage-manager" replace />
  if (profile.role === 'event_director') return <Navigate to="/director" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dev-seed" element={<DevSeedPage />} />

      {/* Protected */}
      <Route
        path="/stage-manager"
        element={
          <ProtectedRoute allowedRole="stage_manager">
            <StageManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/director"
        element={
          <ProtectedRoute allowedRole="event_director">
            <EventDirectorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Root */}
      <Route path="/" element={<AuthRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

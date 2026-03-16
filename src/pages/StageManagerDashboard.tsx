import { useAuth } from '../context/AuthContext'
import { useSessionStats } from '../hooks/useSessionStats'
import { SessionCard } from '../components/SessionCard'
import { DailyGraph } from '../components/DailyGraph'
import { signOut } from '../services/auth'
import { useNavigate } from 'react-router-dom'

export function StageManagerDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { combined, loading, error } = useSessionStats(profile?.uid)

  const sessions = combined.map((c) => c.session)
  const totalResponses = combined.reduce((sum, c) => sum + (c.stats?.totalResponses ?? 0), 0)
  const allRatings = combined.filter((c) => c.stats && c.stats.totalResponses > 0)
  const overallAvg =
    allRatings.length > 0
      ? allRatings.reduce((sum, c) => sum + (c.stats?.averageRating ?? 0), 0) / allRatings.length
      : null

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-tedx-dark">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-tedx-dark/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tedx-red flex items-center justify-center">
              <span className="text-xs font-black text-white">TEDx</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Stage Manager</h1>
              <p className="text-xs text-gray-500">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
            <button onClick={handleSignOut} className="btn-secondary text-sm py-1.5 px-4">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <span className="stat-value">{loading ? '—' : totalResponses}</span>
            <span className="stat-label">Total Responses</span>
          </div>
          <div className="stat-card">
            <span className={`stat-value ${overallAvg !== null && overallAvg < 3 ? 'text-red-400' : ''}`}>
              {loading || overallAvg === null ? '—' : overallAvg.toFixed(2)}
            </span>
            <span className="stat-label">Avg Rating</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{loading ? '—' : combined.length}</span>
            <span className="stat-label">My Sessions</span>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Session cards */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            My Sessions
          </h2>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card h-48 animate-pulse bg-gray-700" />
              ))}
            </div>
          ) : combined.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No sessions assigned to your account.</p>
              <p className="text-gray-600 text-sm mt-1">Contact your Event Director.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {combined.map((item) => (
                <SessionCard
                  key={item.session.id}
                  session={item.session}
                  stats={item.stats}
                />
              ))}
            </div>
          )}
        </section>

        {/* Daily graph */}
        {!loading && sessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Historical Trends
            </h2>
            <DailyGraph sessions={sessions} />
          </section>
        )}
      </main>
    </div>
  )
}

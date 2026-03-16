import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEventStats } from '../hooks/useEventStats'
import { Leaderboard } from '../components/Leaderboard'
import { RatingIndicator } from '../components/RatingIndicator'
import { signOut } from '../services/auth'
import { generateDayReport, type DayReportResult } from '../services/feedbackService'
import { todayString } from '../utils/dateUtils'

interface Toast {
  id: number
  type: 'warning' | 'error'
  title: string
  message: string
}

export function EventDirectorDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { eventStats, topSessions, loading, oneStarAlert, dismissAlert } = useEventStats()

  const [reportDate, setReportDate] = useState(todayString())
  const [report, setReport] = useState<DayReportResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastCounter = useRef(0)

  function addToast(type: Toast['type'], title: string, message: string) {
    const id = ++toastCounter.current
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => dismissToast(id), 6000)
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Also show a toast when 1-star alert fires
  useEffect(() => {
    if (oneStarAlert) {
      addToast('error', '1-star rating received!', 'A new 1-star rating just came in — check your sessions.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oneStarAlert])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleGenerateReport() {
    // Immediate alert if API key is absent — no need to wait for Firestore
    const hasKey = !!(import.meta.env.VITE_OPENAI_API_KEY as string | undefined)
    if (!hasKey) {
      addToast(
        'warning',
        'OpenAI API key missing',
        'Add VITE_OPENAI_API_KEY=sk-... to your .env file and restart the dev server.',
      )
      // Still fetch comments so they appear below
    }

    setReportLoading(true)
    setReport(null)
    const result = await generateDayReport(reportDate)
    setReport(result)
    setReportLoading(false)
  }

  return (
    <div className="min-h-screen bg-tedx-dark">

      {/* ── Toast stack ─────────────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm
              animate-[slideIn_0.2s_ease-out]
              ${toast.type === 'warning'
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200'
                : 'bg-red-500/20 border-red-500/40 text-red-200'
              }`}
          >
            {/* Icon */}
            {toast.type === 'warning' ? (
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug">{toast.title}</p>
              <p className="text-xs opacity-80 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            {/* Dismiss */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      {oneStarAlert && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <strong>New 1-star rating received!</strong> Check your sessions for issues.
          </div>
          <button
            onClick={dismissAlert}
            className="text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Top nav */}
      <nav className={`sticky z-50 bg-tedx-dark/90 backdrop-blur border-b border-gray-800 ${oneStarAlert ? 'top-12' : 'top-0'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tedx-red flex items-center justify-center">
              <span className="text-xs font-black text-white">TEDx</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Event Director</h1>
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Global stats */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Event Overview
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card h-24 animate-pulse bg-gray-700" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="stat-card">
                <span className="stat-value">{eventStats?.totalResponses ?? '—'}</span>
                <span className="stat-label">Total Responses</span>
              </div>
              <div className="stat-card">
                <div className="mt-1">
                  {eventStats ? (
                    <RatingIndicator rating={eventStats.averageRating} />
                  ) : (
                    <span className="stat-value">—</span>
                  )}
                </div>
                <span className="stat-label mt-1">Avg Rating</span>
              </div>
              <div className="stat-card">
                <span className="stat-value text-red-400">{eventStats?.oneStarCount ?? '—'}</span>
                <span className="stat-label">1-Star Ratings</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">
                  {eventStats
                    ? (eventStats.ratingSum > 0
                        ? ((eventStats.ratingSum / (eventStats.totalResponses * 5)) * 100).toFixed(0)
                        : 0) + '%'
                    : '—'}
                </span>
                <span className="stat-label">Satisfaction</span>
              </div>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Session Leaderboard
          </h2>
          <Leaderboard sessions={topSessions} loading={loading} />
        </section>

        {/* Day Report */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Day Feedback Report
          </h2>
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1">
                <label className="label">Select Date</label>
                <input
                  type="date"
                  className="input"
                  value={reportDate}
                  max={todayString()}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
              <button
                className="btn-primary shrink-0"
                onClick={handleGenerateReport}
                disabled={reportLoading || !reportDate}
              >
                {reportLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate AI Report'
                )}
              </button>
            </div>

            {report && (
              <div className="space-y-4 pt-4 border-t border-gray-700">

                {/* Missing API key — actionable setup instructions */}
                {report.missingKey && (
                  <div className="px-4 py-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                    <p className="text-yellow-400 text-sm font-semibold flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      OpenAI API key not configured
                    </p>
                    <p className="text-yellow-300/70 text-xs">
                      Add the following line to your <code className="bg-black/30 px-1 rounded">.env</code> file,
                      then restart the dev server:
                    </p>
                    <code className="block px-3 py-2 bg-black/40 rounded text-xs font-mono text-yellow-200 select-all">
                      VITE_OPENAI_API_KEY=sk-...your-key-here...
                    </code>
                    <p className="text-yellow-300/50 text-xs">
                      Get a key at{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-yellow-300"
                      >
                        platform.openai.com/api-keys
                      </a>
                      . The comments below were fetched successfully.
                    </p>
                  </div>
                )}

                {/* Generic error (network, quota, parse failure, etc.) */}
                {report.error && !report.missingKey && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm font-medium">Report generation failed</p>
                    <p className="text-red-400/70 text-xs mt-1">{report.error}</p>
                  </div>
                )}

                {/* AI Summary cards */}
                {report.summary && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <h4 className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2">
                        What Went Well
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{report.summary.wentWell}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <h4 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                        What Went Wrong
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{report.summary.wentWrong}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Recommendation
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{report.summary.recommendation}</p>
                    </div>
                  </div>
                )}

                {/* Raw comments list */}
                {report.comments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Comments from this day ({report.comments.length})
                    </h4>
                    <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {report.comments.map((c, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-400 px-3 py-2 bg-tedx-dark rounded-lg border border-gray-700"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No comments at all */}
                {!report.error && !report.missingKey && report.comments.length === 0 && (
                  <p className="text-gray-600 text-sm italic">No comments recorded for this date.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

import type { SessionStats } from '../services/statsService'

interface LeaderboardProps {
  sessions: SessionStats[]
  loading?: boolean
}

const medals = ['🥇', '🥈', '🥉', '', '']

export function Leaderboard({ sessions, loading }: LeaderboardProps) {
  if (loading) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Top Sessions
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Top Sessions
        </h3>
        <p className="text-gray-600 text-sm italic">No sessions ranked yet.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Top 5 Sessions by Rating
      </h3>
      <ol className="space-y-2.5">
        {sessions.map((s, i) => (
          <li
            key={s.sessionId}
            className="flex items-center gap-3 px-4 py-3 bg-tedx-dark rounded-lg border border-gray-700"
          >
            <span className="text-lg w-7 text-center shrink-0">{medals[i] || `#${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{s.sessionId}</p>
              <p className="text-xs text-gray-500">{s.totalResponses} responses</p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span
                className={`text-base font-bold ${s.averageRating >= 4 ? 'text-green-400' : s.averageRating >= 3 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {s.averageRating.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">avg</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

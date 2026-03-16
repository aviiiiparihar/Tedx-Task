import { useEffect, useState } from 'react'
import { RatingIndicator } from './RatingIndicator'
import { fetchRecentCommentsForSession, type FeedbackDoc } from '../services/feedbackService'
import { formatTimestamp } from '../utils/dateUtils'
import type { SessionDoc } from '../services/statsService'
import type { SessionStats } from '../services/statsService'

interface SessionCardProps {
  session: SessionDoc
  stats: SessionStats | null
}

export function SessionCard({ session, stats }: SessionCardProps) {
  const [comments, setComments] = useState<FeedbackDoc[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)

  useEffect(() => {
    fetchRecentCommentsForSession(session.id, 5)
      .then((docs) => {
        setComments(docs)
        setCommentsLoading(false)
      })
      .catch(() => setCommentsLoading(false))
  }, [session.id, stats?.totalResponses])

  const avgRating = stats?.averageRating ?? null
  const totalResponses = stats?.totalResponses ?? 0

  return (
    <div className="card flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{session.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Stage: {session.stageId}</p>
        </div>
        {avgRating !== null && avgRating < 3 && (
          <span className="shrink-0 px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold rounded-lg animate-pulse">
            ⚠ LOW RATING
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white">{totalResponses}</span>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Responses</span>
        </div>
        <div className="w-px h-10 bg-gray-700" />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Avg Rating</span>
          <RatingIndicator rating={avgRating} showWarning />
        </div>
      </div>

      {/* Recent comments */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Recent Comments
        </h4>
        {commentsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-600 text-sm italic">No comments yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3 items-start">
                <div
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                    ${c.rating >= 4 ? 'bg-green-500/20 text-green-400' : c.rating >= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}
                >
                  {c.rating}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 leading-snug line-clamp-2">{c.comment}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{formatTimestamp(c.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

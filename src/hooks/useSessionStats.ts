import { useEffect, useState } from 'react'
import {
  subscribeToSessionStats,
  fetchSessionsForManager,
  type SessionStats,
  type SessionDoc,
} from '../services/statsService'

export interface SessionWithStats {
  session: SessionDoc
  stats: SessionStats | null
}

export function useSessionStats(stageManagerId: string | undefined) {
  const [sessions, setSessions] = useState<SessionDoc[]>([])
  const [statsMap, setStatsMap] = useState<Map<string, SessionStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!stageManagerId) return
    setLoading(true)

    fetchSessionsForManager(stageManagerId)
      .then((docs) => {
        setSessions(docs)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sessions')
        setLoading(false)
      })
  }, [stageManagerId])

  useEffect(() => {
    if (sessions.length === 0) return
    const ids = sessions.map((s) => s.id)

    const unsub = subscribeToSessionStats(ids, (statsArr) => {
      const map = new Map<string, SessionStats>()
      for (const s of statsArr) map.set(s.sessionId, s)
      setStatsMap(map)
    })
    return unsub
  }, [sessions])

  const combined: SessionWithStats[] = sessions.map((s) => ({
    session: s,
    stats: statsMap.get(s.id) ?? null,
  }))

  return { combined, loading, error }
}

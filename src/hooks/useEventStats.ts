import { useEffect, useRef, useState } from 'react'
import {
  subscribeToEventStats,
  subscribeToTopSessions,
  type EventStats,
  type SessionStats,
} from '../services/statsService'

export function useEventStats() {
  const [eventStats, setEventStats] = useState<EventStats | null>(null)
  const [topSessions, setTopSessions] = useState<SessionStats[]>([])
  const [loading, setLoading] = useState(true)
  const [oneStarAlert, setOneStarAlert] = useState(false)
  const prevOneStarCount = useRef<number | null>(null)

  useEffect(() => {
    const unsub1 = subscribeToEventStats((stats) => {
      if (stats) {
        if (
          prevOneStarCount.current !== null &&
          stats.oneStarCount > prevOneStarCount.current
        ) {
          setOneStarAlert(true)
        }
        prevOneStarCount.current = stats.oneStarCount
      }
      setEventStats(stats)
      setLoading(false)
    })

    const unsub2 = subscribeToTopSessions(setTopSessions)

    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  const dismissAlert = () => setOneStarAlert(false)

  return { eventStats, topSessions, loading, oneStarAlert, dismissAlert }
}

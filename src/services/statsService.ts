import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface SessionStats {
  sessionId: string
  stageManagerId: string
  totalResponses: number
  ratingSum: number
  averageRating: number
  oneStarCount: number
  lastUpdated: Timestamp
}

export interface EventStats {
  totalResponses: number
  ratingSum: number
  averageRating: number
  oneStarCount: number
}

export interface DailySessionStat {
  date: string
  totalResponses: number
  ratingSum: number
  averageRating: number
}

export interface SessionDoc {
  id: string
  title: string
  stageId: string
  stageManagerId: string
  startTime: Timestamp
  endTime: Timestamp
}

export function subscribeToSessionStats(
  sessionIds: string[],
  callback: (stats: SessionStats[]) => void,
): () => void {
  if (sessionIds.length === 0) {
    callback([])
    return () => {}
  }

  const results = new Map<string, SessionStats>()
  const unsubscribers: Array<() => void> = []

  for (const sessionId of sessionIds) {
    const ref = doc(db, 'session_stats', sessionId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        results.set(sessionId, snap.data() as SessionStats)
      }
      callback(Array.from(results.values()))
    })
    unsubscribers.push(unsub)
  }

  return () => unsubscribers.forEach((u) => u())
}

export function subscribeToEventStats(callback: (stats: EventStats | null) => void): () => void {
  const ref = doc(db, 'event_stats', 'main')
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as EventStats) : null)
  })
}

export function subscribeToTopSessions(
  callback: (sessions: SessionStats[]) => void,
): () => void {
  const q = query(
    collection(db, 'session_stats'),
    orderBy('averageRating', 'desc'),
    limit(5),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as SessionStats))
  })
}

export async function fetchSessionsForManager(stageManagerId: string): Promise<SessionDoc[]> {
  const q = query(
    collection(db, 'sessions'),
    where('stageManagerId', '==', stageManagerId),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) }))
}

export async function fetchDailyStatsForSession(
  sessionId: string,
  days = 365,
): Promise<DailySessionStat[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const colRef = collection(db, 'daily_session_stats', sessionId, 'days')
  const q = query(colRef, where('date', '>=', cutoffStr), orderBy('date', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as DailySessionStat)
}

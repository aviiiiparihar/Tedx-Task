import {
  collection,
  doc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface FeedbackInput {
  sessionId: string
  rating: number
  comment: string
}

export interface FeedbackDoc {
  id: string
  sessionId: string
  rating: number
  comment: string
  createdAt: Timestamp
}

export interface DayReportResult {
  summary: { wentWell: string; wentWrong: string; recommendation: string } | null
  comments: string[]
  error?: string
  /** true when comments were fetched but the OpenAI key is missing */
  missingKey?: boolean
}

// ─── Internal stat shapes used only inside this function ──────────────────────
interface RawStats { totalResponses: number; ratingSum: number; oneStarCount: number }
interface RawDaily { totalResponses: number; ratingSum: number }

/**
 * Submits feedback AND atomically updates session_stats, event_stats, and
 * daily_session_stats in a single Firestore transaction.
 * This keeps the leaderboard and dashboards live without needing Cloud Functions.
 */
export async function submitFeedback(input: FeedbackInput): Promise<string> {
  const feedbackRef      = doc(collection(db, 'feedback'))
  const sessionStatsRef  = doc(db, 'session_stats', input.sessionId)
  const eventStatsRef    = doc(db, 'event_stats', 'main')
  const today            = new Date().toISOString().split('T')[0]
  const dailyRef         = doc(db, 'daily_session_stats', input.sessionId, 'days', today)

  await runTransaction(db, async (tx) => {
    const [sessionSnap, eventSnap, dailySnap] = await Promise.all([
      tx.get(sessionStatsRef),
      tx.get(eventStatsRef),
      tx.get(dailyRef),
    ])

    const now = Timestamp.now()

    // ── feedback doc ──────────────────────────────────────────────────────────
    tx.set(feedbackRef, {
      sessionId: input.sessionId,
      rating:    input.rating,
      comment:   input.comment,
      createdAt: now,
    })

    // ── session_stats ─────────────────────────────────────────────────────────
    if (sessionSnap.exists()) {
      const c        = sessionSnap.data() as RawStats
      const newTotal = c.totalResponses + 1
      const newSum   = c.ratingSum + input.rating
      tx.update(sessionStatsRef, {
        totalResponses: newTotal,
        ratingSum:      newSum,
        averageRating:  newSum / newTotal,
        oneStarCount:   input.rating === 1 ? c.oneStarCount + 1 : c.oneStarCount,
        lastUpdated:    now,
      })
    } else {
      tx.set(sessionStatsRef, {
        sessionId:      input.sessionId,
        stageManagerId: '',
        totalResponses: 1,
        ratingSum:      input.rating,
        averageRating:  input.rating,
        oneStarCount:   input.rating === 1 ? 1 : 0,
        lastUpdated:    now,
      })
    }

    // ── event_stats/main ──────────────────────────────────────────────────────
    if (eventSnap.exists()) {
      const c        = eventSnap.data() as RawStats
      const newTotal = c.totalResponses + 1
      const newSum   = c.ratingSum + input.rating
      tx.update(eventStatsRef, {
        totalResponses: newTotal,
        ratingSum:      newSum,
        averageRating:  newSum / newTotal,
        oneStarCount:   input.rating === 1 ? c.oneStarCount + 1 : c.oneStarCount,
      })
    } else {
      tx.set(eventStatsRef, {
        totalResponses: 1,
        ratingSum:      input.rating,
        averageRating:  input.rating,
        oneStarCount:   input.rating === 1 ? 1 : 0,
      })
    }

    // ── daily_session_stats ───────────────────────────────────────────────────
    if (dailySnap.exists()) {
      const c        = dailySnap.data() as RawDaily
      const newTotal = c.totalResponses + 1
      const newSum   = c.ratingSum + input.rating
      tx.update(dailyRef, {
        totalResponses: newTotal,
        ratingSum:      newSum,
        averageRating:  newSum / newTotal,
      })
    } else {
      tx.set(dailyRef, {
        date:           today,
        totalResponses: 1,
        ratingSum:      input.rating,
        averageRating:  input.rating,
      })
    }
  })

  return feedbackRef.id
}

export async function fetchFeedbackForDate(date: Date): Promise<FeedbackDoc[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const q = query(
    collection(db, 'feedback'),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('createdAt', 'asc'),
  )

  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeedbackDoc, 'id'>) }))
}

export async function fetchRecentCommentsForSession(
  sessionId: string,
  count = 5,
): Promise<FeedbackDoc[]> {
  const q = query(
    collection(db, 'feedback'),
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'desc'),
    limit(count),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeedbackDoc, 'id'>) }))
}

/**
 * Browser-side day report:
 *  1. Reads feedback directly from Firestore (Event Director has read access)
 *  2. Calls the OpenAI API directly from the browser using VITE_OPENAI_API_KEY
 *
 * No Cloud Function deployment required.
 * Add VITE_OPENAI_API_KEY=sk-... to your .env file to enable the AI summary.
 */
export async function generateDayReport(dateStr: string): Promise<DayReportResult> {
  try {
    // Parse "YYYY-MM-DD" as a local-time date to avoid UTC boundary issues
    const [year, month, day] = dateStr.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)

    // ── Step 1: fetch all feedback for the day ────────────────────────────────
    const docs = await fetchFeedbackForDate(localDate)
    const comments = docs.map((d) => d.comment).filter(Boolean)

    if (comments.length === 0) {
      return {
        summary: {
          wentWell: 'No feedback comments were recorded on this date.',
          wentWrong: 'No feedback comments were recorded on this date.',
          recommendation: 'Ensure the feedback form URL is displayed prominently in every session.',
        },
        comments: [],
      }
    }

    // ── Step 2: check for OpenAI key ─────────────────────────────────────────
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
    if (!openaiKey) {
      return {
        summary: null,
        comments,
        missingKey: true,
        error: 'VITE_OPENAI_API_KEY is not set in your .env file.',
      }
    }

    // ── Step 3: call OpenAI ──────────────────────────────────────────────────
    const sample = comments.slice(0, 100) // stay within token budget
    const prompt = `You are an event quality analyst reviewing attendee feedback from a TEDx event on ${dateStr}.

Here are the comments (${sample.length} of ${comments.length} total):
${sample.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

Respond with a JSON object in this exact format — no extra text:
{
  "wentWell": "A concise paragraph summarising what attendees appreciated.",
  "wentWrong": "A concise paragraph summarising complaints or negatives.",
  "recommendation": "One specific, actionable recommendation for the next event."
}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(errBody.error?.message ?? `OpenAI API returned HTTP ${res.status}`)
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices?.[0]?.message?.content ?? ''

    let summary: DayReportResult['summary'] = null
    try {
      summary = JSON.parse(content) as DayReportResult['summary']
    } catch {
      throw new Error('Could not parse the AI response. Please try again.')
    }

    return { summary, comments }
  } catch (err) {
    return {
      summary: null,
      comments: [],
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }
}

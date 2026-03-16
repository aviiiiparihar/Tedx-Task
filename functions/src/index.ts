import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import OpenAI from 'openai'

admin.initializeApp()
const db = admin.firestore()

// ─── Helper: today's date string ──────────────────────────────────────────────
function toDateString(ts: admin.firestore.Timestamp): string {
  return ts.toDate().toISOString().split('T')[0]
}

// ─── FUNCTION 1: onFeedbackCreate ─────────────────────────────────────────────
export const onFeedbackCreate = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(async (snap) => {
    const data = snap.data() as {
      sessionId: string
      rating: number
      comment: string
      createdAt: admin.firestore.Timestamp
    }

    const { sessionId, rating, createdAt } = data
    const dateStr = toDateString(createdAt)
    const isOneStar = rating === 1

    const sessionStatsRef = db.doc(`session_stats/${sessionId}`)
    const eventStatsRef = db.doc('event_stats/main')
    const dailyRef = db.doc(`daily_session_stats/${sessionId}/days/${dateStr}`)

    try {
      await db.runTransaction(async (tx) => {
        const [sessionSnap, eventSnap, dailySnap] = await Promise.all([
          tx.get(sessionStatsRef),
          tx.get(eventStatsRef),
          tx.get(dailyRef),
        ])

        // ── session_stats ──
        if (sessionSnap.exists) {
          const curr = sessionSnap.data() as {
            totalResponses: number
            ratingSum: number
            oneStarCount: number
          }
          const newTotal = curr.totalResponses + 1
          const newSum = curr.ratingSum + rating
          tx.update(sessionStatsRef, {
            totalResponses: newTotal,
            ratingSum: newSum,
            averageRating: newSum / newTotal,
            oneStarCount: isOneStar ? curr.oneStarCount + 1 : curr.oneStarCount,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          })
        } else {
          // Fetch session doc to get stageManagerId
          const sessionDocSnap = await db.doc(`sessions/${sessionId}`).get()
          const sessionDoc = sessionDocSnap.data() as { stageManagerId: string } | undefined
          tx.set(sessionStatsRef, {
            sessionId,
            stageManagerId: sessionDoc?.stageManagerId ?? '',
            totalResponses: 1,
            ratingSum: rating,
            averageRating: rating,
            oneStarCount: isOneStar ? 1 : 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          })
        }

        // ── event_stats/main ──
        if (eventSnap.exists) {
          const curr = eventSnap.data() as {
            totalResponses: number
            ratingSum: number
            oneStarCount: number
          }
          const newTotal = curr.totalResponses + 1
          const newSum = curr.ratingSum + rating
          tx.update(eventStatsRef, {
            totalResponses: newTotal,
            ratingSum: newSum,
            averageRating: newSum / newTotal,
            oneStarCount: isOneStar ? curr.oneStarCount + 1 : curr.oneStarCount,
          })
        } else {
          tx.set(eventStatsRef, {
            totalResponses: 1,
            ratingSum: rating,
            averageRating: rating,
            oneStarCount: isOneStar ? 1 : 0,
          })
        }

        // ── daily_session_stats ──
        if (dailySnap.exists) {
          const curr = dailySnap.data() as {
            totalResponses: number
            ratingSum: number
          }
          const newTotal = curr.totalResponses + 1
          const newSum = curr.ratingSum + rating
          tx.update(dailyRef, {
            totalResponses: newTotal,
            ratingSum: newSum,
            averageRating: newSum / newTotal,
          })
        } else {
          tx.set(dailyRef, {
            date: dateStr,
            totalResponses: 1,
            ratingSum: rating,
            averageRating: rating,
          })
        }
      })
    } catch (err) {
      functions.logger.error('onFeedbackCreate transaction failed', { sessionId, err })
      throw err
    }
  })

// ─── FUNCTION 2: generateDayReport ────────────────────────────────────────────
export const generateDayReport = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { date } = req.body as { date?: string }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid or missing date. Expected format: YYYY-MM-DD' })
      return
    }

    try {
      // Fetch all feedback for the given date
      const [year, month, day] = date.split('-').map(Number)
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

      const snapshot = await db
        .collection('feedback')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .orderBy('createdAt', 'asc')
        .get()

      const comments: string[] = snapshot.docs
        .map((d) => (d.data() as { comment?: string }).comment ?? '')
        .filter(Boolean)

      if (comments.length === 0) {
        res.status(200).json({
          summary: {
            wentWell: 'No feedback was collected on this date.',
            wentWrong: 'No feedback was collected on this date.',
            recommendation: 'Ensure feedback forms are accessible to attendees.',
          },
          comments: [],
        })
        return
      }

      // Build OpenAI prompt
      const openaiKey = functions.config().openai?.key
      if (!openaiKey) {
        functions.logger.warn('OpenAI API key not configured. Set with: firebase functions:config:set openai.key=YOUR_KEY')
        res.status(200).json({
          summary: null,
          comments,
          error: 'AI summary is not available: OpenAI API key not configured.',
        })
        return
      }

      const openai = new OpenAI({ apiKey: openaiKey })

      const sampleComments = comments.slice(0, 150)
      const prompt = `You are an event quality analyst. Here are attendee feedback comments from a TEDx event on ${date}:

${sampleComments.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

Analyze these comments and respond with a JSON object in this exact format:
{
  "wentWell": "A paragraph summarizing what attendees appreciated and what went well.",
  "wentWrong": "A paragraph summarizing issues, frustrations, or negatives mentioned.",
  "recommendation": "One specific, actionable recommendation to improve the next event."
}

Only output valid JSON, no extra text.`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content ?? ''
      let summary: { wentWell: string; wentWrong: string; recommendation: string } | null = null

      try {
        summary = JSON.parse(content)
      } catch {
        functions.logger.error('Failed to parse OpenAI response', { content })
      }

      res.status(200).json({ summary, comments })
    } catch (err) {
      functions.logger.error('generateDayReport failed', err)
      res.status(500).json({
        summary: null,
        comments: [],
        error: err instanceof Error ? err.message : 'Internal server error',
      })
    }
  })

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

// ─── Credentials ───────────────────────────────────────────────────────────────
const DIRECTOR = { email: 'director@tedx.dev', password: 'TEDx@2024!', name: 'Alex Director' }

const MANAGERS = [
  {
    email: 'sam@tedx.dev',
    password: 'TEDx@2024!',
    name: 'Sam Manager',
    stageId: 'stage-a',
    sessionIds: ['session-001', 'session-002', 'session-003', 'session-004'],
  },
  {
    email: 'jordan@tedx.dev',
    password: 'TEDx@2024!',
    name: 'Jordan Manager',
    stageId: 'stage-b',
    sessionIds: ['session-005', 'session-006', 'session-007', 'session-008'],
  },
  {
    email: 'casey@tedx.dev',
    password: 'TEDx@2024!',
    name: 'Casey Manager',
    stageId: 'stage-c',
    sessionIds: ['session-009', 'session-010', 'session-011', 'session-012'],
  },
]

// ─── Session catalogue (12 sessions across 3 stages) ──────────────────────────
const ALL_SESSIONS: Array<{ id: string; title: string; stageId: string; mgrIdx: number }> = [
  // Stage A — Sam
  { id: 'session-001', title: 'The Future of AI',                    stageId: 'stage-a', mgrIdx: 0 },
  { id: 'session-002', title: 'Climate Innovation',                  stageId: 'stage-a', mgrIdx: 0 },
  { id: 'session-003', title: 'Human Connection in a Digital Age',   stageId: 'stage-a', mgrIdx: 0 },
  { id: 'session-004', title: 'The Art of Failure',                  stageId: 'stage-a', mgrIdx: 0 },
  // Stage B — Jordan
  { id: 'session-005', title: 'Design Thinking Revolution',          stageId: 'stage-b', mgrIdx: 1 },
  { id: 'session-006', title: 'The Science of Happiness',            stageId: 'stage-b', mgrIdx: 1 },
  { id: 'session-007', title: 'Rethinking Education',                stageId: 'stage-b', mgrIdx: 1 },
  { id: 'session-008', title: 'Digital Nomad Life',                  stageId: 'stage-b', mgrIdx: 1 },
  // Stage C — Casey
  { id: 'session-009', title: 'The Power of Vulnerability',          stageId: 'stage-c', mgrIdx: 2 },
  { id: 'session-010', title: 'Blockchain for Good',                 stageId: 'stage-c', mgrIdx: 2 },
  { id: 'session-011', title: 'Mental Health at Work',               stageId: 'stage-c', mgrIdx: 2 },
  { id: 'session-012', title: 'Space Exploration Myths',             stageId: 'stage-c', mgrIdx: 2 },
]

// ─── Feedback corpus (62 entries total) ───────────────────────────────────────
const FEEDBACK: Record<string, Array<{ rating: number; comment: string }>> = {
  // ── Stage A ──
  'session-001': [
    { rating: 5, comment: 'Absolutely mind-blowing insights on AI and its societal impact!' },
    { rating: 4, comment: 'Very informative, especially the part about neural networks.' },
    { rating: 5, comment: 'Best session of the day. Speaker was incredibly engaging.' },
    { rating: 3, comment: 'Good content but felt a bit rushed towards the end.' },
    { rating: 4, comment: 'Really made me think about the future differently.' },
    { rating: 5, comment: 'Exceptional presentation — standing ovation well deserved.' },
  ],
  'session-002': [
    { rating: 4, comment: 'Inspiring approach to tackling climate change through innovation.' },
    { rating: 3, comment: 'Interesting, but some claims needed more supporting data.' },
    { rating: 4, comment: 'The real-world case studies were very compelling.' },
    { rating: 2, comment: 'Felt disconnected from practical solutions we can implement today.' },
    { rating: 5, comment: 'Renewed my hope for the planet. Brilliant speaker!' },
  ],
  'session-003': [
    { rating: 5, comment: 'So relevant — we desperately need more genuine human connection.' },
    { rating: 5, comment: 'Moved me to tears. Beautifully delivered message.' },
    { rating: 4, comment: 'Deeply resonant, especially the digital detox segment.' },
    { rating: 5, comment: 'Everyone should hear this. Profound and timely.' },
    { rating: 3, comment: 'Some good points but felt slightly repetitive in the middle.' },
    { rating: 4, comment: 'Warm and authentic. One of my favourites today.' },
  ],
  'session-004': [
    { rating: 2, comment: 'Expected more practical takeaways on bouncing back from failure.' },
    { rating: 3, comment: 'Relatable stories but the overall message was a bit unclear.' },
    { rating: 1, comment: 'Disappointing. Did not deliver on the session description at all.' },
    { rating: 4, comment: 'Honest and vulnerable talk. Really appreciated the authenticity.' },
    { rating: 2, comment: 'Audio issues made it very hard to follow at times.' },
    { rating: 1, comment: 'Too much time on personal anecdotes, not enough actionable advice.' },
  ],
  // ── Stage B ──
  'session-005': [
    { rating: 5, comment: 'Completely changed how I approach problem-solving at work.' },
    { rating: 4, comment: 'Very practical and engaging — felt like an interactive workshop.' },
    { rating: 5, comment: 'The hands-on real-world examples were absolutely brilliant.' },
    { rating: 4, comment: 'Loved the interactive segments. Would love to see more of this!' },
    { rating: 3, comment: 'Good session but assumed too much prior knowledge from the audience.' },
  ],
  'session-006': [
    { rating: 5, comment: 'Left the room genuinely smiling. Incredible research shared.' },
    { rating: 5, comment: 'Best talk of the whole event. Life-changing insights.' },
    { rating: 5, comment: 'I am going to apply these happiness techniques starting today.' },
    { rating: 4, comment: 'Fascinating and evidence-based. Really appreciated the depth.' },
    { rating: 5, comment: 'Standing ovation was fully deserved. Extraordinary speaker.' },
  ],
  'session-007': [
    { rating: 3, comment: 'Interesting perspective on education but lacked concrete proposals.' },
    { rating: 2, comment: 'Too idealistic — needs to account for real resource constraints.' },
    { rating: 4, comment: 'Raised important questions about the future of learning systems.' },
    { rating: 3, comment: 'Some great individual points but the talk felt slightly unstructured.' },
    { rating: 2, comment: 'Did not feel grounded in reality. Good ideas in theory, though.' },
  ],
  'session-008': [
    { rating: 4, comment: 'Super relatable and well-presented. Great storytelling throughout.' },
    { rating: 3, comment: 'Entertaining but felt more like a personal blog than a TEDx talk.' },
    { rating: 4, comment: 'Practical tips on working remotely were genuinely useful.' },
    { rating: 5, comment: 'Gave me the push I needed to make the leap myself. Very inspiring!' },
  ],
  // ── Stage C ──
  'session-009': [
    { rating: 5, comment: 'Brave and deeply moving. Exactly what TEDx is all about.' },
    { rating: 5, comment: 'Brought me to tears. The most authentic talk I have ever witnessed.' },
    { rating: 4, comment: 'Incredibly courageous. Changed my perspective on openness completely.' },
    { rating: 5, comment: 'A masterclass in authentic leadership and genuine communication.' },
    { rating: 4, comment: 'Powerful. The room fell silent — the best possible kind of silence.' },
  ],
  'session-010': [
    { rating: 3, comment: 'Technically strong but very hard to follow without a crypto background.' },
    { rating: 2, comment: 'Too jargon-heavy. Lost most of the audience after five minutes.' },
    { rating: 4, comment: 'The humanitarian aid use cases for blockchain were genuinely interesting.' },
    { rating: 1, comment: 'Completely inaccessible to a general audience. Poor delivery overall.' },
    { rating: 3, comment: 'The ideas were solid but the presentation itself needed a lot more work.' },
  ],
  'session-011': [
    { rating: 5, comment: 'Finally someone speaking openly about this. Hugely important topic.' },
    { rating: 5, comment: 'Vulnerable, evidence-based, and brilliantly presented. Bravo.' },
    { rating: 5, comment: 'My manager was sitting next to me — great conversation started after!' },
    { rating: 4, comment: 'So necessary and delivered with real compassion and care.' },
    { rating: 5, comment: 'Best talk on workplace well-being I have ever had the pleasure of hearing.' },
    { rating: 4, comment: 'Should be mandatory viewing for every HR and leadership team.' },
  ],
  'session-012': [
    { rating: 4, comment: 'Myth-busting science talk. Engaging and very well researched.' },
    { rating: 5, comment: 'Mind blown by how many things I had completely wrong about space!' },
    { rating: 3, comment: 'Good facts but the delivery was a bit flat and dry at times.' },
    { rating: 4, comment: 'Loved the visual aids and the well-timed humour throughout.' },
  ],
}

// ─── Pre-computed session stats ────────────────────────────────────────────────
// (totalResponses, ratingSum, averageRating, oneStarCount derived from FEEDBACK above)
const SESSION_STATS: Record<string, {
  totalResponses: number; ratingSum: number; averageRating: number; oneStarCount: number
}> = {
  'session-001': { totalResponses: 6,  ratingSum: 26, averageRating: 26/6,  oneStarCount: 0 },
  'session-002': { totalResponses: 5,  ratingSum: 18, averageRating: 18/5,  oneStarCount: 0 },
  'session-003': { totalResponses: 6,  ratingSum: 26, averageRating: 26/6,  oneStarCount: 0 },
  'session-004': { totalResponses: 6,  ratingSum: 13, averageRating: 13/6,  oneStarCount: 2 },
  'session-005': { totalResponses: 5,  ratingSum: 21, averageRating: 21/5,  oneStarCount: 0 },
  'session-006': { totalResponses: 5,  ratingSum: 24, averageRating: 24/5,  oneStarCount: 0 },
  'session-007': { totalResponses: 5,  ratingSum: 14, averageRating: 14/5,  oneStarCount: 0 },
  'session-008': { totalResponses: 4,  ratingSum: 16, averageRating: 16/4,  oneStarCount: 0 },
  'session-009': { totalResponses: 5,  ratingSum: 23, averageRating: 23/5,  oneStarCount: 0 },
  'session-010': { totalResponses: 5,  ratingSum: 13, averageRating: 13/5,  oneStarCount: 1 },
  'session-011': { totalResponses: 6,  ratingSum: 28, averageRating: 28/6,  oneStarCount: 0 },
  'session-012': { totalResponses: 4,  ratingSum: 16, averageRating: 16/4,  oneStarCount: 0 },
}
// Event totals: 62 responses, ratingSum 238, avg ≈ 3.84, 3 one-stars

// ─── 14-day daily average trends (used to populate graph) ─────────────────────
const DAILY_AVGS: Record<string, number[]> = {
  'session-001': [3.8, 4.2, 4.0, 4.5, 3.9, 4.1, 4.3, 4.0, 4.5, 4.2, 3.9, 4.4, 4.1, 4.3],
  'session-002': [3.2, 3.5, 3.0, 3.8, 3.4, 3.6, 3.1, 3.7, 3.3, 3.5, 3.6, 3.2, 3.4, 3.7],
  'session-003': [4.3, 4.5, 4.2, 4.4, 4.6, 4.3, 4.5, 4.1, 4.4, 4.3, 4.5, 4.6, 4.2, 4.4],
  'session-004': [2.5, 2.3, 2.8, 2.1, 2.4, 2.6, 2.2, 2.7, 2.3, 2.5, 2.0, 2.4, 2.6, 2.3],
  'session-005': [4.0, 4.2, 4.1, 4.3, 3.9, 4.2, 4.4, 4.1, 4.3, 4.0, 4.2, 4.1, 4.3, 4.2],
  'session-006': [4.6, 4.8, 4.7, 4.9, 4.8, 4.6, 4.9, 4.7, 4.8, 4.6, 4.9, 4.8, 4.7, 4.9],
  'session-007': [2.8, 2.6, 3.0, 2.7, 2.9, 2.5, 2.8, 3.0, 2.7, 2.8, 2.6, 2.9, 2.7, 2.8],
  'session-008': [3.8, 4.0, 3.9, 4.1, 3.8, 4.0, 4.2, 3.9, 4.0, 4.1, 3.9, 4.0, 4.1, 4.0],
  'session-009': [4.5, 4.6, 4.4, 4.7, 4.5, 4.6, 4.8, 4.5, 4.6, 4.4, 4.7, 4.5, 4.6, 4.7],
  'session-010': [2.4, 2.6, 2.8, 2.5, 2.3, 2.7, 2.6, 2.4, 2.8, 2.5, 2.6, 2.3, 2.7, 2.6],
  'session-011': [4.6, 4.8, 4.7, 4.9, 4.6, 4.8, 4.7, 4.9, 4.6, 4.8, 4.7, 4.9, 4.6, 4.8],
  'session-012': [3.8, 4.0, 3.9, 4.1, 4.0, 3.8, 4.2, 4.0, 3.9, 4.1, 4.0, 3.9, 4.1, 4.0],
}
const DAILY_RESPONSES = [4, 6, 3, 5, 4, 7, 3, 5, 4, 6, 5, 3, 4, 6]

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function createOrSignIn(email: string, password: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    return cred.user
  } catch (err: unknown) {
    const fbErr = err as { code?: string }
    if (fbErr.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return cred.user
    }
    throw err
  }
}

function dateStrFromOffset(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

// ─── Seed steps ────────────────────────────────────────────────────────────────
type StepStatus = 'pending' | 'running' | 'done' | 'error'
interface SeedStep { id: string; label: string; status: StepStatus; error?: string }

const INITIAL_STEPS: SeedStep[] = [
  { id: 'mgr1-auth',    label: 'Create Sam (Stage A) account',             status: 'pending' },
  { id: 'mgr2-auth',    label: 'Create Jordan (Stage B) account',          status: 'pending' },
  { id: 'mgr3-auth',    label: 'Create Casey (Stage C) account',           status: 'pending' },
  { id: 'dir-auth',     label: 'Create Event Director account',            status: 'pending' },
  { id: 'dir-profile',  label: 'Set up Event Director profile',            status: 'pending' },
  { id: 'sessions',     label: 'Create 12 sessions across 3 stages',       status: 'pending' },
  { id: 'mgr-profiles', label: 'Set up all 3 Stage Manager profiles',      status: 'pending' },
  { id: 'feedback',     label: 'Write 62 sample feedback comments',        status: 'pending' },
  { id: 'stats',        label: 'Initialise session statistics (12)',        status: 'pending' },
  { id: 'event-stats',  label: 'Initialise event-level statistics',        status: 'pending' },
  { id: 'daily',        label: 'Write 14-day historical graph data',       status: 'pending' },
]

// ─── Component ─────────────────────────────────────────────────────────────────
export function DevSeedPage() {
  const [steps, setSteps] = useState<SeedStep[]>(INITIAL_STEPS)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  function setStep(id: string, patch: Partial<SeedStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function runSeed() {
    setRunning(true)
    setDone(false)
    setSteps(INITIAL_STEPS)

    const mgrUids: string[] = []

    try {
      // ── 1-3. Create all 3 manager accounts ────────────────────────────────
      const mgrStepIds = ['mgr1-auth', 'mgr2-auth', 'mgr3-auth'] as const
      for (let i = 0; i < MANAGERS.length; i++) {
        setStep(mgrStepIds[i], { status: 'running' })
        const user = await createOrSignIn(MANAGERS[i].email, MANAGERS[i].password)
        mgrUids.push(user.uid)
        await firebaseSignOut(auth)
        setStep(mgrStepIds[i], { status: 'done' })
      }

      // ── 4. Create Event Director account ──────────────────────────────────
      setStep('dir-auth', { status: 'running' })
      await createOrSignIn(DIRECTOR.email, DIRECTOR.password)
      // stays signed in as director
      setStep('dir-auth', { status: 'done' })

      // ── 5. Write Director Firestore profile ───────────────────────────────
      setStep('dir-profile', { status: 'running' })
      const directorUid = auth.currentUser!.uid
      await setDoc(doc(db, 'users', directorUid), {
        name: DIRECTOR.name,
        role: 'event_director',
      })
      setStep('dir-profile', { status: 'done' })

      // ── 6. Write all 12 sessions ──────────────────────────────────────────
      setStep('sessions', { status: 'running' })
      for (const s of ALL_SESSIONS) {
        const startHour = 9 + (ALL_SESSIONS.indexOf(s) % 4) * 2
        const start = new Date()
        start.setHours(startHour, 0, 0, 0)
        const end = new Date(start)
        end.setHours(end.getHours() + 1, 30)
        await setDoc(doc(db, 'sessions', s.id), {
          title: s.title,
          stageId: s.stageId,
          stageManagerId: mgrUids[s.mgrIdx],
          startTime: Timestamp.fromDate(start),
          endTime: Timestamp.fromDate(end),
        })
      }
      setStep('sessions', { status: 'done' })

      // Sign out director to sign in as each manager for their profiles
      await firebaseSignOut(auth)

      // ── 7. Write all 3 manager profiles ───────────────────────────────────
      setStep('mgr-profiles', { status: 'running' })
      for (let i = 0; i < MANAGERS.length; i++) {
        const mgr = MANAGERS[i]
        await signInWithEmailAndPassword(auth, mgr.email, mgr.password)
        await setDoc(doc(db, 'users', mgrUids[i]), {
          name: mgr.name,
          role: 'stage_manager',
          stageId: mgr.stageId,
          sessions: mgr.sessionIds,
        })
        await firebaseSignOut(auth)
      }
      setStep('mgr-profiles', { status: 'done' })

      // ── 8. Write all feedback (public — no auth required) ─────────────────
      setStep('feedback', { status: 'running' })
      for (const [sessionId, entries] of Object.entries(FEEDBACK)) {
        for (const entry of entries) {
          await addDoc(collection(db, 'feedback'), {
            sessionId,
            rating: entry.rating,
            comment: entry.comment,
            createdAt: Timestamp.now(),
          })
        }
      }
      setStep('feedback', { status: 'done' })

      // Sign back in as director to write stats
      await signInWithEmailAndPassword(auth, DIRECTOR.email, DIRECTOR.password)

      // ── 9. Write session stats ─────────────────────────────────────────────
      setStep('stats', { status: 'running' })
      for (const s of ALL_SESSIONS) {
        const st = SESSION_STATS[s.id]
        await setDoc(doc(db, 'session_stats', s.id), {
          sessionId: s.id,
          stageManagerId: mgrUids[s.mgrIdx],
          totalResponses: st.totalResponses,
          ratingSum: st.ratingSum,
          averageRating: st.averageRating,
          oneStarCount: st.oneStarCount,
          lastUpdated: Timestamp.now(),
        })
      }
      setStep('stats', { status: 'done' })

      // ── 10. Write event stats ─────────────────────────────────────────────
      setStep('event-stats', { status: 'running' })
      const totalResp  = Object.values(SESSION_STATS).reduce((a, s) => a + s.totalResponses, 0)
      const totalSum   = Object.values(SESSION_STATS).reduce((a, s) => a + s.ratingSum, 0)
      const totalStars = Object.values(SESSION_STATS).reduce((a, s) => a + s.oneStarCount, 0)
      await setDoc(doc(db, 'event_stats', 'main'), {
        totalResponses: totalResp,
        ratingSum: totalSum,
        averageRating: totalSum / totalResp,
        oneStarCount: totalStars,
      })
      setStep('event-stats', { status: 'done' })

      // ── 11. Write 14-day historical data ──────────────────────────────────
      setStep('daily', { status: 'running' })
      for (const s of ALL_SESSIONS) {
        const avgs = DAILY_AVGS[s.id]
        for (let i = 0; i < 14; i++) {
          const dateStr = dateStrFromOffset(13 - i)
          const avg = avgs[i]
          const resp = DAILY_RESPONSES[i]
          await setDoc(doc(db, 'daily_session_stats', s.id, 'days', dateStr), {
            date: dateStr,
            totalResponses: resp,
            ratingSum: Math.round(avg * resp),
            averageRating: avg,
          })
        }
      }
      setStep('daily', { status: 'done' })

      await firebaseSignOut(auth)
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSteps((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'error', error: msg } : s)),
      )
    } finally {
      setRunning(false)
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  const statusIcon = (s: StepStatus) => {
    if (s === 'done')    return <span className="text-green-400 font-bold">✓</span>
    if (s === 'error')   return <span className="text-red-400 font-bold">✗</span>
    if (s === 'running') return (
      <svg className="animate-spin w-4 h-4 text-tedx-red" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
    return <span className="text-gray-600">○</span>
  }

  const stageColors = ['text-blue-400 border-blue-500/30 bg-blue-500/5',
                       'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
                       'text-purple-400 border-purple-500/30 bg-purple-500/5']

  return (
    <div className="min-h-screen bg-tedx-dark px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full mb-4">
            <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">Dev Only</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Seed Demo Data</h1>
          <p className="text-gray-400 text-sm mt-1">
            Creates 4 accounts (1 Director + 3 Stage Managers) with 12 sessions, 62 feedback entries, and 14 days of graph history.
          </p>
        </div>

        {/* Warning */}
        <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
          <strong className="block mb-1">Before running:</strong>
          Deploy the updated Firestore security rules so the seed can write to all collections:
          <code className="block mt-1.5 px-2 py-1 bg-black/30 rounded text-xs font-mono text-yellow-200">
            firebase deploy --only firestore:rules
          </code>
        </div>

        {/* Step list */}
        <div className="card space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5 w-5 flex items-center justify-center shrink-0 text-sm">
                {statusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${
                  step.status === 'done'    ? 'text-gray-500 line-through' :
                  step.status === 'error'   ? 'text-red-400' :
                  step.status === 'running' ? 'text-white font-medium' :
                  'text-gray-300'
                }`}>
                  {step.label}
                </p>
                {step.error && (
                  <p className="text-xs text-red-400 mt-0.5 break-words">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Run / Retry button */}
        {!done && (
          <button onClick={runSeed} disabled={running} className="btn-primary w-full">
            {running ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Seeding…
              </span>
            ) : steps.some((s) => s.status === 'error') ? 'Retry Seed' : 'Run Seed'}
          </button>
        )}

        {/* ── Credentials (shown after success) ── */}
        {done && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">All done! Use any credential below to log in.</span>
            </div>

            {/* Director */}
            <div className="card border-red-500/30 bg-red-500/5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-tedx-red">
                Event Director — sees all sessions &amp; AI report
              </span>
              <CredRow label="Email"    value={DIRECTOR.email}    copied={copied} onCopy={copyText} />
              <CredRow label="Password" value={DIRECTOR.password} copied={copied} onCopy={copyText} />
              <Link to="/login" className="btn-primary block text-center text-sm py-2">
                Log in as Director →
              </Link>
            </div>

            {/* Stage Managers */}
            {MANAGERS.map((mgr, i) => (
              <div key={mgr.email} className={`card border space-y-3 ${stageColors[i]}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${stageColors[i].split(' ')[0]}`}>
                    Stage Manager — {mgr.stageId.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{mgr.name}</span>
                </div>
                <CredRow label="Email"    value={mgr.email}    copied={copied} onCopy={copyText} />
                <CredRow label="Password" value={mgr.password} copied={copied} onCopy={copyText} />
                <div className="text-xs text-gray-500 flex flex-wrap gap-1.5 pt-0.5">
                  {mgr.sessionIds.map((id) => (
                    <span key={id} className="px-2 py-0.5 bg-black/20 rounded-full font-mono">{id}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="card text-sm text-gray-400 space-y-1.5">
              <p className="text-white font-medium text-xs uppercase tracking-wide mb-2">What was seeded</p>
              <p>• 3 stages (A, B, C) × 4 sessions each = <strong className="text-white">12 sessions</strong></p>
              <p>• <strong className="text-white">62 feedback comments</strong> with realistic ratings</p>
              <p>• Sessions with LOW warnings: <strong className="text-red-400">session-004</strong> (avg 2.2) and <strong className="text-red-400">session-007</strong> (avg 2.8) and <strong className="text-red-400">session-010</strong> (avg 2.6)</p>
              <p>• <strong className="text-white">3 one-star ratings</strong> visible in Director dashboard</p>
              <p>• <strong className="text-white">14 days</strong> of daily stats for the historical graph</p>
              <div className="pt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                {['session-001','session-005','session-009'].map(id => (
                  <Link key={id} to={`/feedback?session=${id}`} className="text-tedx-red hover:underline">
                    /feedback?session={id}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-700">
          Remove the <code className="text-gray-600">/dev-seed</code> route before deploying to production.
        </p>
      </div>
    </div>
  )
}

// ─── CredRow helper ────────────────────────────────────────────────────────────
function CredRow({
  label, value, copied, onCopy,
}: {
  label: string; value: string; copied: string | null; onCopy: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <code className="flex-1 text-sm text-white bg-tedx-dark rounded px-2 py-1 font-mono truncate">
        {value}
      </code>
      <button
        onClick={() => onCopy(value)}
        className="shrink-0 text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300"
      >
        {copied === value ? '✓' : 'Copy'}
      </button>
    </div>
  )
}

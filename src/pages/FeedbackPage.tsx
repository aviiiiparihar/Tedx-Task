import { useSearchParams } from 'react-router-dom'
import { FeedbackForm } from '../components/FeedbackForm'

export function FeedbackPage() {
  const [params] = useSearchParams()
  const sessionId = params.get('session') ?? undefined

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-tedx-red flex items-center justify-center">
              <span className="text-sm font-black text-white">TEDx</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Session Feedback</h1>
          <p className="text-gray-400 mt-2">
            Help us improve by sharing your experience
          </p>
          {sessionId && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-tedx-gray rounded-full border border-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-gray-300">
                Session: <strong className="text-white">{sessionId}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <FeedbackForm sessionId={sessionId} />
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Your feedback is anonymous and helps us deliver better events.
        </p>
      </div>
    </div>
  )
}

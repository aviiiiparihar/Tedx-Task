import { useState } from 'react'
import { submitFeedback } from '../services/feedbackService'

interface FeedbackFormProps {
  sessionId?: string
}

export function FeedbackForm({ sessionId: prefilledSession }: FeedbackFormProps) {
  const [sessionId, setSessionId] = useState(prefilledSession ?? '')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId.trim()) { setError('Session ID is required.'); return }
    if (rating === 0) { setError('Please select a rating.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await submitFeedback({ sessionId: sessionId.trim(), rating, comment: comment.trim() })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Thank you!</h2>
          <p className="text-gray-400 mt-1">Your feedback has been submitted.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Session ID */}
      {!prefilledSession && (
        <div>
          <label className="label">Session ID</label>
          <input
            className="input"
            placeholder="e.g. session-001"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={submitting}
          />
        </div>
      )}

      {/* Star rating */}
      <div>
        <label className="label">Your Rating</label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              disabled={submitting}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <svg
                className={`w-9 h-9 transition-colors duration-100 ${
                  star <= (hovered || rating) ? 'text-tedx-red' : 'text-gray-600'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label className="label">Comment <span className="text-gray-600">(optional)</span></label>
        <textarea
          className="input resize-none"
          rows={4}
          placeholder="Share your thoughts about the session..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
          maxLength={1000}
        />
        <p className="text-xs text-gray-600 mt-1 text-right">{comment.length}/1000</p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </span>
        ) : (
          'Submit Feedback'
        )}
      </button>
    </form>
  )
}

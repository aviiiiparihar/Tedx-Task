interface RatingIndicatorProps {
  rating: number | null
  showWarning?: boolean
}

export function RatingIndicator({ rating, showWarning }: RatingIndicatorProps) {
  if (rating === null) {
    return <span className="text-gray-500 text-sm">No data</span>
  }

  const color =
    rating >= 4
      ? 'text-green-400'
      : rating >= 3
        ? 'text-yellow-400'
        : 'text-red-400'

  const bgColor =
    rating >= 4
      ? 'bg-green-400/10 border-green-400/30'
      : rating >= 3
        ? 'bg-yellow-400/10 border-yellow-400/30'
        : 'bg-red-400/10 border-red-400/30'

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bgColor}`}>
      <span className={`text-xl font-bold ${color}`}>{rating.toFixed(2)}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? color : 'text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {showWarning && rating < 3 && (
        <span className="text-red-400 text-xs font-semibold animate-pulse">⚠ LOW</span>
      )}
    </div>
  )
}

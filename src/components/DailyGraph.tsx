import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { fetchDailyStatsForSession, type DailySessionStat } from '../services/statsService'
import { formatDate } from '../utils/dateUtils'
import type { SessionDoc } from '../services/statsService'

interface DailyGraphProps {
  sessions: SessionDoc[]
}

interface ChartEntry {
  date: string
  displayDate: string
  [sessionTitle: string]: number | string
}

const COLORS = ['#E62B1E', '#3B82F6', '#10B981', '#F59E0B']

export function DailyGraph({ sessions }: DailyGraphProps) {
  const [chartData, setChartData] = useState<ChartEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessions.length === 0) return
    setLoading(true)

    const fetchAll = sessions.map((s) => fetchDailyStatsForSession(s.id, 365))

    Promise.all(fetchAll)
      .then((allStats) => {
        const dateMap = new Map<string, ChartEntry>()

        allStats.forEach((stats: DailySessionStat[], idx: number) => {
          const session = sessions[idx]
          stats.forEach((day) => {
            if (!dateMap.has(day.date)) {
              dateMap.set(day.date, { date: day.date, displayDate: formatDate(day.date) })
            }
            const entry = dateMap.get(day.date)!
            entry[session.title] = day.averageRating
          })
        })

        const sorted = Array.from(dateMap.values()).sort((a, b) =>
          a.date < b.date ? -1 : 1,
        )
        setChartData(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessions])

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Daily Average Rating (365 days)
        </h3>
        <div className="h-64 bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Daily Average Rating (365 days)
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-600 text-sm italic">No historical data available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Daily Average Rating (365 days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#2D2D2D', border: '1px solid #444', borderRadius: 8 }}
            labelStyle={{ color: '#E5E7EB', fontWeight: 600 }}
            itemStyle={{ color: '#D1D5DB' }}
          />
          <Legend
            wrapperStyle={{ color: '#9CA3AF', fontSize: 12, paddingTop: 12 }}
          />
          <ReferenceLine y={3} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.5} />
          {sessions.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.title}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 mt-2 text-center">
        Red dashed line = warning threshold (3.0)
      </p>
    </div>
  )
}

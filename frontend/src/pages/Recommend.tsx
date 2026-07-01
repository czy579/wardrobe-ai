import { useState, useEffect } from 'react'
import { getRecommendations } from '../api'
import type { Recommendation } from '../api'
import OutfitCard from '../components/OutfitCard'
import { bgStyle } from '../api/bg'

const WEATHER_OPTIONS = [
  { value: 'hot', label: '☀️ 炎热' },
  { value: 'normal', label: '🌤️ 适中' },
  { value: 'cold', label: '❄️ 寒冷' },
]

const STYLE_OPTIONS = [
  { value: 'casual', label: '😎 休闲' },
  { value: 'formal', label: '👔 正式' },
]

export default function Recommend() {
  const [weather, setWeather] = useState('normal')
  const [style, setStyle] = useState('casual')
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  async function fetchRecs() {
    setLoading(true)
    setFetched(true)
    try {
      const data = await getRecommendations(weather, style)
      setRecs(data)
    } catch (err) {
      console.error('Failed to get recommendations', err)
      setRecs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fetched) fetchRecs()
  }, [weather, style])

  return (
    <div>
      <div className="fixed inset-x-0 top-14 bottom-0 -z-10" style={bgStyle('recommend')} />
      <div className="relative p-6 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">AI 智能推荐</h1>

      <div className="bg-white rounded-xl border p-4 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">天气</label>
          <div className="flex gap-2">
            {WEATHER_OPTIONS.map(w => (
              <button
                key={w.value}
                onClick={() => setWeather(w.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                   weather === w.value ? 'bg-amber-700/60 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">风格</label>
          <div className="flex gap-2">
            {STYLE_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                   style === s.value ? 'bg-amber-700/60 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchRecs}
          disabled={loading}
          className="w-full py-2 bg-amber-700/60 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? '生成中...' : '获取推荐'}
        </button>
      </div>

      <div className="space-y-4">
        {fetched && !loading && recs.length === 0 && (
          <p className="text-center py-10 text-gray-400">
            没有找到匹配的搭配，请先上传更多衣服！
          </p>
        )}
        {recs.map((rec, idx) => (
          <OutfitCard
            key={rec.id}
            comboId={rec.id}
            items={rec.items}
            label={`推荐方案 #${idx + 1}（${rec.total_items} 件）`}
          />
        ))}
      </div>
      </div>
    </div>
  )
}

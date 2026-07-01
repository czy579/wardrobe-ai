import { useState, useEffect } from 'react'
import { getTags } from '../api'
import type { TagDef } from '../api'

interface Filters {
  keyword: string
  fit: string
  style_tags: string[]
  color_tone: string
  user_tags: string[]
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

const FIT_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'loose', label: '宽松' },
  { value: 'regular', label: '合身' },
  { value: 'slim', label: '紧身' },
  { value: 'oversized', label: 'Oversize' },
]

const COLOR_TONE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'neutral', label: '黑白灰' },
  { value: 'cool', label: '冷色系' },
  { value: 'warm', label: '暖色系' },
  { value: 'earth', label: '大地色系' },
  { value: 'colorful', label: '彩色系' },
]

const STYLE_CHIP_OPTIONS = ['casual', 'formal', 'street', 'sport', 'minimal', 'retro']
const STYLE_CHIP_LABELS: Record<string, string> = {
  casual: '休闲',
  formal: '正式',
  street: '街头',
  sport: '运动',
  minimal: '极简',
  retro: '复古',
}

export default function FilterPanel({ filters, onChange }: Props) {
  const [tagDefs, setTagDefs] = useState<TagDef[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getTags().then(setTagDefs).catch(() => {})
  }, [])

  function toggleStyle(tag: string) {
    const next = filters.style_tags.includes(tag)
      ? filters.style_tags.filter(t => t !== tag)
      : [...filters.style_tags, tag]
    onChange({ ...filters, style_tags: next })
  }

  function toggleUserTag(tag: string) {
    const next = filters.user_tags.includes(tag)
      ? filters.user_tags.filter(t => t !== tag)
      : [...filters.user_tags, tag]
    onChange({ ...filters, user_tags: next })
  }

  return (
    <div className="bg-white/60 rounded-xl border p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">高级筛选</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-700 hover:text-amber-800"
        >
          {expanded ? '收起' : '展开'}
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="🔍 搜索：宽松牛仔裤、黑色街头风..."
          value={filters.keyword}
          onChange={e => onChange({ ...filters, keyword: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg text-sm"
        />
      </div>

      {expanded && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">版型</label>
            <div className="flex gap-1.5 flex-wrap">
              {FIT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => onChange({ ...filters, fit: o.value })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.fit === o.value
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">风格</label>
            <div className="flex gap-1.5 flex-wrap">
              {STYLE_CHIP_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleStyle(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.style_tags.includes(s)
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {STYLE_CHIP_LABELS[s] || s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">色系</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_TONE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => onChange({ ...filters, color_tone: o.value })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.color_tone === o.value
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {tagDefs.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">自定义标签</label>
              <div className="flex gap-1.5 flex-wrap">
                {tagDefs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleUserTag(t.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.user_tags.includes(t.name)
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export type { Filters }

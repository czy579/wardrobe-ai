import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOutfitsV2, deleteOutfitV2 } from '../api'
import { BASE_URL } from '../api/config'
import { bgStyle } from '../api/bg'
import type { OutfitDetail } from '../api'

export default function Outfits() {
  const navigate = useNavigate()
  const [outfits, setOutfits] = useState<OutfitDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getOutfitsV2()
      setOutfits(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确认删除此搭配？')) return
    try {
      await deleteOutfitV2(id)
      setOutfits(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      console.error(err)
      alert('删除失败')
    }
  }

  return (
    <div>
      <div className="fixed inset-x-0 top-14 bottom-0 -z-10" style={bgStyle('outfits')} />
      <div className="relative p-6 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">我的搭配</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/try-on')}
            className="px-4 py-2 bg-amber-700/60 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
          >
            试衣间
          </button>
          <button onClick={() => navigate('/outfit-builder')}
            className="px-4 py-2 bg-amber-700/60 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
          >
            新建搭配
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">还没有保存的搭配</p>
          <button onClick={() => navigate('/outfit-builder')}
            className="px-6 py-2 bg-amber-700/60 text-white rounded-lg text-sm"
          >
            创建第一个搭配
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map(o => (
            <div key={o.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{o.name || `搭配 #${o.id}`}</h3>
                <p className="text-[10px] text-gray-400 mb-3">{new Date(o.created_at).toLocaleString('zh-CN')}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {o.items.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="w-14 h-14 bg-gray-50 rounded-lg border overflow-hidden flex items-center justify-center">
                      <img
                        src={`${BASE_URL}/${item.clothing?.processed_image_url || item.clothing?.image_url || ''}`}
                        className="max-w-full max-h-full object-contain p-1"
                      />
                    </div>
                  ))}
                  {o.items.length > 6 && (
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
                      +{o.items.length - 6}
                    </div>
                  )}
                </div>

                {o.tags && (o.tags.style_tags.length > 0 || o.tags.color_tones.length > 0) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {o.tags.style_tags.slice(0, 4).map(t => (
                      <span key={t} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                    {o.tags.color_tones.slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => navigate(`/outfit-builder/${o.id}`)}
                    className="flex-1 py-1.5 border rounded-lg text-xs text-gray-600/60 hover:bg-gray-50/60"
                  >
                    编辑
                  </button>
                  <button onClick={() => handleDelete(o.id)}
                    className="py-1.5 px-3 border rounded-lg text-xs text-red-500/60 hover:bg-red-50/60"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}

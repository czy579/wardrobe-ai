import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadModal from '../components/UploadModal'
import { BASE_URL } from '../api/config'
import { bgStyle } from '../api/bg'

interface ClothingItem {
  id: number
  image_url: string
  processed_image_url: string | null
  category: string
  sub_category: string | null
}

export default function Home() {
  const nickname = localStorage.getItem('wardrobe_nickname') || ''
  const [showUpload, setShowUpload] = useState(false)
  const [refined, setRefined] = useState<ClothingItem[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${BASE_URL}/api/wardrobe?limit=20`)
      .then(r => r.json())
      .then((items: ClothingItem[]) => setRefined(items.filter(i => i.processed_image_url)))
      .catch(() => {})
  }, [])

  return (
    <div>
      <div className="fixed inset-x-0 top-14 bottom-0 -z-10" style={bgStyle('home')} />
      <div className="relative flex flex-col items-center gap-8 py-12 min-h-screen">
        <div className="text-center mt-8">
          <h1 className="text-5xl font-black drop-shadow-lg mb-4">{nickname ? <><span className="text-blue-600">{nickname}</span><span className="text-amber-900"> 的自由衣橱</span></> : <span className="text-amber-900">AI 虚拟衣橱</span>}</h1>
        <p className="text-white/80 drop-shadow text-lg">上传衣服，获取智能穿搭推荐</p>
      </div>

      {refined.length > 0 && (
        <div className="relative w-full max-w-2xl">
          <h2 className="text-base font-medium text-white drop-shadow mb-3">已抠图卡片</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {refined.slice(0, 8).map(item => (
              <div
                key={item.id}
                className="flex-shrink-0 w-40 h-40 rounded-xl border-2 border-black shadow-lg bg-white/60 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                onClick={() => navigate('/wardrobe')}
              >
                <img
                  src={`${BASE_URL}${item.processed_image_url}`}
                  alt={item.category}
                  className="w-full h-full object-contain p-2"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
        <button
          onClick={() => setShowUpload(true)}
          className="flex flex-col items-center gap-2 p-6 bg-white/30 backdrop-blur rounded-2xl shadow-lg border border-white/30 hover:bg-white/80 hover:scale-105 transition-all"
        >
          <span className="font-bold text-xl">上传衣服</span>
          <span className="text-base text-gray-500">添加新衣物到衣橱</span>
        </button>

        <button
          onClick={() => navigate('/wardrobe')}
          className="flex flex-col items-center gap-2 p-6 bg-white/30 backdrop-blur rounded-2xl shadow-lg border border-white/30 hover:bg-white/80 hover:scale-105 transition-all"
        >
          <span className="font-bold text-xl">我的衣橱</span>
          <span className="text-base text-gray-500">浏览所有衣物</span>
        </button>

        <button
          onClick={() => navigate('/recommend')}
          className="flex flex-col items-center gap-2 p-6 bg-white/30 backdrop-blur rounded-2xl shadow-lg border border-white/30 hover:bg-white/80 hover:scale-105 transition-all"
        >
          <span className="font-bold text-xl">智能推荐</span>
          <span className="text-base text-gray-500">AI 穿搭建议</span>
        </button>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => navigate('/wardrobe')}
        />
      )}
      </div>
    </div>
  )
}

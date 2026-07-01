import type { ClothingItem } from '../api'
import { BASE_URL } from '../api/config'

interface Props {
  comboId: number
  items: ClothingItem[]
  label?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  tops: '👕 上衣',
  bottoms: '👖 下装',
  shoes: '👟 鞋子',
  outerwear: '🧥 外套',
  accessories: '💍 配饰',
}

export default function OutfitCard({ comboId, items, label }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      {label && <h3 className="font-semibold text-gray-800 mb-3">{label}</h3>}
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-1">
            <div className="w-20 h-20 bg-gray-50 rounded-lg border flex items-center justify-center p-2">
              <img
                src={`${BASE_URL}/${item.processed_image_url || item.image_url}`}
                alt={item.category}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <span className="text-[10px] text-gray-500">{CATEGORY_LABELS[item.category] || item.category}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

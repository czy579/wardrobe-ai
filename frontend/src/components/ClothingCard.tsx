import type { ClothingItem } from '../api'
import { BASE_URL } from '../api/config'

interface Props {
  item: ClothingItem
  selected?: boolean
  onToggle?: (id: number) => void
  showSelect?: boolean
  onEdit?: (item: ClothingItem) => void
  onRefine?: (item: ClothingItem) => void
  onDelete?: (item: ClothingItem) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  tops: '上衣',
  bottoms: '下装',
  shoes: '鞋子',
  outerwear: '外套',
  accessories: '配饰',
  other: '其他',
}

const CATEGORY_COLORS: Record<string, string> = {
  tops: 'bg-blue-100 text-blue-700',
  bottoms: 'bg-green-100 text-green-700',
  shoes: 'bg-amber-100 text-amber-700',
  outerwear: 'bg-amber-100 text-amber-700',
  accessories: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
}

const FIT_LABELS: Record<string, string> = {
  loose: '宽松',
  regular: '合身',
  slim: '紧身',
  oversized: 'Oversize',
}

export default function ClothingCard({ item, selected, onToggle, showSelect, onEdit, onRefine, onDelete }: Props) {
  return (
    <div
      className={`relative bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${
        selected ? 'border-amber-700 ring-2 ring-amber-200' : 'border-transparent'
      }`}
    >
      {showSelect && onToggle && (
        <button
          onClick={() => onToggle(item.id)}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-sm font-bold transition-colors ${
            selected
              ? 'bg-amber-700 border-amber-700'
              : 'bg-white/80 border-gray-300 hover:border-amber-400'
          }`}
        >
          {selected ? '✓' : ''}
        </button>
      )}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="w-7 h-7 rounded-full bg-white/80 border border-gray-300 flex items-center justify-center text-xs text-gray-500 hover:bg-white hover:text-amber-700 transition-colors"
            title="编辑标签"
          >
            ✎
          </button>
        )}
        {onRefine && (
          <button
            onClick={() => onRefine(item)}
            className="w-7 h-7 rounded-full bg-white/80 border border-gray-300 flex items-center justify-center text-xs text-gray-500 hover:bg-white hover:text-green-600 transition-colors"
            title="手动抠图"
          >
            ✂
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(item)}
            className="w-7 h-7 rounded-full bg-white/80 border border-gray-300 flex items-center justify-center text-xs text-gray-500 hover:bg-white hover:text-red-600 transition-colors"
            title="删除"
          >
            ✕
          </button>
        )}
      </div>
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-1">
        <img
          src={`${BASE_URL}/${item.processed_image_url || item.image_url}`}
          alt={item.category}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>
            {CATEGORY_LABELS[item.category] || item.category}
          </span>
          {item.fit && item.fit !== 'regular' && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {FIT_LABELS[item.fit] || item.fit}
            </span>
          )}
        </div>
        {item.sub_category && (
          <div className="text-[11px] text-gray-400">{item.sub_category}</div>
        )}
        {(item.style_tags?.length > 0 || item.user_tags?.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {item.style_tags?.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
            {item.user_tags?.slice(0, 1).map(t => (
              <span key={t} className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
            {((item.style_tags?.length ?? 0) + (item.user_tags?.length ?? 0)) > 3 && (
              <span className="text-[10px] text-gray-400">+{(item.style_tags?.length ?? 0) + (item.user_tags?.length ?? 0) - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

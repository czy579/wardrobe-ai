import { useState, useEffect, useCallback } from 'react'
import { getWardrobe, searchClothing } from '../api'
import { deleteClothing } from '../api'
import type { ClothingItem } from '../api'
import ClothingCard from '../components/ClothingCard'
import UploadModal from '../components/UploadModal'
import FilterPanel from '../components/FilterPanel'
import EditClothingModal from '../components/EditClothingModal'
import RefineEditor from '../components/RefineEditor'
import type { Filters } from '../components/FilterPanel'
import { bgStyle } from '../api/bg'

const CATEGORY_TABS = [
  { key: 'all', label: '全部' },
  { key: 'tops', label: '上衣' },
  { key: 'bottoms', label: '下装' },
  { key: 'shoes', label: '鞋子' },
  { key: 'outerwear', label: '外套' },
  { key: 'accessories', label: '配饰' },
]

const defaultFilters: Filters = {
  keyword: '',
  fit: '',
  style_tags: [],
  color_tone: '',
  user_tags: [],
}

export default function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [category, setCategory] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [editItem, setEditItem] = useState<ClothingItem | null>(null)
  const [refineItem, setRefineItem] = useState<ClothingItem | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const hasFilters = filters.keyword || filters.fit || filters.style_tags.length > 0 || filters.color_tone || filters.user_tags.length > 0
      if (hasFilters) {
        const data = await searchClothing({
          keyword: filters.keyword || undefined,
          category: category === 'all' ? undefined : category,
          fit: filters.fit || undefined,
          style_tags: filters.style_tags.length > 0 ? JSON.stringify(filters.style_tags) : undefined,
          color_tone: filters.color_tone || undefined,
          user_tags: filters.user_tags.length > 0 ? JSON.stringify(filters.user_tags) : undefined,
        })
        setItems(data)
      } else {
        const data = await getWardrobe(category === 'all' ? undefined : category)
        setItems(data)
      }
    } catch (err) {
      console.error('Failed to load wardrobe', err)
    } finally {
      setLoading(false)
    }
  }, [category, filters])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  function handleEditSaved(updated: ClothingItem) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function handleRefineSaved(updated: ClothingItem) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function handleDelete(item: ClothingItem) {
    const ok = window.confirm(`确认删除这件${item.sub_category || item.category}？`)
    if (!ok) return
    deleteClothing(item.id).then(() => {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }).catch(err => {
      console.error('Delete failed', err)
      alert('删除失败，请检查后端是否运行')
    })
  }

  return (
    <div>
      <div className="fixed inset-x-0 top-14 bottom-0 -z-10" style={bgStyle('wardrobe')} />
      <div className="relative p-6 min-h-screen">
        <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-800">我的衣橱</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-amber-700/60 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          + 上传
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CATEGORY_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setCategory(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === t.key
                ? 'bg-amber-700/60 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterPanel filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">
            {filters.keyword || filters.fit || filters.style_tags.length > 0 || filters.color_tone || filters.user_tags.length > 0
              ? '没有匹配的衣物，试试其他筛选条件'
              : '还没有衣服，上传第一件吧！'}
          </p>
          {!filters.keyword && !filters.fit && filters.style_tags.length === 0 && !filters.color_tone && filters.user_tags.length === 0 && (
            <button onClick={() => setShowUpload(true)} className="px-6 py-2 bg-amber-700/60 text-white rounded-lg text-sm">
              立即上传
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">共 {items.length} 件</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map(item => (
              <ClothingCard
                key={item.id}
                item={item}
                onEdit={setEditItem}
                onRefine={setRefineItem}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={fetchItems}
        />
      )}

      {editItem && (
        <EditClothingModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleEditSaved}
        />
      )}
      {refineItem && (
        <RefineEditor
          item={refineItem}
          onClose={() => setRefineItem(null)}
          onSaved={handleRefineSaved}
        />
      )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { getWardrobe, getOutfits, createOutfit } from '../api'
import { BASE_URL } from '../api/config'
import type { ClothingItem, OutfitItem } from '../api'
import ClothingCard from '../components/ClothingCard'
import OutfitCard from '../components/OutfitCard'

export default function Outfit() {
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([])
  const [outfits, setOutfits] = useState<OutfitItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [name, setName] = useState('')
  const [tab, setTab] = useState<'create' | 'saved'>('saved')

  useEffect(() => {
    getWardrobe().then(setWardrobe).catch(console.error)
    getOutfits().then(setOutfits).catch(console.error)
  }, [])

  function toggleItem(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (selected.size < 2) {
      alert('请至少选择 2 件衣服')
      return
    }
    try {
      await createOutfit(Array.from(selected), name)
      setSelected(new Set())
      setName('')
      const updated = await getOutfits()
      setOutfits(updated)
      setTab('saved')
    } catch (err) {
      console.error('Save outfit failed', err)
      alert('保存搭配失败')
    }
  }

  const selectedItems = wardrobe.filter(i => selected.has(i.id))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">穿搭搭配</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('saved')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === 'saved' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          已保存
        </button>
        <button
          onClick={() => setTab('create')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === 'create' ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          创建搭配
        </button>
      </div>

      {tab === 'create' && (
        <div className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="搭配名称（可选）"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm mb-4"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {wardrobe.map(item => (
                <ClothingCard
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggle={toggleItem}
                  showSelect
                />
              ))}
            </div>
          </div>

          {selectedItems.length >= 2 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 mb-3">
                预览（{selectedItems.length} 件）
              </h3>
              <div className="flex flex-wrap gap-3 mb-4">
                {selectedItems.map(item => (
                  <div key={item.id} className="w-16 h-16 bg-white rounded-lg border p-1">
                    <img src={`${BASE_URL}/${item.processed_image_url || item.image_url}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
              >
                Save Outfit
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-4">
          {outfits.length === 0 ? (
            <p className="text-center py-20 text-gray-400">还没有保存的搭配。</p>
          ) : (
            outfits.map(o => (
              <OutfitCard key={o.id} comboId={o.id} items={o.items} label={o.name || `搭配 #${o.id}`} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

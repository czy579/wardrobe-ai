import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWardrobe, createOutfitV2 } from '../api'
import { BASE_URL } from '../api/config'
import { bgStyle } from '../api/bg'
import type { ClothingItem, OutfitPosItem } from '../api'

interface TouchState {
  idx: number
  startX: number
  startY: number
  itemStartX: number
  itemStartY: number
  startScale: number
  startRotation: number
  prevDist: number
  prevAngle: number
}

export default function TryOn() {
  const navigate = useNavigate()
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([])
  const [canvasItems, setCanvasItems] = useState<OutfitPosItem[]>([])
  const [name, setName] = useState('')
  const [dragging, setDragging] = useState<{ idx: number; startX: number; startY: number; itemStartX: number; itemStartY: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [wardrobeOpen, setWardrobeOpen] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [nextZ, setNextZ] = useState(1)
  const touchRef = useRef<TouchState | null>(null)
  const touchIdsRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  useEffect(() => {
    getWardrobe().then(setWardrobe).catch(console.error)
  }, [])

  function bringToFront(idx: number) {
    setCanvasItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], z_index: nextZ }
      return next
    })
    setNextZ(z => z + 1)
  }

  function handleDragStart(e: React.DragEvent, item: ClothingItem) {
    e.dataTransfer.setData('clothing_id', String(item.id))
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    const cid = Number(e.dataTransfer.getData('clothing_id'))
    if (!cid) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - 60
    const y = e.clientY - rect.top - 60
    const clothing = wardrobe.find(c => c.id === cid)
    setCanvasItems(prev => [...prev, { clothing_id: cid, x, y, scale: 1, rotation: 0, z_index: nextZ, clothing }])
    setNextZ(z => z + 1)
  }

  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleMouseDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation()
    const item = canvasItems[idx]
    setDragging({ idx, startX: e.clientX, startY: e.clientY, itemStartX: item.x, itemStartY: item.y })
    bringToFront(idx)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const dx = e.clientX - dragging.startX
    const dy = e.clientY - dragging.startY
    setCanvasItems(prev => {
      const next = [...prev]
      next[dragging.idx] = { ...next[dragging.idx], x: dragging.itemStartX + dx, y: dragging.itemStartY + dy }
      return next
    })
  }

  function handleMouseUp() {
    setDragging(null)
  }

  // ----- Touch handlers -----
  function handleTouchStart(e: React.TouchEvent, idx: number) {
    if (e.touches.length === 0) return
    e.preventDefault()
    const item = canvasItems[idx]
    bringToFront(idx)
    touchIdsRef.current = new Map()
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i]
      touchIdsRef.current.set(t.identifier, { x: t.clientX, y: t.clientY })
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]
      touchRef.current = {
        idx, startX: t.clientX, startY: t.clientY,
        itemStartX: item.x, itemStartY: item.y,
        startScale: item.scale, startRotation: item.rotation || 0,
        prevDist: 0, prevAngle: 0,
      }
    } else if (e.touches.length >= 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY
      touchRef.current = {
        idx,
        startX: t1.clientX, startY: t1.clientY,
        itemStartX: item.x, itemStartY: item.y,
        startScale: item.scale, startRotation: item.rotation || 0,
        prevDist: Math.sqrt(dx * dx + dy * dy),
        prevAngle: Math.atan2(dy, dx),
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const ts = touchRef.current
    if (!ts) return
    if (e.touches.length === 1) {
      const t = e.touches[0]
      const dx = t.clientX - ts.startX
      const dy = t.clientY - ts.startY
      setCanvasItems(prev => {
        const next = [...prev]
        next[ts.idx] = { ...next[ts.idx], x: ts.itemStartX + dx, y: ts.itemStartY + dy }
        return next
      })
    } else if (e.touches.length >= 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      const scaleDelta = ts.prevDist > 0 ? dist / ts.prevDist : 1
      const angleDelta = ts.prevAngle !== 0 ? angle - ts.prevAngle : 0
      const newScale = Math.max(0.3, Math.min(3, ts.startScale * scaleDelta))
      const newRotation = ts.startRotation + angleDelta
      setCanvasItems(prev => {
        const next = [...prev]
        next[ts.idx] = { ...next[ts.idx], scale: newScale, rotation: newRotation }
        return next
      })
    }
  }

  function handleTouchEnd() {
    touchRef.current = null
    touchIdsRef.current = new Map()
  }

  function removeItem(idx: number) {
    setCanvasItems(prev => prev.filter((_, i) => i !== idx))
  }

  function randomArrange() {
    if (canvasItems.length === 0) return
    const cw = (canvasRef.current?.clientWidth || 600) - 140
    const ch = (canvasRef.current?.clientHeight || 400) - 140
    setCanvasItems(prev => prev.map(item => ({
      ...item,
      x: Math.random() * Math.max(cw, 100),
      y: Math.random() * Math.max(ch, 100),
      scale: 0.5 + Math.random() * 1,
      rotation: (Math.random() - 0.5) * 0.5,
      z_index: Math.floor(Math.random() * 100),
    })))
  }

  function handleClear() {
    if (canvasItems.length === 0) return
    setCanvasItems([])
    setNextZ(1)
  }

  async function handleSaveAsOutfit() {
    if (canvasItems.length < 1) { alert('请至少添加一件衣服'); return }
    const n = name || `试衣搭配 ${new Date().toLocaleString('zh-CN')}`
    setSaving(true)
    try {
      const items = canvasItems.map(i => ({ clothing_id: i.clothing_id, x: i.x, y: i.y, scale: i.scale, rotation: i.rotation || 0, z_index: i.z_index }))
      await createOutfitV2(n, items)
      navigate('/outfits')
    } catch (err) {
      console.error('Save failed', err)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-x-0 top-14 bottom-0 -z-10" style={bgStyle('tryon')} />
      <div className="relative flex-1 flex flex-col p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">试衣间</h1>
        <div className="flex-1 min-w-0" />
        <input
          type="text"
          placeholder="搭配名称（可选）"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 border rounded-lg text-sm"
        />
        <button onClick={randomArrange}
          className="px-3 py-1.5 bg-amber-700/60 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-700"
        >
          随机摆放
        </button>
        <button onClick={handleClear}
          className="px-3 py-1.5 border rounded-lg text-xs sm:text-sm text-gray-600/60 hover:bg-gray-50/60"
        >
          清空
        </button>
        <button onClick={handleSaveAsOutfit} disabled={saving}
          className="px-4 py-1.5 bg-amber-700/60 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存为搭配'}
        </button>
      </div>

        <div className="flex flex-1 gap-0 overflow-hidden">
        {wardrobeOpen && (
        <div className="w-48 flex-shrink-0 flex flex-col bg-white/60 rounded-xl border shadow-sm overflow-hidden">
          <div className="p-3 border-b text-sm font-medium text-gray-600">衣橱</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {wardrobe.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleDragStart(e, item)}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 transition-colors"
              >
                <div className="w-10 h-10 rounded bg-white flex-shrink-0 flex items-center justify-center border overflow-hidden">
                  <img src={`${BASE_URL}/${item.processed_image_url || item.image_url}`} className="max-w-full max-h-full object-contain" />
                </div>
                <span className="text-xs text-gray-600 truncate">{item.sub_category || item.category}</span>
              </div>
            ))}
          </div>
        </div>
        )}
        <button
          onClick={() => setWardrobeOpen(o => !o)}
          className="self-center w-6 h-12 flex items-center justify-center bg-white/60 border rounded-r-xl shadow-sm text-amber-700 hover:bg-amber-50 text-sm z-10"
        >
          {wardrobeOpen ? '◀' : '▶'}
        </button>

        <div
          ref={canvasRef}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          className="flex-1 relative bg-[repeating-linear-gradient(45deg,#f0f0f0_0px,#f0f0f0_20px,#f8f8f8_20px,#f8f8f8_40px)] rounded-xl border-2 border-dashed border-gray-300 overflow-hidden touch-none"
          style={{ minHeight: 400 }}
        >
          {canvasItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
              拖拽衣物到此处 · 自由搭配
            </div>
          )}
          {canvasItems.map((item, idx) => (
            <div
              key={`${item.clothing_id}-${idx}`}
              onMouseDown={e => handleMouseDown(e, idx)}
              onTouchStart={e => handleTouchStart(e, idx)}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                zIndex: item.z_index,
                width: 120,
                height: 120,
                transform: `scale(${item.scale}) rotate(${item.rotation || 0}rad)`,
                cursor: dragging?.idx === idx ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              className="group"
            >
              <div className="relative w-full h-full hover:drop-shadow-lg transition-shadow">
                <img
                  src={`${BASE_URL}/${item.clothing?.processed_image_url || item.clothing?.image_url || ''}`}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => removeItem(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

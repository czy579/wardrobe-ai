import { useRef, useEffect, useState, useCallback } from 'react'
import type { ClothingItem } from '../api'
import { BASE_URL } from '../api/config'

interface Props {
  item: ClothingItem
  onClose: () => void
  onSaved: (item: ClothingItem) => void
}

const BRUSH_COLOR = '#ffffff'
const ERASE_COLOR = '#000000'
const maskCache = new Map<number, string>()

export default function RefineEditor({ item, onClose, onSaved }: Props) {
  const displayRef = useRef<HTMLCanvasElement>(null)
  const maskRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'keep' | 'erase'>('keep')
  const [brushSize, setBrushSize] = useState(40)
  const [drawing, setDrawing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const panRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null)
  const pinchRef = useRef<{ startDist: number; startScale: number; startOffX: number; startOffY: number } | null>(null)

  useEffect(() => {
    loadImage()
  }, [])

  async function loadImage() {
    try {
      const url = item.original_image_url || item.image_url
      const resp = await fetch(`${BASE_URL}/${url}`)
      const blob = await resp.blob()
      const img = new Image()
      img.src = URL.createObjectURL(blob)
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej })

      const maxW = 600, maxH = 500
      let w = img.naturalWidth, h = img.naturalHeight
      const ratio = Math.min(maxW / w, maxH / h, 1)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)

      const display = displayRef.current
      const mask = maskRef.current
      if (!display || !mask) return
      display.width = w
      display.height = h
      mask.width = w
      mask.height = h

      const ctx = display.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      imgRef.current = img

      let cached = maskCache.get(item.id)
      if (!cached) try { cached = localStorage.getItem(`refine_mask_${item.id}`) || undefined } catch {}
      if (cached) {
        maskCache.set(item.id, cached)
        const ci = new Image()
        ci.onload = () => {
          const mctx = mask.getContext('2d')!
          mctx.drawImage(ci, 0, 0, w, h)
        }
        ci.src = cached
      }

      setImgSize({ w, h })
      setLoaded(true)
    } catch (err) {
      console.error('Failed to load image', err)
      alert('加载图片失败')
    }
  }

  function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = displayRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  const paint = useCallback((pos: { x: number; y: number }) => {
    const mask = maskRef.current
    if (!mask) return
    const mctx = mask.getContext('2d')!
    const color = mode === 'keep' ? BRUSH_COLOR : ERASE_COLOR
    const compOp = mode === 'keep' ? 'source-over' : 'destination-out'

    mctx.globalCompositeOperation = compOp
    mctx.beginPath()
    mctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2)
    mctx.fillStyle = color
    mctx.fill()
    mctx.globalCompositeOperation = 'source-over'
  }, [mode, brushSize])

  // ----- Mouse handlers (draw only, wheel for zoom) -----
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDrawing(true)
    const pos = getCanvasPos(e.clientX, e.clientY)
    if (pos) paint(pos)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!drawing) return
    e.preventDefault()
    const pos = getCanvasPos(e.clientX, e.clientY)
    if (pos) paint(pos)
  }

  function handleMouseUp() { setDrawing(false) }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.97 : 1.03
    setScale(s => Math.max(0.3, Math.min(5, s * delta)))
  }

  // ----- Touch handlers (1 finger = draw, 2 fingers = zoom+pan) -----
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 1) {
      setDrawing(true)
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY)
      if (pos) paint(pos)
    } else if (e.touches.length >= 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY
      pinchRef.current = {
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: scale,
        startOffX: offset.x,
        startOffY: offset.y,
      }
      panRef.current = null
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 1 && !pinchRef.current) {
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY)
      if (pos) paint(pos)
    } else if (e.touches.length >= 2 && pinchRef.current) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const rawDelta = pinchRef.current.startDist > 0 ? dist / pinchRef.current.startDist : 1
      const scaleDelta = 1 + (rawDelta - 1) * 0.3
      setScale(Math.max(0.3, Math.min(5, pinchRef.current.startScale * scaleDelta)))

      const cx = (t1.clientX + t2.clientX) / 2
      const cy = (t1.clientY + t2.clientY) / 2
      if (panRef.current) {
        setOffset({
          x: panRef.current.startOffX + cx - panRef.current.startX,
          y: panRef.current.startOffY + cy - panRef.current.startY,
        })
      } else {
        const sx = (t1.clientX + t2.clientX) / 2
        const sy = (t1.clientY + t2.clientY) / 2
        panRef.current = { startX: sx, startY: sy, startOffX: offset.x, startOffY: offset.y }
      }
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      pinchRef.current = null
      panRef.current = null
    }
    if (e.touches.length === 0) {
      setDrawing(false)
      const mask = maskRef.current
      if (mask) {
        const dataUrl = mask.toDataURL()
        maskCache.set(item.id, dataUrl)
        try { localStorage.setItem(`refine_mask_${item.id}`, dataUrl) } catch {}
      }
    }
  }

  async function handleSave() {
    const display = displayRef.current
    const mask = maskRef.current
    if (!display || !mask) return
    setSaving(true)
    try {
      const w = display.width
      const h = display.height
      const result = document.createElement('canvas')
      result.width = w
      result.height = h
      const rctx = result.getContext('2d')!

      const mctx = mask.getContext('2d')!
      const maskData = mctx.getImageData(0, 0, w, h).data

      rctx.drawImage(display, 0, 0, w, h)
      const imgData = rctx.getImageData(0, 0, w, h)
      const pixels = imgData.data

      for (let i = 0; i < pixels.length; i += 4) {
        const mi = i + 3
        if (maskData[mi] < 10) {
          pixels[i + 3] = 0
        }
      }

      rctx.putImageData(imgData, 0, 0)

      result.toBlob(async (blob) => {
        if (!blob) { setSaving(false); return }
        const form = new FormData()
        form.append('file', blob, 'refined.png')
        const resp = await fetch(`${BASE_URL}/api/clothing/${item.id}/refine`, { method: 'POST', body: form })
        if (!resp.ok) throw new Error('Save failed')
        const data = await resp.json()
        onSaved({ ...item, processed_image_url: data.processed_image_url, image_url: data.processed_image_url })
        onClose()
      }, 'image/png')
    } catch (err) {
      console.error('Save failed', err)
      alert('保存失败')
      setSaving(false)
    }
  }

  function handleReset() {
    const mask = maskRef.current
    if (mask) {
      const mctx = mask.getContext('2d')!
      mctx.clearRect(0, 0, mask.width, mask.height)
    }
    maskCache.delete(item.id)
    try { localStorage.removeItem(`refine_mask_${item.id}`) } catch {}
    setOffset({ x: 0, y: 0 })
    setScale(1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-800">手动抠图 — 涂鸦保留</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="p-4 flex justify-center">
          <div
            className="relative bg-[repeating-linear-gradient(45deg,_#ccc_0px,_#ccc_8px,_#eee_8px,_#eee_16px)] rounded-xl overflow-hidden"
            style={{ width: imgSize.w || 400, height: imgSize.h || 300 }}
          >
            <div
              className="relative"
              style={{
                display: loaded ? 'block' : 'none',
                width: imgSize.w,
                height: imgSize.h,
                transform: `scale(${scale}) translate(${offset.x / (scale || 1)}px, ${offset.y / (scale || 1)}px)`,
                transformOrigin: '0 0',
              }}
            >
              <canvas
                ref={displayRef}
                className="absolute inset-0"
                style={{ pointerEvents: 'none', width: imgSize.w, height: imgSize.h }}
              />
              <canvas
                ref={maskRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute inset-0 cursor-crosshair touch-none"
                style={{ width: imgSize.w, height: imgSize.h, opacity: 0.4 }}
              />
            </div>
            {!loaded && (
              <div className="flex items-center justify-center text-gray-400 text-sm" style={{ width: 400, height: 300 }}>
                加载中...
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode('keep')}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'keep' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
              >
                🖌 保留
              </button>
              <button
                onClick={() => setMode('erase')}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'erase' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
              >
                🧽 擦除
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>画笔</span>
              <input
                type="range"
                min={5}
                max={120}
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="w-8">{brushSize}px</span>
            </div>

            <span className="text-xs text-gray-400">单指涂鸦 · 双指缩放/平移 · 滚轮缩放</span>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleReset} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              重置
            </button>
            <button onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存抠图结果'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

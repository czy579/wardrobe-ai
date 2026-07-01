import { useState, useRef, useEffect } from 'react'
import { uploadClothing, getTags, createTag } from '../api'
import RefineEditor from './RefineEditor'
import type { ClothingItem, TagDef } from '../api'

interface Props {
  onClose: () => void
  onUploaded: () => void
}

const FIT_OPTIONS = [
  { value: 'regular', label: '合身' },
  { value: 'loose', label: '宽松' },
  { value: 'slim', label: '紧身' },
  { value: 'oversized', label: 'Oversize' },
]

const STYLE_OPTIONS = ['casual', 'formal', 'street', 'sport', 'minimal', 'retro']
const STYLE_LABELS: Record<string, string> = {
  casual: '休闲', formal: '正式', street: '街头',
  sport: '运动', minimal: '极简', retro: '复古',
}

const COLOR_TONE_OPTIONS = [
  { value: '', label: '无' },
  { value: 'neutral', label: '黑白灰' },
  { value: 'cool', label: '冷色系' },
  { value: 'warm', label: '暖色系' },
  { value: 'earth', label: '大地色系' },
  { value: 'colorful', label: '彩色系' },
]

export default function UploadModal({ onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedItem, setUploadedItem] = useState<ClothingItem | null>(null)
  const [showRefine, setShowRefine] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [fit, setFit] = useState('regular')
  const [styleTags, setStyleTags] = useState<string[]>([])
  const [colorTone, setColorTone] = useState('')
  const [colorPrimary, setColorPrimary] = useState('')
  const [userTags, setUserTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [tagDefs, setTagDefs] = useState<TagDef[]>([])

  useEffect(() => {
    getTags().then(setTagDefs).catch(() => {})
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function toggleStyle(s: string) {
    setStyleTags(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function addUserTag(name: string) {
    const t = name.trim()
    if (!t || userTags.includes(t)) return
    setUserTags([...userTags, t])
    createTag(t).catch(() => {})
    setNewTag('')
  }

  function removeUserTag(t: string) {
    setUserTags(userTags.filter(x => x !== t))
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadClothing(file, {
        fit,
        style_tags: styleTags,
        color_tone: colorTone || undefined,
        color_primary: colorPrimary || undefined,
        user_tags: userTags,
      })
      setUploadedItem(result)
      setShowRefine(true)
    } catch (err) {
      console.error('Upload failed', err)
      alert('上传失败，请确认后端服务正在运行。')
    } finally {
      setUploading(false)
    }
  }

  function handleRefineSaved(item: ClothingItem) {
    setUploadedItem(item)
    onUploaded()
    onClose()
  }

  return (
    <>
      {!showRefine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">上传衣服</h2>

            {!preview ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-400 transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <p className="text-gray-400 text-sm">点击选择图片</p>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center p-4 max-h-48">
                  <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">版型</label>
                  <div className="flex gap-2">
                    {FIT_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setFit(o.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${fit === o.value ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">风格（可多选）</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {STYLE_OPTIONS.map(s => (
                      <button key={s} onClick={() => toggleStyle(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${styleTags.includes(s) ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {STYLE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">主色</label>
                    <input type="text" value={colorPrimary} onChange={e => setColorPrimary(e.target.value)}
                      placeholder="例如：黑色" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">色系</label>
                    <select value={colorTone} onChange={e => setColorTone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      {COLOR_TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">自定义标签</label>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {userTags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        {t}
                        <button onClick={() => removeUserTag(t)} className="text-amber-400 hover:text-amber-600">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addUserTag(newTag)}
                      placeholder="输入标签后按回车" className="flex-1 px-3 py-1.5 border rounded-lg text-sm" />
                    <button onClick={() => addUserTag(newTag)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                      + 添加
                    </button>
                  </div>
                  {tagDefs.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {tagDefs.filter(d => !userTags.includes(d.name)).slice(0, 10).map(d => (
                        <button key={d.id} onClick={() => addUserTag(d.name)}
                          className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100">
                          + {d.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setFile(null); setPreview(null) }}
                    className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    重新选择
                  </button>
                  <button onClick={handleUpload} disabled={uploading}
                    className="flex-1 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                    {uploading ? '上传中...' : '上传并抠图'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showRefine && uploadedItem && (
        <RefineEditor
          item={uploadedItem}
          onClose={onClose}
          onSaved={handleRefineSaved}
        />
      )}
    </>
  )
}

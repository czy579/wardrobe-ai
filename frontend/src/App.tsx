import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Wardrobe from './pages/Wardrobe'
import Outfit from './pages/Outfit'
import Outfits from './pages/Outfits'
import OutfitBuilder from './pages/OutfitBuilder'
import TryOn from './pages/TryOn'
import Recommend from './pages/Recommend'
import { bgStyle } from './api/bg'

const STORAGE_KEY = 'wardrobe_nickname'

function NicknameScreen({ onConfirm }: { onConfirm: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center">
      <div className="absolute inset-0" style={bgStyle('nickname')} />
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative bg-white/60 backdrop-blur rounded-3xl p-10 mx-4 max-w-sm w-full shadow-xl text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">自由衣橱</h1>
        <p className="text-sm text-gray-500">请输入您的昵称，开启您的自由衣橱</p>
        <input
          type="text"
          placeholder="输入昵称..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 border-2 rounded-xl text-sm text-center outline-none focus:border-amber-400 transition-colors"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
        />
        <button
          disabled={!name.trim()}
          onClick={() => onConfirm(name.trim())}
          className="w-full py-3 bg-amber-700 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors"
        >
          开启衣橱
        </button>
      </div>
    </div>
  )
}

function Nav({ nickname }: { nickname: string }) {
  const loc = useLocation()
  const links = [
    { to: '/', label: '首页' },
    { to: '/wardrobe', label: '衣橱' },
    { to: '/outfits', label: '搭配' },
    { to: '/try-on', label: '试衣间' },
    { to: '/recommend', label: '推荐' },
  ]
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/" className="font-bold text-lg text-amber-900 whitespace-nowrap">
          {nickname ? `${nickname} 的衣橱` : 'AI 虚拟衣橱'}
        </Link>
        <div className="flex gap-4 ml-4 overflow-x-auto">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-black whitespace-nowrap transition-colors ${
                loc.pathname === l.to || (l.to !== '/' && loc.pathname.startsWith(l.to))
                  ? 'text-amber-900' : 'text-gray-500 hover:text-amber-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  const [nickname, setNickname] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

  function handleSetNickname(name: string) {
    localStorage.setItem(STORAGE_KEY, name)
    setNickname(name)
  }

  return (
    <div className="min-h-screen">
      {!nickname && <NicknameScreen onConfirm={handleSetNickname} />}
      <Nav nickname={nickname} />
      <main className="max-w-6xl mx-auto px-4 py-6 pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/outfit" element={<Outfit />} />
          <Route path="/outfits" element={<Outfits />} />
          <Route path="/outfit-builder" element={<OutfitBuilder />} />
          <Route path="/outfit-builder/:id" element={<OutfitBuilder />} />
          <Route path="/try-on" element={<TryOn />} />
          <Route path="/recommend" element={<Recommend />} />
        </Routes>
      </main>
    </div>
  )
}

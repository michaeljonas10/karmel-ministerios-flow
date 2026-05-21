import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, User, Users } from 'lucide-react'
import { useVolunteers } from '../hooks/useVolunteers'
import { useMinistries } from '../hooks/useMinistries'
import JourneyBadge from './JourneyBadge'

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { volunteers } = useVolunteers()
  const { ministries } = useMinistries()

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const results = query.trim().length >= 1
    ? volunteers
        .filter(v => {
          const q = query.toLowerCase()
          return v.name.toLowerCase().includes(q) ||
                 v.phone?.includes(q) ||
                 v.subArea?.toLowerCase().includes(q) ||
                 v.coordinator?.toLowerCase().includes(q)
        })
        .slice(0, 8)
    : []

  const go = useCallback((id: string) => {
    setOpen(false)
    navigate(`/voluntario/${id}`)
  }, [navigate])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar voluntário por nome, telefone, sub-área..."
            className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-500 border border-gray-200">ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
            {results.map(v => {
              const ministry = ministries.find(m => m.id === v.ministryId)
              return (
                <li key={v.id}>
                  <button
                    onClick={() => go(v.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: ministry?.color ?? '#6366f1' }}
                    >
                      {v.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{v.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {ministry?.name}{v.subArea ? ` · ${v.subArea}` : ''}{v.phone ? ` · ${v.phone}` : ''}
                      </p>
                    </div>
                    <JourneyBadge stage={v.currentStage} size="sm" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : query.trim().length >= 1 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <User size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Nenhum voluntário encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Users size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Digite para buscar voluntários</p>
          </div>
        )}

        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{volunteers.length} voluntários</span>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">↑↓</kbd> navegar
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono">↵</kbd> abrir
          </div>
        </div>
      </div>
    </div>
  )
}

// Trigger button for toolbar
export function GlobalSearchTrigger() {
  return (
    <button
      onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
    >
      <Search size={13} />
      Buscar
      <kbd className="flex items-center gap-0.5 font-mono text-[10px] text-gray-400">
        <span>⌘</span><span>K</span>
      </kbd>
    </button>
  )
}

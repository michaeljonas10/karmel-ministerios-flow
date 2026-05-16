import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

export type ThemeId = 'pulse' | 'amber' | 'emerald' | 'rose' | 'ocean' | 'violet'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  previewFrom: string
  previewTo: string
  previewAccent: string
  dark?: boolean
}

export const THEMES: Theme[] = [
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'Índigo e roxo — padrão do sistema',
    previewFrom: '#312e81',
    previewTo: '#1e1b4b',
    previewAccent: '#6366f1',
  },
  {
    id: 'amber',
    name: 'Dark Âmbar',
    description: 'Fundo escuro com detalhes dourados',
    previewFrom: '#1c1917',
    previewTo: '#0c0a09',
    previewAccent: '#f59e0b',
    dark: true,
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Verde e natureza',
    previewFrom: '#064e3b',
    previewTo: '#022c22',
    previewAccent: '#10b981',
  },
  {
    id: 'rose',
    name: 'Rosa',
    description: 'Vibrante e acolhedor',
    previewFrom: '#881337',
    previewTo: '#4c0519',
    previewAccent: '#fb7185',
  },
  {
    id: 'ocean',
    name: 'Oceano',
    description: 'Azul-ciano e frescor',
    previewFrom: '#164e63',
    previewTo: '#083344',
    previewAccent: '#22d3ee',
  },
  {
    id: 'violet',
    name: 'Violeta',
    description: 'Roxo profundo e espiritual',
    previewFrom: '#3b0764',
    previewTo: '#1e0331',
    previewAccent: '#c084fc',
  },
]

interface ThemeContextType {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'pulse', setTheme: () => {} })

function storageKey(userId?: string) {
  return userId ? `pulse_theme_${userId}` : 'pulse_theme'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<ThemeId>('pulse')

  // Load theme when user changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey(user?.id)) as ThemeId | null
    const valid = THEMES.some(t => t.id === saved)
    setThemeState(valid && saved ? saved : 'pulse')
  }, [user?.id])

  // Apply data-theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = (t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem(storageKey(user?.id), t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

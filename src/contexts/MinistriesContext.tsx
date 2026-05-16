import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { ministries as staticMinistries } from '../data/ministries'
import type { Ministry } from '../types'

interface DBMinistry {
  id: string; name: string; color: string; icon: string; coordinators: string[]
}
interface DBSubArea {
  id: string; ministry_id: string; name: string; coordinator: string
}

function buildMinistries(dbMs: DBMinistry[], dbSubs: DBSubArea[]): Ministry[] {
  return dbMs.map(m => ({
    id: m.id,
    name: m.name,
    color: m.color,
    bgColor: m.color + '20',
    icon: m.icon,
    coordinators: m.coordinators ?? [],
    subAreas: dbSubs
      .filter(s => s.ministry_id === m.id)
      .map(s => ({ id: s.id, name: s.name, coordinator: s.coordinator, volunteerCount: 0 })),
  }))
}

interface MinistriesContextType {
  ministries: Ministry[]
  loading: boolean
  refetch: () => Promise<void>
}

const MinistriesContext = createContext<MinistriesContextType>({
  ministries: staticMinistries,
  loading: true,
  refetch: async () => {},
})

export function MinistriesProvider({ children }: { children: ReactNode }) {
  const [ministries, setMinistries] = useState<Ministry[]>(staticMinistries)
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    const [{ data: ms }, { data: subs }] = await Promise.all([
      supabase.from('ministries').select('*').order('name'),
      supabase.from('sub_areas').select('*').order('name'),
    ])
    if (ms && subs) setMinistries(buildMinistries(ms as DBMinistry[], subs as DBSubArea[]))
    setLoading(false)
  }

  useEffect(() => { refetch() }, [])

  return (
    <MinistriesContext.Provider value={{ ministries, loading, refetch }}>
      {children}
    </MinistriesContext.Provider>
  )
}

export function useMinistries() {
  return useContext(MinistriesContext)
}

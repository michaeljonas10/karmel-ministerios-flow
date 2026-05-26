import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { ministries as staticMinistries } from '../data/ministries'
import type { Ministry, JourneyStage } from '../types'

interface DBMinistry {
  id: string; name: string; color: string; icon: string; coordinators: string[]; journey_stages?: string[]
}
interface DBSubArea {
  id: string; ministry_id: string; name: string; coordinator: string
}
interface DBCoordinatorProfile {
  id: string; name: string; role: string; ministry_id: string | null; sub_areas: string[]
}

function buildMinistries(
  dbMs: DBMinistry[],
  dbSubs: DBSubArea[],
  coordinatorProfiles: DBCoordinatorProfile[],
): Ministry[] {
  return dbMs.map(m => ({
    id: m.id,
    name: m.name,
    color: m.color,
    bgColor: m.color + '20',
    icon: m.icon,
    coordinators: m.coordinators ?? [],
    journeyStages: m.journey_stages && m.journey_stages.length > 0
      ? m.journey_stages as JourneyStage[]
      : undefined,
    subAreas: dbSubs
      .filter(s => s.ministry_id === m.id)
      .map(s => {
        const assignedNames = coordinatorProfiles
          .filter(p => p.ministry_id === m.id && (p.sub_areas ?? []).includes(s.id))
          .map(p => p.name)
          .filter(Boolean)
        const coordinatorNames = assignedNames.length > 0
          ? assignedNames
          : s.coordinator ? [s.coordinator] : []
        return { id: s.id, name: s.name, coordinator: s.coordinator, coordinatorNames, volunteerCount: 0 }
      }),
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
    const [{ data: ms }, { data: subs }, { data: profiles }] = await Promise.all([
      supabase.from('ministries').select('*').order('name'),
      supabase.from('sub_areas').select('*').order('name'),
      supabase.from('user_profiles').select('id, name, role, ministry_id, sub_areas')
        .in('role', ['coordinator', 'ministry_leader']),
    ])
    if (ms && subs) {
      setMinistries(buildMinistries(
        ms as DBMinistry[],
        subs as DBSubArea[],
        (profiles ?? []) as DBCoordinatorProfile[],
      ))
    }
    setLoading(false)
  }

  useEffect(() => {
    refetch()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        refetch()
      }
    })

    const channel = supabase
      .channel('ministries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ministries' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_areas' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, refetch)
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <MinistriesContext.Provider value={{ ministries, loading, refetch }}>
      {children}
    </MinistriesContext.Provider>
  )
}

export function useMinistries() {
  return useContext(MinistriesContext)
}

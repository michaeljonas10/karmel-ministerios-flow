import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { volunteers as mockVolunteers } from '../data/volunteers'
import type { Volunteer } from '../types'
import { OFF_TRACK_STAGES } from '../types'

function mapRow(v: Record<string, unknown>): Volunteer {
  return {
    id: v.id as string,
    name: v.name as string,
    phone: v.phone as string,
    email: v.email as string | undefined,
    registeredAt: v.registered_at as string,
    ministryId: v.ministry_id as string,
    subArea: (v.sub_area as string) ?? '',
    coordinator: (v.coordinator as string) ?? '',
    currentStage: v.current_stage as Volunteer['currentStage'],
    stageHistory: ((v.stage_history as { stage: string; date: string; note?: string }[]) || []).map(h => ({
      stage: h.stage as Volunteer['currentStage'],
      date: h.date,
      note: h.note,
    })),
    notes: v.notes as string,
    howFound: v.how_found as string | undefined,
    participatesGc: v.participates_gc as boolean | undefined,
    platforms: (v.platforms as string[] | undefined) ?? [],
    archivedAt: v.archived_at as string | undefined,
    lastContactDate: v.last_contact_date as string,
    alertDays: v.alert_days as number | undefined,
    birthday: v.birthday as string | undefined,
    contactAttempts: (v.contact_attempts as number) ?? 0,
  }
}

async function fetchOneVolunteer(id: string): Promise<Volunteer | null> {
  const { data } = await supabase
    .from('volunteers')
    .select('*, stage_history(*)')
    .eq('id', id)
    .single()
  return data ? mapRow(data as Record<string, unknown>) : null
}

interface VolunteersContextType {
  volunteers: Volunteer[]
  loading: boolean
  setVolunteers: React.Dispatch<React.SetStateAction<Volunteer[]>>
  refetch: () => Promise<void>
}

const VolunteersContext = createContext<VolunteersContextType>({
  volunteers: mockVolunteers,
  loading: true,
  setVolunteers: () => {},
  refetch: async () => {},
})

export function VolunteersProvider({ children }: { children: ReactNode }) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVolunteers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('volunteers')
      .select('*, stage_history(*)')
      .is('archived_at', null)
      .order('registered_at', { ascending: false })

    if (data && !error) {
      const mapped = data.map(v => mapRow(v as Record<string, unknown>))

      const autoSemRetornoDays = parseInt(localStorage.getItem('autoSemRetornoDays') || '0', 10)
      if (autoSemRetornoDays > 0) {
        const now = new Date().toISOString()
        const toFlag = mapped.filter(v => {
          if (OFF_TRACK_STAGES.includes(v.currentStage) || v.currentStage === 'estabelecido') return false
          const days = (Date.now() - new Date(v.lastContactDate).getTime()) / 86400000
          return days >= autoSemRetornoDays
        })
        for (const v of toFlag) {
          await supabase.from('volunteers').update({ current_stage: 'nao_retornou' }).eq('id', v.id)
          await supabase.from('stage_history').insert({ volunteer_id: v.id, stage: 'nao_retornou', date: now, note: `Auto: sem contato há ${autoSemRetornoDays}+ dias` })
          v.currentStage = 'nao_retornou'
        }
      }

      setVolunteers(mapped)
    } else {
      console.warn('Supabase fetch failed, using mock data', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION synchronously on the next tick
    // when registered — guaranteed to have the correct session state.
    // This replaces the blind first fetch (which raced against session restore).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setVolunteers([])
        setLoading(false)
        return
      }
      // INITIAL_SESSION fires immediately; SIGNED_IN fires after login
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        fetchVolunteers()
      } else if (event === 'INITIAL_SESSION' && !session) {
        // Not logged in — nothing to load
        setVolunteers([])
        setLoading(false)
      }
    })

    const channel = supabase
      .channel('volunteers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'volunteers' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setVolunteers(prev => prev.filter(v => v.id !== (payload.old as { id: string }).id))
            return
          }
          if ((payload.new as Record<string, unknown>).archived_at) {
            setVolunteers(prev => prev.filter(v => v.id !== (payload.new as { id: string }).id))
            return
          }
          const updated = await fetchOneVolunteer((payload.new as { id: string }).id)
          if (!updated) return
          setVolunteers(prev => {
            const idx = prev.findIndex(v => v.id === updated.id)
            if (idx >= 0) return prev.map((v, i) => i === idx ? updated : v)
            return updated.archivedAt ? prev : [updated, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stage_history' },
        async (payload) => {
          const volunteerId = (payload.new as { volunteer_id: string }).volunteer_id
          const updated = await fetchOneVolunteer(volunteerId)
          if (!updated) return
          setVolunteers(prev => prev.map(v => v.id === updated.id ? updated : v))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <VolunteersContext.Provider value={{ volunteers, loading, setVolunteers, refetch: fetchVolunteers }}>
      {children}
    </VolunteersContext.Provider>
  )
}

export function useVolunteersContext() {
  return useContext(VolunteersContext)
}

import { useState, useEffect } from 'react'
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
    subArea: v.sub_area as string,
    coordinator: v.coordinator as string,
    currentStage: v.current_stage as Volunteer['currentStage'],
    stageHistory: ((v.stage_history as { stage: string; date: string; note?: string }[]) || []).map(h => ({
      stage: h.stage as Volunteer['currentStage'],
      date: h.date,
      note: h.note,
    })),
    notes: v.notes as string,
    howFound: v.how_found as string | undefined,
    lastContactDate: v.last_contact_date as string,
    alertDays: v.alert_days as number | undefined,
    birthday: v.birthday as string | undefined,
    contactAttempts: (v.contact_attempts as number) ?? 0,
  }
}

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>(mockVolunteers)
  const [loading, setLoading] = useState(true)

  const fetchVolunteers = async () => {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*, stage_history(*)')
      .order('registered_at', { ascending: false })

    if (data && !error) {
      const mapped = data.map(v => mapRow(v as Record<string, unknown>))

      // Auto "Sem Retorno": flag volunteers who haven't been contacted in X days (configurable)
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

  useEffect(() => { fetchVolunteers() }, [])

  return { volunteers, loading, setVolunteers, refetch: fetchVolunteers }
}

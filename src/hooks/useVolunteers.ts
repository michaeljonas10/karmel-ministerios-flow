import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { volunteers as mockVolunteers } from '../data/volunteers'
import type { Volunteer } from '../types'

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
    lastContactDate: v.last_contact_date as string,
    alertDays: v.alert_days as number | undefined,
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
      setVolunteers(data.map(v => mapRow(v as Record<string, unknown>)))
    } else {
      console.warn('Supabase fetch failed, using mock data', error)
    }
    setLoading(false)
  }

  useEffect(() => { fetchVolunteers() }, [])

  return { volunteers, loading, setVolunteers, refetch: fetchVolunteers }
}

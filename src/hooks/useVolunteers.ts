import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { volunteers as mockVolunteers } from '../data/volunteers'
import type { Volunteer } from '../types'

export function useVolunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>(mockVolunteers)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVolunteers() {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*, stage_history(*)')
        .order('registered_at', { ascending: false })

      if (data && !error) {
        setVolunteers(
          data.map((v) => ({
            id: v.id,
            name: v.name,
            phone: v.phone,
            email: v.email,
            registeredAt: v.registered_at,
            ministryId: v.ministry_id,
            subArea: v.sub_area,
            coordinator: v.coordinator,
            currentStage: v.current_stage,
            stageHistory: (v.stage_history || []).map((h: { stage: string; date: string; note?: string }) => ({
              stage: h.stage,
              date: h.date,
              note: h.note,
            })),
            notes: v.notes,
            lastContactDate: v.last_contact_date,
            alertDays: v.alert_days,
          }))
        )
      } else {
        console.warn('Supabase fetch failed, using mock data', error)
      }
      setLoading(false)
    }
    fetchVolunteers()
  }, [])

  return { volunteers, loading, setVolunteers }
}

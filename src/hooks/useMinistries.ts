import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ministries as staticMinistries } from '../data/ministries'
import type { Ministry } from '../types'

interface DBMinistry {
  id: string
  name: string
  color: string
  icon: string
  coordinators: string[]
}

interface DBSubArea {
  id: string
  ministry_id: string
  name: string
  coordinator: string
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

export function useMinistries() {
  const [ministries, setMinistries] = useState<Ministry[]>(staticMinistries)
  const [loading, setLoading] = useState(true)

  const fetchMinistries = async () => {
    const [{ data: ms }, { data: subs }] = await Promise.all([
      supabase.from('ministries').select('*').order('name'),
      supabase.from('sub_areas').select('*').order('name'),
    ])
    if (ms && subs) setMinistries(buildMinistries(ms as DBMinistry[], subs as DBSubArea[]))
    setLoading(false)
  }

  useEffect(() => { fetchMinistries() }, [])

  return { ministries, loading, refetch: fetchMinistries }
}

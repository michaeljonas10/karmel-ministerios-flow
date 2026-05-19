import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  Search, Users, CheckCircle, AlertTriangle, LogOut,
  ChevronRight, Plus, Pencil, Trash2, X, UserPlus, Eye, EyeOff, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useVolunteers } from '../hooks/useVolunteers'
import { useMinistries } from '../hooks/useMinistries'
import { getDaysSinceLastContact } from '../data/volunteers'
import { STAGE_ORDER } from '../types'
import JourneyBadge from '../components/JourneyBadge'
import { supabase } from '../lib/supabase'
import WaButton from '../components/WaButton'
import type { Volunteer } from '../types'

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
      <CheckCircle size={16} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-xs">×</button>
    </div>
  )
}

// ─── Volunteer table / cards ─────────────────────────────────────────────────
function VolunteerTable({
  volunteers,
  onMarkContacted,
  onAdvanceStage,
}: {
  volunteers: Volunteer[]
  onMarkContacted: (id: string) => void
  onAdvanceStage: (id: string) => void
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const filtered = volunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.subArea.toLowerCase().includes(search.toLowerCase())
  )

  const empty = (
    <div className="text-center py-12 text-gray-400">
      <Users size={32} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm">Nenhum voluntário encontrado</p>
    </div>
  )

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-semibold text-gray-800 flex-1 min-w-0 truncate">
          Voluntários ({volunteers.length})
        </h2>
        <div className="relative flex-shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white w-36 sm:w-48"
          />
        </div>
      </div>

      {/* ── Mobile: card list ── */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? empty : filtered.map(v => {
          const days = getDaysSinceLastContact(v)
          const isLast = STAGE_ORDER.indexOf(v.currentStage) === STAGE_ORDER.length - 1
          return (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  className="text-sm font-semibold text-gray-800 hover:text-indigo-600 text-left leading-tight"
                  onClick={() => navigate(`/voluntario/${v.id}`)}
                >
                  {v.name}
                </button>
                <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${days >= 14 ? 'bg-red-100 text-red-600' : days >= 7 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                  {days === 0 ? 'Hoje' : `${days}d`}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {v.subArea && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                    {v.subArea}
                  </span>
                )}
                <JourneyBadge stage={v.currentStage} size="sm" />
              </div>
              <div className="flex gap-2">
                <WaButton phone={v.phone} name={v.name} onClick={() => onMarkContacted(v.id)} />
                <button
                  onClick={() => onAdvanceStage(v.id)}
                  disabled={isLast}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={12} /> Avançar etapa
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop: table ── */}
      <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Sub-área</th>
                <th className="text-left px-5 py-3">Etapa</th>
                <th className="text-left px-5 py-3">Último Contato</th>
                <th className="text-left px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => {
                const days = getDaysSinceLastContact(v)
                const isLast = STAGE_ORDER.indexOf(v.currentStage) === STAGE_ORDER.length - 1
                return (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        className="text-sm font-medium text-gray-800 hover:text-indigo-600 text-left"
                        onClick={() => navigate(`/voluntario/${v.id}`)}
                      >
                        {v.name}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600">{v.subArea}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <JourneyBadge stage={v.currentStage} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-medium ${days >= 14 ? 'text-red-600' : days >= 7 ? 'text-orange-500' : 'text-gray-600'}`}>
                        {days === 0 ? 'Hoje' : `${days} dias`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <WaButton phone={v.phone} name={v.name} onClick={() => onMarkContacted(v.id)} />
                        <button
                          onClick={() => onAdvanceStage(v.id)}
                          disabled={isLast}
                          className="flex items-center gap-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={11} /> Avançar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && empty}
        </div>
      </div>
    </div>
  )
}

// ─── Follow-up alerts ─────────────────────────────────────────────────────────
function FollowUpAlerts({
  volunteers,
  onMarkContacted,
  onAdvanceStage,
}: {
  volunteers: Volunteer[]
  onMarkContacted: (id: string) => void
  onAdvanceStage: (id: string) => void
}) {
  const navigate = useNavigate()
  const alerts = volunteers.filter(v => getDaysSinceLastContact(v) >= 7)
  if (alerts.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-orange-500" />
        <h2 className="font-semibold text-orange-800">
          {alerts.length} voluntário{alerts.length !== 1 ? 's' : ''} aguardando follow-up
        </h2>
      </div>
      <div className="space-y-2">
        {alerts.map(v => {
          const days = getDaysSinceLastContact(v)
          const isLast = STAGE_ORDER.indexOf(v.currentStage) === STAGE_ORDER.length - 1
          return (
            <div key={v.id} className="bg-white rounded-xl px-4 py-3 border border-orange-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  className="text-sm font-semibold text-gray-800 hover:text-indigo-600 text-left leading-tight"
                  onClick={() => navigate(`/voluntario/${v.id}`)}
                >
                  {v.name}
                </button>
                <span className="flex-shrink-0 text-xs text-orange-600 font-medium whitespace-nowrap">{days}d sem contato</span>
              </div>
              {v.subArea && (
                <p className="text-xs text-gray-400 mb-2">{v.subArea}</p>
              )}
              <div className="flex gap-2">
                <WaButton phone={v.phone} name={v.name} onClick={() => onMarkContacted(v.id)} />
                <button
                  onClick={() => onAdvanceStage(v.id)}
                  disabled={isLast}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                >
                  <ChevronRight size={13} /> Avançar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KPIs({ volunteers }: { volunteers: Volunteer[] }) {
  const alerts = volunteers.filter(v => getDaysSinceLastContact(v) >= 7).length
  const established = volunteers.filter(v => v.currentStage === 'estabelecido').length
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { icon: <Users size={16} className="text-indigo-500" />, label: 'Voluntários', value: volunteers.length, color: 'text-gray-900' },
        { icon: <ChevronRight size={16} className="text-blue-500" />, label: 'Em Jornada', value: volunteers.length - established, color: 'text-blue-600' },
        { icon: <CheckCircle size={16} className="text-green-500" />, label: 'Estabelecidos', value: established, color: 'text-green-600' },
        { icon: <AlertTriangle size={16} className="text-orange-500" />, label: 'Aguardam Contato', value: alerts, color: 'text-orange-500' },
      ].map(kpi => (
        <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            {kpi.icon}
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
          </div>
          <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Leader: sub-area management modal ───────────────────────────────────────
function ManageSubAreasModal({
  ministryId,
  onClose,
  onSaved,
}: { ministryId: string; onClose: () => void; onSaved: () => void }) {
  const { ministries, refetch } = useMinistries()
  const ministry = ministries.find(m => m.id === ministryId)
  const [saving, setSaving] = useState(false)
  const [subAreas, setSubAreas] = useState(
    ministry?.subAreas.map(s => ({ id: s.id, name: s.name, coordinator: s.coordinator })) ?? []
  )

  const addRow = () => setSubAreas(prev => [...prev, { id: '', name: '', coordinator: '' }])
  const removeRow = (i: number) => setSubAreas(prev => prev.filter((_, idx) => idx !== i))
  const update = (i: number, field: 'name' | 'coordinator', val: string) =>
    setSubAreas(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const save = async () => {
    setSaving(true)
    await supabase.from('sub_areas').delete().eq('ministry_id', ministryId)
    const rows = subAreas.filter(s => s.name.trim()).map(s => ({
      id: `${ministryId}_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      ministry_id: ministryId,
      name: s.name.trim(),
      coordinator: s.coordinator.trim(),
    }))
    if (rows.length > 0) await supabase.from('sub_areas').insert(rows)
    await refetch()
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Gerenciar Sub-áreas — {ministry?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {subAreas.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={s.name}
                onChange={e => update(i, 'name', e.target.value)}
                placeholder="Nome da sub-área"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <input
                value={s.coordinator}
                onChange={e => update(i, 'coordinator', e.target.value)}
                placeholder="Coordenador"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 p-1">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="flex items-center gap-2 text-sm font-medium mt-2"
            style={{ color: 'var(--accent)' }}
          >
            <Plus size={15} /> Adicionar sub-área
          </button>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Leader: create coordinator modal ────────────────────────────────────────
function CreateCoordinatorModal({
  ministryId,
  onClose,
  onCreated,
}: { ministryId: string; onClose: () => void; onCreated: () => void }) {
  const { ministries } = useMinistries()
  const ministry = ministries.find(m => m.id === ministryId)
  const [form, setForm] = useState({ name: '', email: '', password: '', sub_areas: [] as string[] })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleSubArea = (id: string) =>
    setForm(p => ({
      ...p,
      sub_areas: p.sub_areas.includes(id) ? p.sub_areas.filter(s => s !== id) : [...p.sub_areas, id],
    }))

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    setSaving(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      'https://fzbxzcwopgwsojxmckpa.supabase.co/functions/v1/create-coordinator',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: 'coordinator', ministry_id: ministryId, sub_areas: form.sub_areas }),
      }
    )
    const json = await res.json()
    setSaving(false)
    if (!res.ok || json.error) { setError(json.error || 'Erro ao criar coordenador.') }
    else { onCreated(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Novo Coordenador — {ministry?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {['name', 'email'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {field === 'name' ? 'Nome *' : 'Email *'}
              </label>
              <input
                type={field === 'email' ? 'email' : 'text'}
                value={form[field as 'name' | 'email']}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha temporária *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {ministry && ministry.subAreas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sub-áreas que irá coordenar</label>
              <div className="grid grid-cols-2 gap-2">
                {ministry.subAreas.map(sa => (
                  <label key={sa.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.sub_areas.includes(sa.id)}
                      onChange={() => toggleSubArea(sa.id)}
                      className="accent-[var(--accent)]"
                    />
                    {sa.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium">Cancelar</button>
          <button
            onClick={create}
            disabled={saving}
            className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? 'Criando...' : 'Criar Coordenador'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MeuMinisterio() {
  usePageTitle('Meu Ministério')
  const { profile, signOut, isLeader, isCoordinator } = useAuth()
  const navigate = useNavigate()
  const { volunteers, loading: volLoading, setVolunteers } = useVolunteers()
  const { ministries, loading: minLoading } = useMinistries()
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview')
  const [subAreaFilter, setSubAreaFilter] = useState<string>('all')
  const [showSubAreaModal, setShowSubAreaModal] = useState(false)
  const [showCoordModal, setShowCoordModal] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const ministry = ministries.find(m => m.id === profile?.ministry_id)

  // Resolve coordinator's assigned sub-areas (IDs → objects) using ministry data.
  // volunteers.sub_area stores the sub-area *name* (set at registration), while
  // user_profiles.sub_areas stores sub-area *IDs* (slugs) — so we map through names.
  const mySubAreas = isCoordinator
    ? (ministry?.subAreas ?? []).filter(sa => (profile?.sub_areas ?? []).includes(sa.id))
    : []
  const mySubAreaNames = mySubAreas.map(sa => sa.name)

  // Scope volunteers by role
  const ministryVolunteers = volunteers.filter(v => v.ministryId === profile?.ministry_id)
  const myVolunteers = isCoordinator
    // Coordinator sees: their assigned sub-areas + volunteers with no area yet (pending assignment)
    ? volunteers.filter(v =>
        v.ministryId === profile?.ministry_id &&
        (v.subArea === '' || mySubAreaNames.includes(v.subArea))
      )
    : ministryVolunteers

  // Unassigned = same ministry, no sub-area yet
  const unassignedVolunteers = isCoordinator
    ? myVolunteers.filter(v => v.subArea === '')
    : []

  // Sub-area filter: 'all' shows everything, 'unassigned' shows pending, else filters by name
  const displayedVolunteers = subAreaFilter === 'unassigned'
    ? unassignedVolunteers
    : subAreaFilter !== 'all'
    ? myVolunteers.filter(v => v.subArea === subAreaFilter)
    : myVolunteers

  const markContacted = async (id: string) => {
    const now = new Date().toISOString()
    setVolunteers((prev: Volunteer[]) =>
      prev.map(v => v.id === id ? { ...v, lastContactDate: now, alertDays: 0 } : v)
    )
    await supabase.from('volunteers').update({ last_contact_date: now }).eq('id', id)
    showToast('Contato registrado!')
  }

  const advanceStage = async (id: string) => {
    const volunteer = volunteers.find(v => v.id === id)
    if (!volunteer) return
    const currentIdx = STAGE_ORDER.indexOf(volunteer.currentStage)
    if (currentIdx === STAGE_ORDER.length - 1) return
    const nextStage = STAGE_ORDER[currentIdx + 1]
    const now = new Date().toISOString()
    setVolunteers((prev: Volunteer[]) =>
      prev.map(v => v.id !== id ? v : { ...v, currentStage: nextStage, lastContactDate: now, alertDays: 0, stageHistory: [...v.stageHistory, { stage: nextStage, date: now }] })
    )
    await supabase.from('volunteers').update({ current_stage: nextStage, last_contact_date: now }).eq('id', id)
    await supabase.from('stage_history').insert({ volunteer_id: id, stage: nextStage, date: now })
    showToast('Etapa avançada!')
  }

  const loading = volLoading || minLoading

  const roleBadge = isLeader
    ? { label: 'Líder de Ministério', cls: 'bg-amber-100 text-amber-700' }
    : { label: 'Coordenador', cls: 'bg-purple-100 text-purple-700' }

  const panelTitle = isLeader
    ? (ministry ? `Ministério ${ministry.name}` : 'Meu Ministério')
    : isCoordinator && mySubAreas.length > 0
      ? `${mySubAreas.map(sa => sa.name).join(' · ')}${unassignedVolunteers.length > 0 ? ` · ${unassignedVolunteers.length} sem área` : ''}`
      : 'Meu Painel'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--body-bg)' }}>
      {/* Header */}
      <header
        className="border-b px-4 lg:px-8 py-3 flex items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/pulse-logo.svg" alt="Pulse" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-secondary)' }}>Pulse</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Painel de Acesso</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{profile?.name}</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge.cls}`}>
              {roleBadge.label}
            </span>
          </div>
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4 lg:px-8 max-w-5xl mx-auto space-y-5">
        {/* Title + tab switcher for leader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Olá, {profile?.name?.split(' ')[0]}!
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{panelTitle}</p>
          </div>
          {isLeader && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Gerenciar
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          </div>
        ) : (
          <>
            {/* ── OVERVIEW tab (leader) or full coordinator view ── */}
            {(activeTab === 'overview' || isCoordinator) && (
              <div className="space-y-6">
                <KPIs volunteers={myVolunteers} />

                {/* Sub-area filter tabs */}
                {((isLeader && ministry && ministry.subAreas.length > 0) || isCoordinator) && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSubAreaFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={subAreaFilter === 'all' ? { backgroundColor: 'var(--accent)' } : {}}
                    >
                      Todos ({myVolunteers.length})
                    </button>
                    {isCoordinator && unassignedVolunteers.length > 0 && (
                      <button
                        onClick={() => setSubAreaFilter('unassigned')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === 'unassigned' ? 'text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        style={subAreaFilter === 'unassigned' ? { backgroundColor: '#f59e0b' } : {}}
                      >
                        Sem área ({unassignedVolunteers.length})
                      </button>
                    )}
                    {(isLeader ? (ministry?.subAreas ?? []) : mySubAreas).map(sa => (
                      <button
                        key={sa.id}
                        onClick={() => setSubAreaFilter(sa.name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === sa.name ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={subAreaFilter === sa.name ? { backgroundColor: 'var(--accent)' } : {}}
                      >
                        {sa.name} ({myVolunteers.filter(v => v.subArea === sa.name).length})
                      </button>
                    ))}
                  </div>
                )}

                <FollowUpAlerts
                  volunteers={displayedVolunteers}
                  onMarkContacted={markContacted}
                  onAdvanceStage={advanceStage}
                />

                <VolunteerTable
                  volunteers={displayedVolunteers}
                  onMarkContacted={markContacted}
                  onAdvanceStage={advanceStage}
                />
              </div>
            )}

            {/* ── MANAGE tab (leader only) ── */}
            {activeTab === 'manage' && isLeader && (
              <div className="space-y-6">
                {/* Sub-areas card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">Sub-áreas do Ministério</h2>
                    <button
                      onClick={() => setShowSubAreaModal(true)}
                      className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <Pencil size={14} /> Editar Sub-áreas
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {(ministry?.subAreas ?? []).length === 0 ? (
                      <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma sub-área cadastrada.</p>
                    ) : ministry?.subAreas.map(sa => (
                      <div key={sa.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{sa.name}</p>
                          {sa.coordinator && (
                            <p className="text-xs text-gray-400 mt-0.5">Coord.: {sa.coordinator}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {ministryVolunteers.filter(v => v.subArea === sa.name).length} voluntários
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coordinators card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">Coordenadores</h2>
                    <button
                      onClick={() => setShowCoordModal(true)}
                      className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      <UserPlus size={14} /> Novo Coordenador
                    </button>
                  </div>
                  <div className="p-4">
                    <CoordinatorList ministryId={profile?.ministry_id ?? ''} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showSubAreaModal && profile?.ministry_id && (
        <ManageSubAreasModal
          ministryId={profile.ministry_id}
          onClose={() => setShowSubAreaModal(false)}
          onSaved={() => showToast('Sub-áreas atualizadas!')}
        />
      )}

      {showCoordModal && profile?.ministry_id && (
        <CreateCoordinatorModal
          ministryId={profile.ministry_id}
          onClose={() => setShowCoordModal(false)}
          onCreated={() => showToast('Coordenador criado!')}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

// ─── Coordinator list (used in manage tab) ───────────────────────────────────
function CoordinatorList({ ministryId }: { ministryId: string }) {
  const [users, setUsers] = useState<{ id: string; name: string; email: string; sub_areas: string[] }[]>([])
  const { ministries } = useMinistries()
  const ministry = ministries.find(m => m.id === ministryId)

  useState(() => {
    supabase.from('user_profiles')
      .select('id,name,email,sub_areas')
      .eq('ministry_id', ministryId)
      .eq('role', 'coordinator')
      .then(({ data }) => { if (data) setUsers(data as typeof users) })
  })

  if (users.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Nenhum coordenador cadastrado ainda.</p>

  return (
    <div className="divide-y divide-gray-50">
      {users.map(u => (
        <div key={u.id} className="flex items-center gap-3 py-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
            <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{u.name}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
            {(u.sub_areas ?? []).length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Sub-áreas: {(u.sub_areas ?? []).map(id => ministry?.subAreas.find(s => s.id === id)?.name ?? id).join(', ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

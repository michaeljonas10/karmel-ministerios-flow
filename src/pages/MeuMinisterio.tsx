import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { whatsappUrl } from '../lib/whatsapp'
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

// ─── Volunteer table ──────────────────────────────────────────────────────────
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">Voluntários ({volunteers.length})</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white"
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                        {v.phone && (
                          <a
                            href={whatsappUrl(v.phone, v.name)}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                            onClick={() => onMarkContacted(v.id)}
                          >
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        )}
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
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum voluntário encontrado</p>
            </div>
          )}
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
          return (
            <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl px-4 py-3 border border-orange-200 gap-3">
              <div>
                <button
                  className="text-sm font-semibold text-gray-800 hover:text-indigo-600 text-left"
                  onClick={() => navigate(`/voluntario/${v.id}`)}
                >
                  {v.name}
                </button>
                <p className="text-xs text-gray-500 mt-0.5">
                  {v.subArea} · <span className="text-orange-600 font-medium">{days} dias sem contato</span>
                </p>
              </div>
              <div className="flex gap-2">
                {v.phone && (
                  <a
                    href={whatsappUrl(v.phone, v.name)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    onClick={() => onMarkContacted(v.id)}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => onAdvanceStage(v.id)}
                  className="flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  disabled={STAGE_ORDER.indexOf(v.currentStage) === STAGE_ORDER.length - 1}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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

  // Scope volunteers by role
  const ministryVolunteers = volunteers.filter(v => v.ministryId === profile?.ministry_id)
  const myVolunteers = isCoordinator
    ? volunteers.filter(v => (profile?.sub_areas ?? []).includes(v.subArea))
    : ministryVolunteers

  // Leader: filter by selected sub-area
  const displayedVolunteers = isLeader && subAreaFilter !== 'all'
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
    : isCoordinator && (profile?.sub_areas?.length ?? 0) > 0
      ? `Sub-área${(profile?.sub_areas?.length ?? 0) > 1 ? 's' : ''}: ${(profile?.sub_areas ?? []).join(', ')}`
      : 'Meu Painel'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--body-bg)' }}>
      {/* Header */}
      <header
        className="border-b px-4 lg:px-8 py-4 flex items-center justify-between"
        style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/pulse-logo.svg" alt="Pulse" className="w-8 h-8 rounded-lg" />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Pulse</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Painel de Acesso</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{profile?.name}</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge.cls}`}>
              {roleBadge.label}
            </span>
          </div>
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
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

                {/* Sub-area filter (leader only) */}
                {isLeader && ministry && ministry.subAreas.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSubAreaFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={subAreaFilter === 'all' ? { backgroundColor: 'var(--accent)' } : {}}
                    >
                      Todas as Sub-áreas
                    </button>
                    {ministry.subAreas.map(sa => (
                      <button
                        key={sa.id}
                        onClick={() => setSubAreaFilter(sa.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === sa.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={subAreaFilter === sa.id ? { backgroundColor: 'var(--accent)' } : {}}
                      >
                        {sa.name}
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
                          {ministryVolunteers.filter(v => v.subArea === sa.id).length} voluntários
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

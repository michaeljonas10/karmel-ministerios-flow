import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  Search, Users, CheckCircle, AlertTriangle,
  ChevronRight, Plus, Pencil, Trash2, X, UserPlus, Eye, EyeOff,
  LayoutGrid, List, TrendingUp, Award, Clock, ShieldCheck, Tag,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useVolunteers } from '../hooks/useVolunteers'
import { useMinistries } from '../hooks/useMinistries'
import { getDaysSinceLastContact } from '../data/volunteers'
import { STAGE_ORDER, STAGE_LABELS, OFF_TRACK_STAGES, HOW_FOUND_OPTIONS } from '../types'
import type { JourneyStage } from '../types'
import JourneyBadge from '../components/JourneyBadge'
import VolunteerCard from '../components/VolunteerCard'
import { supabase } from '../lib/supabase'
import WaButton from '../components/WaButton'
import { buildTemplate } from '../data/waTemplates'
import type { Volunteer } from '../types'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core'

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
  ministryName,
  senderName,
  onMarkContacted,
  onAdvanceStage,
  onBulkUpdateHowFound,
  onBulkUpdateGc,
}: {
  volunteers: Volunteer[]
  ministryName: string
  senderName: string
  onMarkContacted: (id: string) => void
  onAdvanceStage: (id: string) => void
  onBulkUpdateHowFound?: (ids: string[], value: string) => Promise<void>
  onBulkUpdateGc?: (ids: string[], value: boolean | null) => Promise<void>
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkHowFound, setBulkHowFound] = useState('')
  const [bulkGc, setBulkGc] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleSelectAll = (ids: string[]) =>
    setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids))
  const clearSelection = () => { setSelectedIds(new Set()); setBulkHowFound(''); setBulkGc('') }

  const applyBulkHowFound = async () => {
    if (!bulkHowFound || selectedIds.size === 0 || !onBulkUpdateHowFound) return
    setBulkApplying(true)
    await onBulkUpdateHowFound([...selectedIds], bulkHowFound)
    setBulkApplying(false)
    clearSelection()
  }

  const applyBulkGc = async () => {
    if (!bulkGc || selectedIds.size === 0 || !onBulkUpdateGc) return
    setBulkApplying(true)
    const val = bulkGc === 'sim' ? true : bulkGc === 'nao' ? false : null
    await onBulkUpdateGc([...selectedIds], val)
    setBulkApplying(false)
    clearSelection()
  }

  const filtered = volunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.subArea.toLowerCase().includes(search.toLowerCase())
  )
  const filteredIds = filtered.map(v => v.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))

  const empty = (
    <div className="text-center py-12 text-gray-400">
      <Users size={32} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm">Nenhum voluntário encontrado</p>
    </div>
  )

  return (
    <div>
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex-wrap">
          <span className="text-sm font-medium text-indigo-700 flex-shrink-0">
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Como chegou */}
            <div className="flex items-center gap-1.5">
              <Tag size={14} className="text-indigo-500 flex-shrink-0" />
              <select
                value={bulkHowFound}
                onChange={e => setBulkHowFound(e.target.value)}
                className="border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">Como chegou...</option>
                {HOW_FOUND_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button
                onClick={applyBulkHowFound}
                disabled={!bulkHowFound || bulkApplying}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {bulkApplying ? '...' : 'Aplicar'}
              </button>
            </div>
            {/* GC */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-indigo-500 font-medium flex-shrink-0">GC</span>
              <select
                value={bulkGc}
                onChange={e => setBulkGc(e.target.value)}
                className="border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">Participa GC...</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
                <option value="sem_info">Sem info</option>
              </select>
              <button
                onClick={applyBulkGc}
                disabled={!bulkGc || bulkApplying}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {bulkApplying ? '...' : 'Aplicar'}
              </button>
            </div>
          </div>
          <button onClick={clearSelection} className="text-indigo-400 hover:text-indigo-600 flex-shrink-0"><X size={16} /></button>
        </div>
      )}

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
          const isSelected = selectedIds.has(v.id)
          return (
            <div key={v.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-colors ${isSelected ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-100'}`}>
              <div className="flex items-start gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(v.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                />
                <button
                  className="text-sm font-semibold text-gray-800 hover:text-indigo-600 text-left leading-tight flex-1 min-w-0"
                  onClick={() => navigate(`/voluntario/${v.id}`)}
                >
                  {v.name}
                </button>
                <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${days >= 14 ? 'bg-red-100 text-red-600' : days >= 7 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                  {days === 0 ? 'Hoje' : `${days}d`}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap pl-6">
                {v.subArea ? (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                    {v.subArea}
                  </span>
                ) : v.coordinator ? (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Em contato: {v.coordinator}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Sem área</span>
                )}
                <JourneyBadge stage={v.currentStage} size="sm" />
                {v.howFound && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{v.howFound}</span>
                )}
              </div>
              <div className="flex gap-2 pl-6">
                <WaButton phone={v.phone} message={buildTemplate(v.currentStage, v, ministryName, senderName)} onClick={() => onMarkContacted(v.id)} />
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
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleSelectAll(filteredIds)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    title="Selecionar todos"
                  />
                </th>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Sub-área</th>
                <th className="text-left px-4 py-3">Como chegou</th>
                <th className="text-left px-4 py-3">Etapa</th>
                <th className="text-left px-4 py-3">Último Contato</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => {
                const days = getDaysSinceLastContact(v)
                const isLast = STAGE_ORDER.indexOf(v.currentStage) === STAGE_ORDER.length - 1
                const isSelected = selectedIds.has(v.id)
                return (
                  <tr key={v.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(v.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        className="text-sm font-medium text-gray-800 hover:text-indigo-600 text-left"
                        onClick={() => navigate(`/voluntario/${v.id}`)}
                      >
                        {v.name}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      {v.subArea ? (
                        <span className="text-sm text-gray-600">{v.subArea}</span>
                      ) : v.coordinator ? (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">
                          Em contato: {v.coordinator}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Sem área</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {v.howFound
                        ? <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{v.howFound}</span>
                        : <span className="text-xs text-gray-300 italic">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <JourneyBadge stage={v.currentStage} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-sm font-medium ${days >= 14 ? 'text-red-600' : days >= 7 ? 'text-orange-500' : 'text-gray-600'}`}>
                        {days === 0 ? 'Hoje' : `${days} dias`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <WaButton phone={v.phone} message={buildTemplate(v.currentStage, v, ministryName, senderName)} onClick={() => onMarkContacted(v.id)} />
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
  ministryName,
  senderName,
  onMarkContacted,
  onAdvanceStage,
}: {
  volunteers: Volunteer[]
  ministryName: string
  senderName: string
  onMarkContacted: (id: string) => void
  onAdvanceStage: (id: string) => void
}) {
  const navigate = useNavigate()
  const alerts = volunteers.filter(v => v.currentStage !== 'estabelecido' && getDaysSinceLastContact(v) >= 7)
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
                <WaButton phone={v.phone} message={buildTemplate(v.currentStage, v, ministryName, senderName)} onClick={() => onMarkContacted(v.id)} />
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
  const alerts = volunteers.filter(v => v.currentStage !== 'estabelecido' && getDaysSinceLastContact(v) >= 7).length
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
    ministry?.subAreas.map(s => ({ id: s.id, name: s.name, coordinator: s.coordinator, coordinatorNames: s.coordinatorNames })) ?? []
  )

  const addRow = () => setSubAreas(prev => [...prev, { id: '', name: '', coordinator: '', coordinatorNames: [] }])
  const removeRow = (i: number) => setSubAreas(prev => prev.filter((_, idx) => idx !== i))
  const update = (i: number, val: string) =>
    setSubAreas(prev => prev.map((row, idx) => idx === i ? { ...row, name: val } : row))

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
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  value={s.name}
                  onChange={e => update(i, e.target.value)}
                  placeholder="Nome da sub-área"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                {s.coordinatorNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 px-1">
                    {s.coordinatorNames.map(n => (
                      <span key={n} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{n}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 p-1 mt-1">
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

// ─── Kanban drag/drop pieces ─────────────────────────────────────────────────
function DraggableCard({ volunteer }: { volunteer: Volunteer }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: volunteer.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}>
      <VolunteerCard volunteer={volunteer} />
    </div>
  )
}

function DroppableColumn({ stage, children, isOver, offTrack = false }: {
  stage: JourneyStage; children: React.ReactNode; isOver: boolean; offTrack?: boolean
}) {
  const { setNodeRef } = useDroppable({ id: stage })
  const isAmber = stage === 'mudou_area'
  let cls = 'rounded-b-xl min-h-20 p-2 space-y-2 transition-colors '
  if (offTrack) {
    cls += isOver
      ? isAmber ? 'bg-amber-50 ring-2 ring-amber-300 ring-inset' : 'bg-red-50 ring-2 ring-red-300 ring-inset'
      : isAmber ? 'bg-amber-50/40' : 'bg-red-50/40'
  } else {
    cls += isOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : 'bg-gray-50'
  }
  return <div ref={setNodeRef} className={cls}>{children}</div>
}

// ─── Stage funnel chart ───────────────────────────────────────────────────────
function StageFunnel({ volunteers, accentColor }: { volunteers: Volunteer[]; accentColor: string }) {
  const counts = STAGE_ORDER.map(s => ({ stage: s, n: volunteers.filter(v => v.currentStage === s).length }))
  const offCounts = OFF_TRACK_STAGES.map(s => ({ stage: s, n: volunteers.filter(v => v.currentStage === s).length }))
  const maxN = Math.max(...counts.map(c => c.n), 1)

  const stageColor = (stage: JourneyStage) => {
    if (stage === 'estabelecido') return '#22c55e'
    if (['contato_coordenador', 'coordenador_contatou'].includes(stage)) return '#f97316'
    return accentColor
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">Funil de Jornada</h3>
      </div>
      <div className="space-y-2">
        {counts.map(({ stage, n }) => {
          if (n === 0) return null
          return (
            <div key={stage} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-32 sm:w-40 flex-shrink-0 truncate">{STAGE_LABELS[stage]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(n / maxN) * 100}%`, backgroundColor: stageColor(stage) }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 w-5 text-right flex-shrink-0">{n}</span>
            </div>
          )
        })}
      </div>
      {offCounts.some(c => c.n > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {offCounts.map(({ stage, n }) => n === 0 ? null : (
            <div key={stage} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-32 sm:w-40 flex-shrink-0 truncate">{STAGE_LABELS[stage]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full bg-red-400" style={{ width: `${(n / maxN) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Coordinator hero header ──────────────────────────────────────────────────
function CoordHero({ name, subAreas, ministry, volunteers }: {
  name: string; subAreas: { id: string; name: string }[]; ministry: { name: string; color: string } | undefined; volunteers: Volunteer[]
}) {
  const established = volunteers.filter(v => v.currentStage === 'estabelecido').length
  const inJourney = volunteers.filter(v => !OFF_TRACK_STAGES.includes(v.currentStage) && v.currentStage !== 'estabelecido').length
  const alerts = volunteers.filter(v => v.currentStage !== 'estabelecido' && getDaysSinceLastContact(v) >= 7).length
  const color = ministry?.color ?? '#6366f1'

  return (
    <div className="rounded-2xl p-5 sm:p-6 text-white" style={{ background: `linear-gradient(135deg, ${color}ee, ${color}99)` }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{ministry?.name ?? 'Ministério'}</p>
          <h2 className="text-xl sm:text-2xl font-bold truncate">{name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {subAreas.length > 0
              ? subAreas.map(sa => (
                  <span key={sa.id} className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium">{sa.name}</span>
                ))
              : <span className="text-xs text-white/60">Sem sub-área definida</span>
            }
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-3xl font-bold">{volunteers.length}</p>
          <p className="text-white/70 text-xs">voluntários</p>
        </div>
      </div>
      <div className="flex gap-5 mt-5 pt-4 border-t border-white/20 flex-wrap">
        <div>
          <p className="text-lg font-bold">{established}</p>
          <p className="text-white/70 text-xs">Estabelecidos</p>
        </div>
        <div>
          <p className="text-lg font-bold">{inJourney}</p>
          <p className="text-white/70 text-xs">Em Jornada</p>
        </div>
        {alerts > 0 && (
          <div>
            <p className="text-lg font-bold text-yellow-200">{alerts}</p>
            <p className="text-white/70 text-xs">Follow-up</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-area summary cards (multi-area coordinators) ────────────────────────
function SubAreaCards({ subAreas, volunteers, accentColor, filter, onFilter }: {
  subAreas: { id: string; name: string }[]
  volunteers: Volunteer[]
  accentColor: string
  filter: string
  onFilter: (f: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {subAreas.map(sa => {
        const vols = volunteers.filter(v => v.subArea === sa.name)
        const est = vols.filter(v => v.currentStage === 'estabelecido').length
        const alerts = vols.filter(v => getDaysSinceLastContact(v) >= 7).length
        const isActive = filter === sa.name
        return (
          <div
            key={sa.id}
            onClick={() => onFilter(isActive ? 'all' : sa.name)}
            className={`rounded-xl p-4 border cursor-pointer transition-all select-none ${isActive ? 'ring-2' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
            style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}18` } : {}}
          >
            <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{sa.name}</p>
            <div className="flex items-end justify-between mt-3">
              <div>
                <p className="text-2xl font-bold text-gray-900">{vols.length}</p>
                <p className="text-xs text-gray-400">voluntários</p>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex items-center gap-1 justify-end">
                  <Award size={11} className="text-green-500" />
                  <span className="text-xs text-green-600 font-medium">{est} est.</span>
                </div>
                {alerts > 0 && (
                  <div className="flex items-center gap-1 justify-end">
                    <Clock size={11} className="text-orange-500" />
                    <span className="text-xs text-orange-600 font-medium">{alerts} alerta</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Coordinator Kanban ───────────────────────────────────────────────────────
function CoordKanban({ volunteers, onMove, accentColor }: {
  volunteers: Volunteer[]
  onMove: (id: string, stage: JourneyStage) => Promise<void>
  accentColor: string
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<JourneyStage | null>(null)
  const ALL_STAGES = [...STAGE_ORDER, ...OFF_TRACK_STAGES]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }
  function handleDragOver(e: DragOverEvent) {
    const s = e.over?.id as JourneyStage | null
    setOverStage(ALL_STAGES.includes(s as JourneyStage) ? s : null)
  }
  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null); setOverStage(null)
    const { active, over } = e
    if (over && ALL_STAGES.includes(over.id as JourneyStage)) {
      await onMove(active.id as string, over.id as JourneyStage)
    }
  }

  const activeVol = volunteers.find(v => v.id === activeId)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      {/* Main track */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3 min-w-max">
          {STAGE_ORDER.map(stage => {
            const cols = volunteers.filter(v => v.currentStage === stage)
            return (
              <div key={stage} className="w-44 sm:w-52 flex-shrink-0">
                <div className="rounded-t-xl px-3 py-2 flex items-center justify-between" style={{ backgroundColor: `${accentColor}18` }}>
                  <span className="text-xs font-semibold truncate" style={{ color: accentColor }}>{STAGE_LABELS[stage]}</span>
                  <span className="text-xs font-bold ml-1 px-1.5 py-0.5 rounded-full bg-white/60" style={{ color: accentColor }}>{cols.length}</span>
                </div>
                <DroppableColumn stage={stage} isOver={overStage === stage}>
                  {cols.map(v => <DraggableCard key={v.id} volunteer={v} />)}
                  {cols.length === 0 && <p className="text-xs text-gray-300 text-center py-4">—</p>}
                </DroppableColumn>
              </div>
            )
          })}
        </div>
      </div>

      {/* Off-track row */}
      {volunteers.some(v => OFF_TRACK_STAGES.includes(v.currentStage)) && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fora da jornada</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {OFF_TRACK_STAGES.map(stage => {
              const isAmber = stage === 'mudou_area'
              const cols = volunteers.filter(v => v.currentStage === stage)
              return (
                <div key={stage} className="w-44 sm:w-52 flex-shrink-0">
                  <div className={`rounded-t-xl px-3 py-2 flex items-center justify-between ${isAmber ? 'bg-amber-50' : 'bg-red-50'}`}>
                    <span className={`text-xs font-semibold truncate ${isAmber ? 'text-amber-700' : 'text-red-600'}`}>{STAGE_LABELS[stage]}</span>
                    <span className={`text-xs font-bold ml-1 px-1.5 py-0.5 rounded-full ${isAmber ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{cols.length}</span>
                  </div>
                  <DroppableColumn stage={stage} isOver={overStage === stage} offTrack>
                    {cols.map(v => <DraggableCard key={v.id} volunteer={v} />)}
                    {cols.length === 0 && <p className="text-xs text-gray-300 text-center py-4">—</p>}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DragOverlay>{activeVol ? <VolunteerCard volunteer={activeVol} /> : null}</DragOverlay>
    </DndContext>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MeuMinisterio() {
  usePageTitle('Meu Ministério')
  const { profile, isLeader, isCoordinator } = useAuth()
  const { volunteers, loading: volLoading, setVolunteers } = useVolunteers()
  const { ministries, loading: minLoading } = useMinistries()
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'archived'>('overview')
  const [archivedVolunteers, setArchivedVolunteers] = useState<Volunteer[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [subAreaFilter, setSubAreaFilter] = useState<string>('all')
  const [coordView, setCoordView] = useState<'table' | 'kanban'>('table')
  const [showSubAreaModal, setShowSubAreaModal] = useState(false)
  const [showCoordModal, setShowCoordModal] = useState(false)
  const [showCadastroModal, setShowCadastroModal] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const ministry = ministries.find(m => m.id === profile?.ministry_id)

  // Resolve coordinator's assigned sub-areas (IDs → objects) using ministry data.
  // volunteers.sub_area stores the sub-area *name* (set at registration), while
  // user_profiles.sub_areas stores sub-area *IDs* (slugs) — so we map through names.
  //
  // Robustness: legacy data may have double-prefixed IDs (e.g. "com_com_foto")
  // while the DB stores "com_foto". We normalise both sides by stripping the
  // ministry-id prefix once before comparing.
  const stripPrefix = (ministryId: string, id: string) => {
    const prefix = ministryId + '_'
    let s = id
    while (s.startsWith(prefix)) s = s.slice(prefix.length)
    return s
  }
  const profileSubAreaBases = (profile?.sub_areas ?? []).map(id =>
    profile?.ministry_id ? stripPrefix(profile.ministry_id, id) : id
  )
  const mySubAreas = isCoordinator
    ? (ministry?.subAreas ?? []).filter(sa => {
        const base = profile?.ministry_id ? stripPrefix(profile.ministry_id, sa.id) : sa.id
        return (profile?.sub_areas ?? []).includes(sa.id) || profileSubAreaBases.includes(base)
      })
    : []
  const mySubAreaNames = mySubAreas.map(sa => sa.name)

  // Scope volunteers by role
  const ministryVolunteers = volunteers.filter(v => v.ministryId === profile?.ministry_id)
  const myVolunteers = isCoordinator
    // Coordinator sees:
    //   1. Volunteers in their assigned sub-areas (by sub-area name)
    //   2. Fallback: volunteers whose coordinator field matches my name
    //      (covers profile.sub_areas ID mismatches or sub-area renames)
    //   3. Unassigned volunteers that nobody has claimed yet (coordinator === '')
    //   4. Unassigned volunteers that THIS coordinator already claimed (coordinator === my name)
    //      → prevents other coordinators from seeing them after claim
    ? volunteers.filter(v => {
        if (v.ministryId !== profile?.ministry_id) return false
        if (mySubAreaNames.includes(v.subArea)) return true         // assigned to my area (name match)
        if (profile?.name && v.coordinator === profile.name) return true  // fallback: my name in coordinator field
        if (v.subArea !== '') return false                          // assigned to another area, not mine
        if (v.coordinator !== '' && v.coordinator !== profile?.name) return false  // claimed by another coordinator
        return true                                                  // unclaimed / unassigned
      })
    : ministryVolunteers

  // Sort helper: most days without contact first
  const byContactAsc = (a: Volunteer, b: Volunteer) =>
    getDaysSinceLastContact(b) - getDaysSinceLastContact(a)

  // Unassigned = same ministry, no sub-area yet (and unclaimed or claimed by me)
  const unassignedVolunteers = isCoordinator
    ? myVolunteers.filter(v => v.subArea === '').sort(byContactAsc)
    : []

  // My sub-area volunteers only (excludes unassigned) — used for follow-up alerts
  const mySubAreaVolunteers = isCoordinator
    ? myVolunteers.filter(v => v.subArea !== '').sort(byContactAsc)
    : [...ministryVolunteers].sort(byContactAsc)

  // All my volunteers sorted (sub-area + unassigned) — used for the table
  const myVolunteersSorted = [...myVolunteers].sort(byContactAsc)

  // Sub-area filter: 'all' shows everything, 'unassigned' shows pending, else filters by name
  const displayedVolunteers = subAreaFilter === 'unassigned'
    ? unassignedVolunteers
    : subAreaFilter !== 'all'
    ? myVolunteersSorted.filter(v => v.subArea === subAreaFilter)
    : myVolunteersSorted

  const markContacted = async (id: string) => {
    const now = new Date().toISOString()
    const vol = volunteers.find(v => v.id === id)

    // If the volunteer has no sub-area yet, claim them so other coordinators
    // won't also message them. Sets coordinator = my name → filters them out
    // of other coordinators' unassigned panels in real-time.
    const isClaiming = isCoordinator && vol?.subArea === '' && vol?.coordinator === '' && !!profile?.name
    const myName = profile?.name ?? ''

    setVolunteers((prev: Volunteer[]) =>
      prev.map(v => v.id === id
        ? { ...v, lastContactDate: now, alertDays: 0, ...(isClaiming ? { coordinator: myName } : {}) }
        : v
      )
    )
    const updates: Record<string, unknown> = { last_contact_date: now }
    if (isClaiming) updates.coordinator = myName
    await supabase.from('volunteers').update(updates).eq('id', id)
    showToast(isClaiming ? `Contato registrado! Voluntário assumido por ${myName}.` : 'Contato registrado!')
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

  const bulkUpdateHowFound = async (ids: string[], value: string) => {
    setVolunteers((prev: Volunteer[]) =>
      prev.map(v => ids.includes(v.id) ? { ...v, howFound: value } : v)
    )
    await supabase.from('volunteers').update({ how_found: value }).in('id', ids)
    showToast(`"${value}" aplicado a ${ids.length} voluntário${ids.length !== 1 ? 's' : ''}!`)
  }

  const bulkUpdateGc = async (ids: string[], value: boolean | null) => {
    setVolunteers((prev: Volunteer[]) =>
      prev.map(v => ids.includes(v.id) ? { ...v, participatesGc: value ?? undefined } : v)
    )
    await supabase.from('volunteers').update({ participates_gc: value }).in('id', ids)
    const label = value === true ? 'Sim' : value === false ? 'Não' : 'Sem info'
    showToast(`GC "${label}" aplicado a ${ids.length} voluntário${ids.length !== 1 ? 's' : ''}!`)
  }

  const loadArchived = async () => {
    if (!ministry) return
    setArchivedLoading(true)
    const { data } = await supabase
      .from('volunteers')
      .select('*')
      .eq('ministry_id', ministry.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
    if (data) {
      setArchivedVolunteers(data.map(v => ({
        id: v.id, name: v.name, phone: v.phone || '',
        email: v.email ?? undefined, registeredAt: v.registered_at,
        ministryId: v.ministry_id, subArea: v.sub_area || '',
        subAreas: (v.sub_areas as string[] | undefined)?.length ? (v.sub_areas as string[]) : [v.sub_area].filter(Boolean),
        coordinator: v.coordinator || '', currentStage: v.current_stage as Volunteer['currentStage'],
        stageHistory: [], notes: v.notes || '', howFound: v.how_found ?? undefined,
        participatesGc: v.participates_gc ?? undefined,
        archivedAt: v.archived_at, lastContactDate: v.last_contact_date,
        alertDays: v.alert_days ?? undefined, birthday: v.birthday ?? undefined,
        contactAttempts: v.contact_attempts ?? 0,
      })))
    }
    setArchivedLoading(false)
  }

  const unarchiveVolunteer = async (id: string) => {
    await supabase.from('volunteers').update({ archived_at: null }).eq('id', id)
    setArchivedVolunteers(prev => prev.filter(v => v.id !== id))
    showToast('Voluntário reativado!')
  }

  const moveToStage = async (volunteerId: string, targetStage: JourneyStage) => {
    const vol = volunteers.find(v => v.id === volunteerId)
    if (!vol || vol.currentStage === targetStage) return
    const now = new Date().toISOString()
    setVolunteers((prev: Volunteer[]) => prev.map(v =>
      v.id !== volunteerId ? v : { ...v, currentStage: targetStage, lastContactDate: now, alertDays: 0, stageHistory: [...v.stageHistory, { stage: targetStage, date: now }] }
    ))
    await supabase.from('volunteers').update({ current_stage: targetStage, last_contact_date: now }).eq('id', volunteerId)
    await supabase.from('stage_history').insert({ volunteer_id: volunteerId, stage: targetStage, date: now })
    showToast('Etapa atualizada!')
  }

  const accentColor = ministry?.color ?? '#6366f1'

  const loading = volLoading || minLoading

  const panelTitle = isLeader
    ? (ministry ? `Ministério ${ministry.name}` : 'Meu Ministério')
    : isCoordinator && mySubAreas.length > 0
      ? `${mySubAreas.map(sa => sa.name).join(' · ')}${unassignedVolunteers.length > 0 ? ` · ${unassignedVolunteers.length} sem área` : ''}`
      : 'Meu Painel'

  // ── Cadastro modal ──────────────────────────────────────────────────────────
  const CadastroModal = showCadastroModal ? (() => {
    function Inner() {
      const availableSubAreas = isCoordinator ? mySubAreas : (ministry?.subAreas ?? [])
      const [form, setForm] = useState({
        name: '', phone: '', birthday: '', email: '', sub_area: availableSubAreas[0]?.name ?? '',
        attends_church: '', has_experience: '', participates_gc: '', notes: '',
      })
      const [submitting, setSubmitting] = useState(false)
      const [error, setError] = useState('')

      function maskPhone(v: string) {
        const d = v.replace(/\D/g, '').slice(0, 11)
        if (d.length <= 2) return `(${d}`
        if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
        return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
      }

      const phoneDigits = form.phone.replace(/\D/g, '')
      const valid = form.name.trim() && phoneDigits.length >= 10 && form.sub_area && form.attends_church && form.has_experience

      async function submit() {
        if (!valid || !ministry) return
        setSubmitting(true); setError('')

        const { data: dup } = await supabase.rpc('public_check_phone', { p_phone_suffix: phoneDigits.slice(-8) })
        if (dup?.exists) {
          setError(`Já existe cadastro com este WhatsApp (${dup.name}).`)
          setSubmitting(false); return
        }

        const subAreaObj = ministry.subAreas.find(s => s.name === form.sub_area)
        const coordinator = subAreaObj?.coordinatorNames?.[0] ?? subAreaObj?.coordinator ?? profile?.name ?? ''
        const now = new Date().toISOString()
        const id = crypto.randomUUID()

        const notes = [
          form.notes,
          `Frequenta: ${form.attends_church}`,
          `Experiência: ${form.has_experience}`,
          `Cadastrado por: ${profile?.name ?? 'Coordenador'}`,
        ].filter(Boolean).join('\n')

        const { error: vErr } = await supabase.from('volunteers').insert({
          id, name: form.name.trim(), phone: form.phone, email: form.email || null,
          registered_at: now, ministry_id: ministry.id, sub_area: form.sub_area,
          coordinator, current_stage: 'cadastrado', birthday: form.birthday || null,
          participates_gc: form.participates_gc === 'Sim' ? true : form.participates_gc === 'Não' ? false : null,
          notes, last_contact_date: now,
        })

        if (vErr) { setError('Erro ao salvar. Tente novamente.'); setSubmitting(false); return }

        await supabase.from('stage_history').insert({
          volunteer_id: id, stage: 'cadastrado', date: now,
          changed_by: profile?.name ?? 'Coordenador',
        })

        setVolunteers(prev => [{
          id, name: form.name.trim(), phone: form.phone, email: form.email || undefined,
          registeredAt: now, ministryId: ministry.id, subArea: form.sub_area,
          subAreas: form.sub_area ? [form.sub_area] : [],
          coordinator, currentStage: 'cadastrado', stageHistory: [{ stage: 'cadastrado', date: now }],
          notes, lastContactDate: now, contactAttempts: 0,
          participatesGc: form.participates_gc === 'Sim' ? true : form.participates_gc === 'Não' ? false : undefined,
        }, ...prev])

        showToast(`${form.name.split(' ')[0]} cadastrado com sucesso!`)
        setShowCadastroModal(false)
      }

      const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'
      const RadioGroup = ({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) => (
        <div className="flex gap-3 flex-wrap">
          {options.map(o => (
            <label key={o} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="accent-indigo-600" />
              <span className="text-sm text-gray-700">{o}</span>
            </label>
          ))}
        </div>
      )

      return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Cadastrar Voluntário</h2>
              <button onClick={() => setShowCadastroModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome completo *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">WhatsApp *</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(00) 9 0000-0000" className={inputCls} type="tel" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data de Aniversário</label>
                <input value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))} className={inputCls} type="date" max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="opcional" className={inputCls} type="email" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sub-área *</label>
                <select value={form.sub_area} onChange={e => setForm(p => ({ ...p, sub_area: e.target.value }))} className={`${inputCls} bg-white`}>
                  <option value="">Selecione...</option>
                  {availableSubAreas.map(sa => <option key={sa.id} value={sa.name}>{sa.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Frequenta a Igreja? *</label>
                <RadioGroup name="attends" options={['Sim', 'Não', 'Às vezes']} value={form.attends_church} onChange={v => setForm(p => ({ ...p, attends_church: v }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Participa de GC?</label>
                <RadioGroup name="gc" options={['Sim', 'Não']} value={form.participates_gc} onChange={v => setForm(p => ({ ...p, participates_gc: v }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tem experiência na área? *</label>
                <RadioGroup name="exp" options={['Sim', 'Não']} value={form.has_experience} onChange={v => setForm(p => ({ ...p, has_experience: v }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Opcional..." className={`${inputCls} resize-none`} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowCadastroModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={submit} disabled={!valid || submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors">
                {submitting ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )
    }
    return <Inner />
  })() : null

  return (
    <div>
      {CadastroModal}

      <div className="px-3 py-4 sm:px-4 lg:px-8 max-w-5xl mx-auto space-y-5">
        {/* Title row — leaders only (coordinator has hero card) */}
        {isLeader && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Olá, {profile?.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{panelTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCadastroModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
              >
                <Plus size={15} /> Novo Voluntário
              </button>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Gerenciar
              </button>
              <button
                onClick={() => { setActiveTab('archived'); loadArchived() }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'archived' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Arquivados
              </button>
            </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          </div>
        ) : (
          <>
            {/* ── COORDINATOR view ── */}
            {isCoordinator && (
              <div className="space-y-5">
                {/* Hero + novo voluntário */}
                <div className="flex items-start justify-between gap-3">
                  <CoordHero
                    name={profile?.name ?? ''}
                    subAreas={mySubAreas}
                    ministry={ministry}
                    volunteers={myVolunteers}
                  />
                  <button
                    onClick={() => setShowCadastroModal(true)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors mt-1"
                  >
                    <Plus size={15} /> Novo
                  </button>
                </div>

                {/* KPIs row */}
                <KPIs volunteers={myVolunteers} />

                {/* Stage funnel */}
                {myVolunteers.length > 0 && (
                  <StageFunnel volunteers={myVolunteers} accentColor={accentColor} />
                )}

                {/* Multi sub-area cards */}
                {mySubAreas.length > 1 && (
                  <SubAreaCards
                    subAreas={mySubAreas}
                    volunteers={myVolunteers}
                    accentColor={accentColor}
                    filter={subAreaFilter}
                    onFilter={f => setSubAreaFilter(f)}
                  />
                )}

                {/* Filter pills + view toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex gap-2 flex-wrap flex-1">
                    <button
                      onClick={() => setSubAreaFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={subAreaFilter === 'all' ? { backgroundColor: accentColor } : {}}
                    >
                      Todos ({myVolunteers.length})
                    </button>
                    {unassignedVolunteers.length > 0 && (
                      <button
                        onClick={() => setSubAreaFilter('unassigned')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === 'unassigned' ? 'text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        style={subAreaFilter === 'unassigned' ? { backgroundColor: '#f59e0b' } : {}}
                      >
                        Sem área ({unassignedVolunteers.length})
                      </button>
                    )}
                    {mySubAreas.map(sa => (
                      <button
                        key={sa.id}
                        onClick={() => setSubAreaFilter(subAreaFilter === sa.name ? 'all' : sa.name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === sa.name ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={subAreaFilter === sa.name ? { backgroundColor: accentColor } : {}}
                      >
                        {sa.name} ({myVolunteers.filter(v => v.subArea === sa.name).length})
                      </button>
                    ))}
                  </div>
                  {/* View toggle */}
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setCoordView('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${coordView === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <List size={13} /> Lista
                    </button>
                    <button
                      onClick={() => setCoordView('kanban')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${coordView === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <LayoutGrid size={13} /> Kanban
                    </button>
                  </div>
                </div>

                {/* Follow-up alerts — only sub-area volunteers (not unassigned) */}
                <FollowUpAlerts
                  volunteers={subAreaFilter === 'unassigned' ? [] : subAreaFilter !== 'all' ? mySubAreaVolunteers.filter(v => v.subArea === subAreaFilter) : mySubAreaVolunteers}
                  ministryName={ministry?.name ?? ''}
                  senderName={profile?.name ?? ''}
                  onMarkContacted={markContacted}
                  onAdvanceStage={advanceStage}
                />

                {/* Main content */}
                {coordView === 'kanban' ? (
                  <CoordKanban
                    volunteers={displayedVolunteers}
                    onMove={moveToStage}
                    accentColor={accentColor}
                  />
                ) : (
                  <VolunteerTable
                    volunteers={displayedVolunteers}
                    ministryName={ministry?.name ?? ''}
                    senderName={profile?.name ?? ''}
                    onMarkContacted={markContacted}
                    onAdvanceStage={advanceStage}
                    onBulkUpdateHowFound={bulkUpdateHowFound}
                    onBulkUpdateGc={bulkUpdateGc}
                  />
                )}
              </div>
            )}

            {/* ── LEADER overview tab ── */}
            {isLeader && activeTab === 'overview' && (
              <div className="space-y-5">
                <KPIs volunteers={myVolunteers} />

                {ministry && ministry.subAreas.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSubAreaFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${subAreaFilter === 'all' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={subAreaFilter === 'all' ? { backgroundColor: 'var(--accent)' } : {}}
                    >
                      Todas ({myVolunteers.length})
                    </button>
                    {ministry.subAreas.map(sa => (
                      <button
                        key={sa.id}
                        onClick={() => setSubAreaFilter(subAreaFilter === sa.name ? 'all' : sa.name)}
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
                  ministryName={ministry?.name ?? ''}
                  senderName={profile?.name ?? ''}
                  onMarkContacted={markContacted}
                  onAdvanceStage={advanceStage}
                />

                <VolunteerTable
                  volunteers={displayedVolunteers}
                  ministryName={ministry?.name ?? ''}
                  senderName={profile?.name ?? ''}
                  onMarkContacted={markContacted}
                  onAdvanceStage={advanceStage}
                  onBulkUpdateHowFound={bulkUpdateHowFound}
                  onBulkUpdateGc={bulkUpdateGc}
                />
              </div>
            )}

            {/* ── ARCHIVED tab (leader only) ── */}
            {activeTab === 'archived' && isLeader && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-700">
                    {archivedLoading ? 'Carregando...' : `${archivedVolunteers.length} arquivado${archivedVolunteers.length !== 1 ? 's' : ''}`}
                  </h2>
                </div>
                {archivedLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
                ) : archivedVolunteers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Users size={32} className="mb-2 opacity-40" />
                    <p className="text-sm">Nenhum voluntário arquivado.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr className="text-xs text-gray-400 uppercase tracking-wider">
                            <th className="text-left px-5 py-3">Nome</th>
                            <th className="text-left px-5 py-3 hidden sm:table-cell">Sub-área</th>
                            <th className="text-left px-5 py-3 hidden sm:table-cell">Arquivado em</th>
                            <th className="px-5 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {archivedVolunteers.map(v => (
                            <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="text-sm font-medium text-gray-800">{v.name}</p>
                                <p className="text-xs text-gray-400">{v.phone}</p>
                              </td>
                              <td className="px-5 py-3.5 hidden sm:table-cell">
                                <span className="text-sm text-gray-500">{v.subArea || '—'}</span>
                              </td>
                              <td className="px-5 py-3.5 hidden sm:table-cell">
                                <span className="text-sm text-gray-400 tabular-nums">
                                  {v.archivedAt ? new Date(v.archivedAt).toLocaleDateString('pt-BR') : '—'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => unarchiveVolunteer(v.id)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                >
                                  Reativar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                          {sa.coordinatorNames.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{sa.coordinatorNames.join(', ')}</p>
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
      </div>

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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users, CheckCircle, AlertTriangle, LogOut,
  ChevronRight, Phone
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useVolunteers } from '../hooks/useVolunteers'
import { useMinistries } from '../hooks/useMinistries'
import { getDaysSinceLastContact } from '../data/volunteers'
import { STAGE_ORDER } from '../types'
import JourneyBadge from '../components/JourneyBadge'
import { supabase } from '../lib/supabase'
import type { Volunteer } from '../types'

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
      <CheckCircle size={16} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-xs">×</button>
    </div>
  )
}

export default function MeuMinisterio() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { volunteers, loading: volLoading, setVolunteers } = useVolunteers()
  const { ministries, loading: minLoading } = useMinistries()
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const ministry = ministries.find(m => m.id === profile?.ministry_id)
  const myVolunteers = volunteers.filter(v => v.ministryId === profile?.ministry_id)
  const filtered = myVolunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.subArea.toLowerCase().includes(search.toLowerCase())
  )
  const alertVolunteers = myVolunteers.filter(v => getDaysSinceLastContact(v) >= 7)
  const established = myVolunteers.filter(v => v.currentStage === 'estabelecido').length
  const inJourney = myVolunteers.length - established

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
      prev.map(v => v.id !== id ? v : {
        ...v,
        currentStage: nextStage,
        lastContactDate: now,
        alertDays: 0,
        stageHistory: [...v.stageHistory, { stage: nextStage, date: now }],
      })
    )
    await supabase.from('volunteers').update({ current_stage: nextStage, last_contact_date: now }).eq('id', id)
    await supabase.from('stage_history').insert({ volunteer_id: id, stage: nextStage, date: now })
    showToast('Etapa avançada!')
  }

  const loading = volLoading || minLoading

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/pulse-logo.svg" alt="Pulse" className="w-8 h-8 rounded-lg" />
          <div>
            <p className="text-gray-800 font-semibold text-sm">Pulse</p>
            <p className="text-gray-400 text-xs">Painel do Coordenador</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{profile?.name}</p>
            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Coordenador
            </span>
          </div>
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {profile?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {ministry ? `Ministério ${ministry.name}` : 'Coordenador'} · Seu painel de acompanhamento
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-indigo-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Meus Voluntários</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{myVolunteers.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <ChevronRight size={16} className="text-blue-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Em Jornada</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{inJourney}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estabelecidos</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{established}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aguardam Contato</span>
                </div>
                <p className="text-3xl font-bold text-orange-500">{alertVolunteers.length}</p>
              </div>
            </div>

            {/* Follow-up alerts */}
            {alertVolunteers.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-orange-500" />
                  <h2 className="font-semibold text-orange-800">
                    {alertVolunteers.length} voluntário{alertVolunteers.length !== 1 ? 's' : ''} aguardando follow-up
                  </h2>
                </div>
                <div className="space-y-2">
                  {alertVolunteers.map(v => {
                    const days = getDaysSinceLastContact(v)
                    return (
                      <div
                        key={v.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl px-4 py-3 border border-orange-200 gap-3"
                      >
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
                          {v.phone && (
                            <a
                              href={`tel:${v.phone}`}
                              className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 hover:text-indigo-600"
                            >
                              <Phone size={11} /> {v.phone}
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => markContacted(v.id)}
                            className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          >
                            <CheckCircle size={13} /> Contato feito
                          </button>
                          <button
                            onClick={() => advanceStage(v.id)}
                            className="flex items-center gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            disabled={STAGE_ORDER.indexOf(v.currentStage) === STAGE_ORDER.length - 1}
                          >
                            <ChevronRight size={13} /> Avançar Etapa
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Volunteer list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Todos os Voluntários</h2>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-xs text-gray-400 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Nome</th>
                        <th className="text-left px-5 py-3">Área</th>
                        <th className="text-left px-5 py-3">Etapa</th>
                        <th className="text-left px-5 py-3">Último Contato</th>
                        <th className="text-left px-5 py-3">Telefone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(v => {
                        const days = getDaysSinceLastContact(v)
                        return (
                          <tr
                            key={v.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/voluntario/${v.id}`)}
                          >
                            <td className="px-5 py-3.5">
                              <span className="text-sm font-medium text-gray-800">{v.name}</span>
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
                              <span className="text-sm text-gray-500 font-mono">{v.phone}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Search size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum voluntário encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

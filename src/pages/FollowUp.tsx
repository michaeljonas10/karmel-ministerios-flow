import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Phone, ChevronRight, CheckCircle, Plus } from 'lucide-react';
import { getDaysSinceLastContact } from '../data/volunteers';
import { ministries } from '../data/ministries';
import type { Volunteer } from '../types';
import { STAGE_ORDER } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import { useVolunteers } from '../hooks/useVolunteers';
import { supabase } from '../lib/supabase';

type DaysFilter = 'all' | '7' | '14' | '30';

function getRowColor(days: number): string {
  if (days >= 30) return 'bg-red-50 border-l-4 border-l-red-400';
  if (days >= 14) return 'bg-orange-50 border-l-4 border-l-orange-400';
  if (days >= 7) return 'bg-yellow-50 border-l-4 border-l-yellow-400';
  return '';
}

function getDaysBadge(days: number): string {
  if (days >= 30) return 'bg-red-100 text-red-700 font-bold';
  if (days >= 14) return 'bg-orange-100 text-orange-700 font-bold';
  if (days >= 7) return 'bg-yellow-100 text-yellow-700 font-bold';
  return 'bg-green-100 text-green-700 font-medium';
}

export default function FollowUp() {
  const navigate = useNavigate();
  const { volunteers, loading, setVolunteers } = useVolunteers();
  const [search, setSearch] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [coordinatorFilter, setCoordinatorFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState<DaysFilter>('7');
  const [toastMsg, setToastMsg] = useState('');

  const allCoordinators = [...new Set(volunteers.map(v => v.coordinator))].sort();

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function markContacted(id: string) {
    const now = new Date().toISOString();
    setVolunteers((prev: Volunteer[]) => prev.map(v =>
      v.id === id
        ? { ...v, lastContactDate: now, alertDays: 0 }
        : v
    ));
    await supabase.from('volunteers').update({ last_contact_date: now }).eq('id', id);
    showToast('Contato registrado com sucesso!');
  }

  async function advanceStage(id: string) {
    const volunteer = volunteers.find(v => v.id === id);
    if (!volunteer) return;
    const currentIdx = STAGE_ORDER.indexOf(volunteer.currentStage);
    if (currentIdx === STAGE_ORDER.length - 1) return;
    const nextStage = STAGE_ORDER[currentIdx + 1];
    const now = new Date().toISOString();

    setVolunteers((prev: Volunteer[]) => prev.map(v => {
      if (v.id !== id) return v;
      return {
        ...v,
        currentStage: nextStage,
        lastContactDate: now,
        alertDays: 0,
        stageHistory: [...v.stageHistory, { stage: nextStage, date: now }],
      };
    }));

    await supabase.from('volunteers').update({ current_stage: nextStage, last_contact_date: now }).eq('id', id);
    await supabase.from('stage_history').insert({ volunteer_id: id, stage: nextStage, date: now });
    showToast('Etapa avançada com sucesso!');
  }

  // Filter
  const filtered = volunteers.filter(v => {
    const days = getDaysSinceLastContact(v);
    const minDays = daysFilter === 'all' ? 0 : parseInt(daysFilter);
    if (days < minDays) return false;
    if (ministryFilter !== 'all' && v.ministryId !== ministryFilter) return false;
    if (coordinatorFilter !== 'all' && v.coordinator !== coordinatorFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) &&
        !v.subArea.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => getDaysSinceLastContact(b) - getDaysSinceLastContact(a));

  const stats = {
    red: volunteers.filter(v => getDaysSinceLastContact(v) >= 30).length,
    orange: volunteers.filter(v => { const d = getDaysSinceLastContact(v); return d >= 14 && d < 30; }).length,
    yellow: volunteers.filter(v => { const d = getDaysSinceLastContact(v); return d >= 7 && d < 14; }).length,
    green: volunteers.filter(v => getDaysSinceLastContact(v) < 7).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
          <CheckCircle size={16} />
          {toastMsg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Follow-up</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe e gerencie voluntários que precisam de contato</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Crítico (30+ dias)', count: stats.red, color: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
          { label: 'Urgente (14-29 dias)', count: stats.orange, color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
          { label: 'Atenção (7-13 dias)', count: stats.yellow, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', dot: 'bg-yellow-500' },
          { label: 'Em dia (< 7 dias)', count: stats.green, color: 'bg-green-50 border-green-200 text-green-700', dot: 'bg-green-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-xs font-medium opacity-80">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200"></span> Em dia (&lt;7 dias)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200"></span> Atenção (7-13 dias)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-200"></span> Urgente (14-29 dias)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200"></span> Crítico (30+ dias)</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nome ou área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={ministryFilter}
          onChange={e => setMinistryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">Todos os ministérios</option>
          {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={coordinatorFilter}
          onChange={e => setCoordinatorFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">Todos os coordenadores</option>
          {allCoordinators.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={daysFilter}
          onChange={e => setDaysFilter(e.target.value as DaysFilter)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="all">Todos</option>
          <option value="7">7+ dias</option>
          <option value="14">14+ dias</option>
          <option value="30">30+ dias</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-600">
            <span className="font-bold text-gray-800">{filtered.length}</span> voluntários encontrados
          </p>
          <Filter size={14} className="text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Telefone</th>
                <th className="text-left px-5 py-3">Ministério</th>
                <th className="text-left px-5 py-3">Área</th>
                <th className="text-left px-5 py-3">Etapa Atual</th>
                <th className="text-left px-5 py-3">Dias na Etapa</th>
                <th className="text-left px-5 py-3">Coordenador</th>
                <th className="text-left px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => {
                const ministry = ministries.find(m => m.id === v.ministryId);
                const days = getDaysSinceLastContact(v);
                const rowColor = getRowColor(days);
                const badgeColor = getDaysBadge(days);
                return (
                  <tr key={v.id} className={`hover:bg-gray-50/50 transition-colors ${rowColor}`}>
                    <td className="px-5 py-4">
                      <span
                        className="text-sm font-semibold text-gray-800 hover:text-indigo-600 cursor-pointer"
                        onClick={() => navigate(`/voluntario/${v.id}`)}
                      >
                        {v.name}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-500 font-mono">{v.phone}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ministry?.color }} />
                        <span className="text-sm text-gray-600">{ministry?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{v.subArea}</span>
                    </td>
                    <td className="px-5 py-4">
                      <JourneyBadge stage={v.currentStage} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${badgeColor}`}>
                        {days === 0 ? 'Hoje' : `${days} dias`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{v.coordinator}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          onClick={() => markContacted(v.id)}
                          title="Marcar como contatado"
                        >
                          <Phone size={11} />
                          Contato
                        </button>
                        <button
                          className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                          onClick={() => advanceStage(v.id)}
                          disabled={v.currentStage === 'estabelecido'}
                          title="Avançar etapa"
                        >
                          <ChevronRight size={11} />
                          Avançar
                        </button>
                        <button
                          className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          onClick={() => navigate(`/voluntario/${v.id}`)}
                          title="Ver detalhes"
                        >
                          <Plus size={11} />
                          Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <CheckCircle size={40} className="mx-auto mb-3 text-green-300" />
              <p className="text-sm font-medium">Nenhum voluntário encontrado para os filtros atuais!</p>
              <p className="text-xs mt-1">Tente ajustar os filtros de busca.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

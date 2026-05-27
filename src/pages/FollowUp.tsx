import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { Search, Filter, ChevronRight, ChevronLeft, CheckCircle, Plus, ShieldCheck, UserX } from 'lucide-react';
import { getDaysSinceLastContact } from '../data/volunteers';
import { useMinistries } from '../contexts/MinistriesContext';
import { useAuth } from '../contexts/AuthContext';
import WaButton from '../components/WaButton';
import { buildTemplate } from '../data/waTemplates';
import type { Volunteer } from '../types';
import { getMinistryStages, HOW_FOUND_OPTIONS, PLATFORM_GROUPS } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import { useVolunteers } from '../hooks/useVolunteers';
import { supabase } from '../lib/supabase';

const CHECKIN_DAYS = 60;

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
  usePageTitle('Follow-up')
  const navigate = useNavigate();
  const { profile, isAdmin, isLeader } = useAuth();
  const { volunteers, loading, setVolunteers } = useVolunteers();
  const { ministries } = useMinistries();
  const [search, setSearch] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [coordinatorFilter, setCoordinatorFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState<DaysFilter>('7');
  const [toastMsg, setToastMsg] = useState('');
  const [howFoundFilter, setHowFoundFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [semAreaFilter, setSemAreaFilter] = useState(false);
  const [sortCol, setSortCol] = useState<'name' | 'days' | 'registeredAt' | 'area' | 'stage' | 'coordinator'>('days');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const allPlatforms = PLATFORM_GROUPS.flatMap(g => g.items).sort();

  const mySubAreaNames = useMemo(() => {
    if (!profile?.sub_areas || isAdmin || isLeader) return [];
    const ministry = ministries.find(m => m.id === profile.ministry_id);
    if (!ministry) return [];
    const stripPfx = (id: string) => id.replace(/^[^_]+_/, '');
    return (profile.sub_areas as string[])
      .map(id => ministry.subAreas.find(sa => sa.id === id || stripPfx(sa.id) === stripPfx(id))?.name ?? null)
      .filter(Boolean) as string[];
  }, [profile, ministries, isAdmin, isLeader]);

  const scopedVolunteers = useMemo(() => {
    if (isAdmin) return volunteers;
    return volunteers.filter(v => {
      if (v.ministryId !== profile?.ministry_id) return false;
      if (isLeader) return true;
      if (mySubAreaNames.some(s => (v.subAreas ?? [v.subArea]).includes(s))) return true;
      if (profile?.name && v.coordinator === profile.name) return true;
      return false;
    });
  }, [volunteers, isAdmin, isLeader, profile, mySubAreaNames]);

  const allCoordinators = [...new Set(scopedVolunteers.map(v => v.coordinator))].sort();

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
    const stageOrder = getMinistryStages(ministries.find(m => m.id === volunteer.ministryId));
    const currentIdx = stageOrder.indexOf(volunteer.currentStage);
    if (currentIdx === stageOrder.length - 1) return;
    const nextStage = stageOrder[currentIdx + 1];
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

  async function retreatStage(id: string) {
    const volunteer = volunteers.find(v => v.id === id);
    if (!volunteer) return;
    const stageOrder = getMinistryStages(ministries.find(m => m.id === volunteer.ministryId));
    const currentIdx = stageOrder.indexOf(volunteer.currentStage);
    if (currentIdx === 0) return;
    const prevStage = stageOrder[currentIdx - 1];
    const now = new Date().toISOString();

    setVolunteers((prev: Volunteer[]) => prev.map(v => {
      if (v.id !== id) return v;
      return {
        ...v,
        currentStage: prevStage,
        stageHistory: [...v.stageHistory, { stage: prevStage, date: now }],
      };
    }));

    await supabase.from('volunteers').update({ current_stage: prevStage }).eq('id', id);
    await supabase.from('stage_history').insert({ volunteer_id: id, stage: prevStage, date: now, note: 'Etapa retrocedida manualmente' });
    showToast('Etapa retrocedida.');
  }

  async function confirmActive(id: string) {
    const now = new Date().toISOString();
    setVolunteers((prev: Volunteer[]) => prev.map(v =>
      v.id === id ? { ...v, lastContactDate: now, alertDays: 0 } : v
    ));
    await supabase.from('volunteers').update({ last_contact_date: now }).eq('id', id);
    await supabase.from('stage_history').insert({ volunteer_id: id, stage: 'estabelecido', date: now, note: 'Check-in 60 dias: confirmado na escala' });
    showToast('Check-in confirmado! Voluntário ativo na escala.');
  }

  async function markInactive(id: string) {
    const now = new Date().toISOString();
    // Archive immediately — context filters archived_at IS NULL so they disappear from active views
    setVolunteers((prev: Volunteer[]) => prev.filter(v => v.id !== id));
    await supabase.from('volunteers').update({
      current_stage: 'nao_retornou',
      last_contact_date: now,
      archived_at: now,
    }).eq('id', id);
    await supabase.from('stage_history').insert({ volunteer_id: id, stage: 'nao_retornou', date: now, note: 'Saiu da escala — arquivado automaticamente' });
    showToast('Voluntário arquivado.');
  }

  // Established volunteers due for 60-day check-in
  const checkinDue = scopedVolunteers.filter(v =>
    v.currentStage === 'estabelecido' && getDaysSinceLastContact(v) >= CHECKIN_DAYS
  ).sort((a, b) => getDaysSinceLastContact(b) - getDaysSinceLastContact(a));

  // Off-track volunteers
  const inactiveVolunteers = scopedVolunteers.filter(v => v.currentStage === 'mudou_area' || v.currentStage === 'nao_retornou')
    .sort((a, b) => getDaysSinceLastContact(b) - getDaysSinceLastContact(a));

  // Filter — exclude established and off-track (separate sections)
  const excludedStages = new Set(['estabelecido', 'mudou_area', 'nao_retornou']);

  const isOffTrack = (v: Volunteer) => v.currentStage === 'mudou_area' || v.currentStage === 'nao_retornou';
  const inJourney = (v: Volunteer) => v.currentStage !== 'estabelecido' && !isOffTrack(v);
  const stats = {
    red:    scopedVolunteers.filter(v => inJourney(v) && getDaysSinceLastContact(v) >= 30).length,
    orange: scopedVolunteers.filter(v => { const d = getDaysSinceLastContact(v); return inJourney(v) && d >= 14 && d < 30; }).length,
    yellow: scopedVolunteers.filter(v => { const d = getDaysSinceLastContact(v); return inJourney(v) && d >= 7 && d < 14; }).length,
    green:  scopedVolunteers.filter(v => inJourney(v) && getDaysSinceLastContact(v) < 7).length,
    checkin: checkinDue.length,
    inativo: inactiveVolunteers.length,
  };

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }
  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const filtered = scopedVolunteers.filter(v => {
    if (excludedStages.has(v.currentStage)) return false;
    const days = getDaysSinceLastContact(v);
    const minDays = daysFilter === 'all' ? 0 : parseInt(daysFilter);
    if (days < minDays) return false;
    if (ministryFilter !== 'all' && v.ministryId !== ministryFilter) return false;
    if (coordinatorFilter !== 'all' && v.coordinator !== coordinatorFilter) return false;
    if (howFoundFilter !== 'all' && v.howFound !== howFoundFilter) return false;
    if (platformFilter !== 'all' && !(v.platforms ?? []).includes(platformFilter)) return false;
    if (semAreaFilter && v.subArea !== '') return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) &&
        !v.subArea.toLowerCase().includes(search.toLowerCase()) &&
        !v.coordinator.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'days') cmp = getDaysSinceLastContact(b) - getDaysSinceLastContact(a);
    else if (sortCol === 'name') cmp = a.name.localeCompare(b.name, 'pt-BR');
    else if (sortCol === 'registeredAt') cmp = new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
    else if (sortCol === 'area') cmp = (a.subArea || '').localeCompare(b.subArea || '', 'pt-BR');
    else if (sortCol === 'stage') cmp = a.currentStage.localeCompare(b.currentStage);
    else if (sortCol === 'coordinator') cmp = (a.coordinator || '').localeCompare(b.coordinator || '', 'pt-BR');
    return sortDir === 'asc' ? -cmp : cmp;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 min-w-0 w-full">
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Crítico (30+ dias)', count: stats.red, color: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
          { label: 'Urgente (14-29 dias)', count: stats.orange, color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
          { label: 'Atenção (7-13 dias)', count: stats.yellow, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', dot: 'bg-yellow-500' },
          { label: 'Em dia (< 7 dias)', count: stats.green, color: 'bg-green-50 border-green-200 text-green-700', dot: 'bg-green-500' },
          { label: 'Check-in pendente (60d)', count: stats.checkin, color: 'bg-purple-50 border-purple-200 text-purple-700', dot: 'bg-purple-500' },
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

      {/* ── Check-in 60 dias ─────────────────────────────── */}
      {checkinDue.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-200 bg-purple-100/60">
            <ShieldCheck size={16} className="text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Check-in de Estabelecidos</p>
              <p className="text-xs text-purple-600">{checkinDue.length} voluntário{checkinDue.length !== 1 ? 's' : ''} sem confirmação há 60+ dias — verificar se continuam na escala</p>
            </div>
          </div>
          <div className="divide-y divide-purple-100">
            {checkinDue.map(v => {
              const days = getDaysSinceLastContact(v);
              const ministry = ministries.find(m => m.id === v.ministryId);
              return (
                <div key={v.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <button
                      className="text-sm font-semibold text-gray-800 hover:text-indigo-600 text-left"
                      onClick={() => navigate(`/voluntario/${v.id}`)}
                    >
                      {v.name}
                    </button>
                    <p className="text-xs text-gray-500 mt-0.5">{ministry?.name} · {v.subArea} · {v.coordinator}</p>
                    <p className="text-xs font-semibold text-purple-600 mt-0.5">{days} dias sem check-in</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <WaButton phone={v.phone} message={buildTemplate(v.currentStage, v, ministry?.name ?? '', profile?.name)} size="sm" onClick={() => v.phone && confirmActive(v.id)} />
                    <button
                      onClick={() => confirmActive(v.id)}
                      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle size={13} />
                      Na escala
                    </button>
                    <button
                      onClick={() => markInactive(v.id)}
                      className="flex items-center gap-1.5 text-xs bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <UserX size={13} />
                      Saiu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar nome, área, coordenador..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {isAdmin && (
            <select value={ministryFilter} onChange={e => setMinistryFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="all">Todos os ministérios</option>
              {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select value={coordinatorFilter} onChange={e => setCoordinatorFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="all">Todos os coordenadores</option>
            {allCoordinators.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={howFoundFilter} onChange={e => setHowFoundFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="all">Como chegou (todos)</option>
            {HOW_FOUND_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="all">Plataforma/conhecimento</option>
            {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={daysFilter} onChange={e => setDaysFilter(e.target.value as DaysFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="all">Todos os períodos</option>
            <option value="7">7+ dias sem contato</option>
            <option value="14">14+ dias sem contato</option>
            <option value="30">30+ dias sem contato</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer border border-gray-200 rounded-lg px-3 py-2">
            <input type="checkbox" checked={semAreaFilter} onChange={e => setSemAreaFilter(e.target.checked)} className="accent-indigo-600" />
            <span className="text-sm text-gray-600">Apenas sem área</span>
          </label>
        </div>
      </div>

      {/* Table — em jornada */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              <span className="font-bold text-gray-800">{filtered.length}</span> voluntários em jornada
            </p>
          </div>
          <Filter size={14} className="text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                {[
                  { col: 'name' as const, label: 'Nome' },
                  { col: null, label: 'Telefone' },
                  ...(isAdmin ? [{ col: null as null, label: 'Ministério' }] : []),
                  { col: 'area' as const, label: 'Área' },
                  { col: 'stage' as const, label: 'Etapa' },
                  { col: 'days' as const, label: 'Sem Contato' },
                  { col: null, label: 'Último Contato' },
                  { col: 'registeredAt' as const, label: 'Cadastrado' },
                  { col: 'coordinator' as const, label: 'Coordenador' },
                  { col: null, label: 'Ações' },
                ].map(({ col, label }) => (
                  <th key={label} className={`text-left px-4 py-3 ${col ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                    onClick={() => col && handleSort(col)}>
                    {label}{col && <SortIcon col={col} />}
                  </th>
                ))}
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
                    <td className="px-4 py-4">
                      <span
                        className="text-sm font-semibold text-gray-800 hover:text-indigo-600 cursor-pointer"
                        onClick={() => navigate(`/voluntario/${v.id}`)}
                      >
                        {v.name}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-500 font-mono">{v.phone}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ministry?.color }} />
                          <span className="text-sm text-gray-600">{ministry?.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{v.subArea}</span>
                    </td>
                    <td className="px-4 py-4">
                      <JourneyBadge stage={v.currentStage} size="sm" />
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${badgeColor}`}>
                        {days === 0 ? 'Hoje' : `${days} dias`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {v.lastContactDate ? new Date(v.lastContactDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {v.registeredAt ? new Date(v.registeredAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{v.coordinator}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <WaButton phone={v.phone} message={buildTemplate(v.currentStage, v, ministry?.name ?? '', profile?.name)} onClick={() => v.phone && markContacted(v.id)} />
                        <button
                          className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 px-2 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-30"
                          onClick={() => retreatStage(v.id)}
                          disabled={v.currentStage === 'cadastrado'}
                          title="Retroceder etapa"
                        >
                          <ChevronLeft size={11} />
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

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { LayoutGrid, List, Search, Users, CheckSquare, Square, ChevronRight, Download, X, Tag, Upload, GripVertical } from 'lucide-react';
import CsvImportModal from '../components/CsvImportModal';
import { useMinistries } from '../contexts/MinistriesContext';
import { getDaysSinceLastContact } from '../data/volunteers';
import { STAGE_ORDER, STAGE_LABELS, HOW_FOUND_OPTIONS } from '../types';
import type { JourneyStage, Volunteer } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import VolunteerCard from '../components/VolunteerCard';
import { useVolunteers } from '../hooks/useVolunteers';
import { supabase } from '../lib/supabase';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';

function DraggableCard({ volunteer }: { volunteer: Volunteer }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: volunteer.id });
  return (
    <div ref={setNodeRef} {...attributes} style={{ opacity: isDragging ? 0.4 : 1, position: 'relative' }}>
      {/* Drag handle — top-left grip, does not interfere with card click */}
      <div
        {...listeners}
        style={{ touchAction: 'none' }}
        className="absolute top-1.5 left-1.5 z-10 p-1 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>
      <div onClick={() => navigate(`/voluntario/${volunteer.id}`)}>
        <VolunteerCard volunteer={volunteer} />
      </div>
    </div>
  );
}

function DroppableColumn({
  stage, children, isOver,
}: { stage: JourneyStage; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: stage });
  let cls = 'rounded-b-xl min-h-24 p-2 space-y-2 transition-colors ';
  cls += isOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : 'bg-gray-50';
  return (
    <div ref={setNodeRef} className={cls}>
      {children}
    </div>
  );
}

export default function MinistryPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ministries } = useMinistries();
  const ministry = ministries.find(m => m.id === (id || ''));
  usePageTitle(ministry?.name ?? 'Ministério');
  const [view, setView] = useState<'kanban' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [subAreaFilter, setSubAreaFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<30 | 60 | 90 | 0>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkHowFound, setBulkHowFound] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<JourneyStage | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [sortCol, setSortCol] = useState<'name' | 'days' | 'registeredAt' | 'area' | 'stage' | 'coordinator' | 'lastContact'>('days');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { volunteers, loading, setVolunteers, refetch } = useVolunteers();

  // Load capacities from localStorage (capacity per sub-area, keyed by subAreaName)
  const capacities: Record<string, number> = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('subAreaCapacities') || '{}'); } catch { return {}; }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  if (!ministry) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Ministério não encontrado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Carregando dados...</p>
      </div>
    );
  }

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }
  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const allVolunteers = volunteers.filter(v => v.ministryId === ministry.id);
  const filtered = allVolunteers
    .filter(v => {
      if (['mudou_area', 'nao_retornou'].includes(v.currentStage)) return false;
      if (subAreaFilter !== 'all' && subAreaFilter !== '__sem_area__' &&
          v.subArea !== subAreaFilter && !(v.subAreas ?? []).includes(subAreaFilter)) return false;
      if (subAreaFilter === '__sem_area__' && (v.subAreas ?? [v.subArea]).some(s => s)) return false;
      const q = search.toLowerCase();
      if (q && !v.name.toLowerCase().includes(q) &&
          !v.subArea.toLowerCase().includes(q) &&
          !v.coordinator.toLowerCase().includes(q)) return false;
      if (periodFilter > 0) {
        const days = (Date.now() - new Date(v.registeredAt).getTime()) / 86400000;
        if (days > periodFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'days') cmp = getDaysSinceLastContact(b) - getDaysSinceLastContact(a);
      else if (sortCol === 'name') cmp = a.name.localeCompare(b.name, 'pt-BR');
      else if (sortCol === 'registeredAt') cmp = new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      else if (sortCol === 'area') cmp = (a.subArea || '').localeCompare(b.subArea || '', 'pt-BR');
      else if (sortCol === 'stage') cmp = a.currentStage.localeCompare(b.currentStage);
      else if (sortCol === 'coordinator') cmp = (a.coordinator || '').localeCompare(b.coordinator || '', 'pt-BR');
      else if (sortCol === 'lastContact') cmp = new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime();
      return sortDir === 'asc' ? -cmp : cmp;
    });

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(v => v.id)));
  }
  async function bulkSetHowFound() {
    if (!bulkHowFound || selected.size === 0) return;
    setBulkApplying(true);
    const ids = [...selected];
    setVolunteers((prev: Volunteer[]) => prev.map(v => ids.includes(v.id) ? { ...v, howFound: bulkHowFound } : v));
    await supabase.from('volunteers').update({ how_found: bulkHowFound }).in('id', ids);
    setBulkApplying(false);
    setSelected(new Set());
    setBulkHowFound('');
  }

  async function bulkAdvance() {
    for (const id of selected) {
      const v = volunteers.find(x => x.id === id);
      if (!v || STAGE_ORDER.indexOf(v.currentStage) >= STAGE_ORDER.length - 1) continue;
      const next = STAGE_ORDER[STAGE_ORDER.indexOf(v.currentStage) + 1];
      const now = new Date().toISOString();
      setVolunteers((prev: Volunteer[]) => prev.map(x => x.id !== id ? x : { ...x, currentStage: next, lastContactDate: now }));
      await supabase.from('volunteers').update({ current_stage: next, last_contact_date: now }).eq('id', id);
      await supabase.from('stage_history').insert({ volunteer_id: id, stage: next, date: now, note: 'Avanço em lote' });
    }
    setSelected(new Set());
  }
  function exportCSV() {
    const rows = [
      ['Nome', 'Área', 'Coordenador', 'Etapa', 'Telefone', 'Último Contato'],
      ...filtered.map(v => [v.name, v.subArea, v.coordinator, v.currentStage, v.phone, v.lastContactDate]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${ministry?.name ?? 'ministerio'}-voluntarios.csv`;
    a.click();
  }

  const subAreaCounts = ministry.subAreas.map(sa => ({
    ...sa,
    count: allVolunteers.filter(v => (v.subAreas ?? [v.subArea]).includes(sa.name)).length,
    established: allVolunteers.filter(v => (v.subAreas ?? [v.subArea]).includes(sa.name) && v.currentStage === 'estabelecido').length,
  }));

  async function moveToStage(volunteerId: string, targetStage: JourneyStage) {
    const volunteer = volunteers.find(v => v.id === volunteerId);
    if (!volunteer || volunteer.currentStage === targetStage) return;
    const now = new Date().toISOString();
    setVolunteers((prev: Volunteer[]) => prev.map(v =>
      v.id !== volunteerId ? v : {
        ...v,
        currentStage: targetStage,
        lastContactDate: now,
        alertDays: 0,
        stageHistory: [...v.stageHistory, { stage: targetStage, date: now }],
      }
    ));
    await supabase.from('volunteers').update({ current_stage: targetStage, last_contact_date: now }).eq('id', volunteerId);
    await supabase.from('stage_history').insert({ volunteer_id: volunteerId, stage: targetStage, date: now });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const stage = event.over?.id as JourneyStage | null;
    setOverStage(STAGE_ORDER.includes(stage as JourneyStage) ? stage : null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverStage(null);
    const { active, over } = event;
    if (!over) return;
    const targetStage = over.id as JourneyStage;
    if (STAGE_ORDER.includes(targetStage)) {
      await moveToStage(active.id as string, targetStage);
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 min-w-0 w-full">
      {/* Header */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${ministry.color}dd, ${ministry.color}99)` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-1">Ministério</p>
            <h1 className="text-3xl font-bold">{ministry.name}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {ministry.coordinators.map(c => (
                <span key={c} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{allVolunteers.length}</p>
            <p className="text-white/70 text-sm">voluntários</p>
          </div>
        </div>
        <div className="flex gap-6 mt-5 pt-5 border-t border-white/20">
          <div>
            <p className="text-xl font-bold">{allVolunteers.filter(v => v.currentStage === 'estabelecido').length}</p>
            <p className="text-white/70 text-xs">Estabelecidos</p>
          </div>
          <div>
            <p className="text-xl font-bold">{allVolunteers.filter(v => !['mudou_area','nao_retornou'].includes(v.currentStage) && v.currentStage !== 'estabelecido').length}</p>
            <p className="text-white/70 text-xs">Em Jornada</p>
          </div>
        </div>
      </div>

      {/* Sub-areas grid — clickable filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Sub-Áreas</h2>
          {subAreaFilter !== 'all' && (
            <button
              onClick={() => setSubAreaFilter('all')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Limpar filtro ×
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {subAreaCounts.map(sa => {
            const isActive = subAreaFilter === sa.name;
            return (
              <div
                key={sa.id}
                onClick={() => setSubAreaFilter(isActive ? 'all' : sa.name)}
                className={`rounded-xl p-4 shadow-sm border transition-all cursor-pointer select-none
                  ${isActive
                    ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'
                  }`}
              >
                <p className="text-sm font-semibold text-gray-800 leading-tight">{sa.name}</p>
                {sa.coordinatorNames.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{sa.coordinatorNames.join(', ')}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-gray-400" />
                    <span className="text-lg font-bold text-gray-800">{sa.count}</span>
                    {capacities[sa.name] > 0 && (
                      <span className={`text-xs font-medium ${sa.count >= capacities[sa.name] ? 'text-red-500' : 'text-gray-400'}`}>
                        / {capacities[sa.name]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    {sa.established} est.
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: capacities[sa.name] > 0
                        ? `${Math.min((sa.count / capacities[sa.name]) * 100, 100)}%`
                        : sa.count > 0 ? `${(sa.established / sa.count) * 100}%` : '0%',
                      backgroundColor: capacities[sa.name] > 0 && sa.count >= capacities[sa.name] ? '#ef4444' : ministry.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {/* Sem área filter button */}
        <div className="mt-3">
          <button
            onClick={() => setSubAreaFilter(subAreaFilter === '__sem_area__' ? 'all' : '__sem_area__')}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${subAreaFilter === '__sem_area__' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
          >
            Sem área
          </button>
        </div>
      </div>

      {/* View toggle + Search + Filters */}
      <div className="flex flex-col gap-2">
        {/* Row 1: busca + importar CSV */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar voluntário, área, coordenador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>
          <button
            onClick={() => setShowImport(true)}
            title="Importar CSV"
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded-xl font-medium transition-colors flex-shrink-0"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Importar CSV</span>
          </button>
        </div>

        {/* Row 2: período + toggle Tabela/Kanban */}
        <div className="flex items-center gap-2">
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(Number(e.target.value) as 0 | 30 | 60 | 90)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-600"
          >
            <option value={0}>Todos os períodos</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={15} />
              Tabela
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={15} />
              Kanban
            </button>
          </div>
        </div>

        {/* Bulk toolbar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-indigo-700 flex-shrink-0">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
            <button
              onClick={bulkAdvance}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
            >
              <ChevronRight size={13} /> Avançar etapa
            </button>
            {/* Como chegou bulk */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Tag size={13} className="text-indigo-500" />
              <select
                value={bulkHowFound}
                onChange={e => setBulkHowFound(e.target.value)}
                className="border border-indigo-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Como chegou...</option>
                {HOW_FOUND_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button
                onClick={bulkSetHowFound}
                disabled={!bulkHowFound || bulkApplying}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {bulkApplying ? '...' : 'Aplicar'}
              </button>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
            >
              <Download size={13} /> Exportar seleção
            </button>
            <button onClick={() => { setSelected(new Set()); setBulkHowFound(''); }} className="ml-auto text-indigo-400 hover:text-indigo-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare size={15} className="text-indigo-600" />
                        : <Square size={15} />}
                    </button>
                  </th>
                  {[
                    { col: 'name' as const, label: 'Nome' },
                    { col: 'area' as const, label: 'Área' },
                    { col: 'coordinator' as const, label: 'Coordenador' },
                    { col: null, label: 'Como chegou' },
                    { col: 'stage' as const, label: 'Etapa' },
                    { col: 'days' as const, label: 'Sem Contato' },
                    { col: 'lastContact' as const, label: 'Último Contato' },
                    { col: 'registeredAt' as const, label: 'Cadastrado' },
                    { col: null, label: 'Telefone' },
                  ].map(({ col, label }) => (
                    <th
                      key={label}
                      className={`text-left px-5 py-3 ${col ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                      onClick={() => col && handleSort(col)}
                    >
                      {label}{col && <SortIcon col={col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => {
                  const days = getDaysSinceLastContact(v);
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selected.has(v.id) ? 'bg-indigo-50' : ''}`}
                      onClick={() => navigate(`/voluntario/${v.id}`)}
                    >
                      <td className="px-4 py-3.5" onClick={e => { e.stopPropagation(); toggleSelect(v.id); }}>
                        {selected.has(v.id)
                          ? <CheckSquare size={15} className="text-indigo-600" />
                          : <Square size={15} className="text-gray-300" />}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-gray-800">{v.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-600">{v.subArea}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-600">{v.coordinator}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {v.howFound
                          ? <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{v.howFound}</span>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <JourneyBadge stage={v.currentStage} size="sm" />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-medium ${
                          days >= 14 ? 'text-red-600' : days >= 7 ? 'text-orange-500' : 'text-gray-600'
                        }`}>
                          {days === 0 ? 'Hoje' : `${days} dias`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {v.lastContactDate ? new Date(v.lastContactDate).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {v.registeredAt ? new Date(v.registeredAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-500 font-mono">{v.phone}</span>
                      </td>
                    </tr>
                  );
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
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <CsvImportModal
          defaultMinistryId={ministry.id}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            refetch();
          }}
        />
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {/* Track columns only — off-track columns removed */}
              {STAGE_ORDER.map(stage => {
                const stageVolunteers = filtered.filter(v => v.currentStage === stage);
                const isOver = overStage === stage;
                return (
                  <div key={stage} className="w-56 flex-shrink-0">
                    <div className="bg-gray-100 rounded-t-xl px-3 py-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-600 leading-tight">{STAGE_LABELS[stage]}</p>
                      <span className="text-xs bg-white text-gray-600 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {stageVolunteers.length}
                      </span>
                    </div>
                    <DroppableColumn stage={stage} isOver={isOver}>
                      {stageVolunteers.map(v => (
                        <DraggableCard key={v.id} volunteer={v} />
                      ))}
                      {stageVolunteers.length === 0 && (
                        <div className={`text-center py-6 text-xs ${isOver ? 'text-indigo-400' : 'text-gray-300'}`}>
                          {isOver ? 'Soltar aqui' : 'Vazio'}
                        </div>
                      )}
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="opacity-90 rotate-2 scale-105">
                <VolunteerCard volunteer={volunteers.find(v => v.id === activeId)!} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

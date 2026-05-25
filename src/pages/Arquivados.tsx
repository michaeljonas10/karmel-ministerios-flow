import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMinistries } from '../contexts/MinistriesContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { STAGE_LABELS } from '../types';
import type { JourneyStage } from '../types';
import { Archive, Search, RotateCcw, ChevronRight } from 'lucide-react';

interface ArchivedVolunteer {
  id: string;
  name: string;
  phone: string;
  subArea: string;
  coordinator: string;
  ministryId: string;
  ministryName: string;
  currentStage: JourneyStage;
  archivedAt: string;
  lastContactDate: string;
}

export default function Arquivados() {
  usePageTitle('Arquivados');
  const { profile, isAdmin } = useAuth();
  const { ministries } = useMinistries();
  const navigate = useNavigate();

  const [volunteers, setVolunteers] = useState<ArchivedVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMinistry, setFilterMinistry] = useState('');
  const [reactivating, setReactivating] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('volunteers')
      .select('id, name, phone, sub_area, coordinator, ministry_id, current_stage, archived_at, last_contact_date')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });

    // Coordinator vê só seu ministério
    if (!isAdmin && profile?.ministry_id) {
      query = query.eq('ministry_id', profile.ministry_id);
    }

    const { data } = await query;
    if (data) {
      setVolunteers(data.map(v => ({
        id: v.id,
        name: v.name,
        phone: v.phone,
        subArea: v.sub_area,
        coordinator: v.coordinator,
        ministryId: v.ministry_id,
        ministryName: ministries.find(m => m.id === v.ministry_id)?.name ?? v.ministry_id,
        currentStage: v.current_stage as JourneyStage,
        archivedAt: v.archived_at,
        lastContactDate: v.last_contact_date,
      })));
    }
    setLoading(false);
  }

  async function reactivate(v: ArchivedVolunteer) {
    setReactivating(v.id);
    const now = new Date().toISOString();
    await supabase.from('volunteers').update({ archived_at: null, current_stage: 'cadastrado' }).eq('id', v.id);
    await supabase.from('stage_history').insert({
      volunteer_id: v.id,
      stage: 'cadastrado',
      date: now,
      note: 'Reativado a partir dos arquivados',
      changed_by: profile?.name ?? 'Desconhecido',
    });
    setVolunteers(prev => prev.filter(x => x.id !== v.id));
    setReactivating(null);
  }

  const filtered = volunteers.filter(v => {
    const matchSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.subArea.toLowerCase().includes(search.toLowerCase()) ||
      v.coordinator.toLowerCase().includes(search.toLowerCase());
    const matchMinistry = !filterMinistry || v.ministryId === filterMinistry;
    return matchSearch && matchMinistry;
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Archive size={20} className="text-gray-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Arquivados</h1>
          <p className="text-sm text-gray-500">
            {loading ? 'Carregando...' : `${volunteers.length} voluntário${volunteers.length !== 1 ? 's' : ''} arquivado${volunteers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, sub-área ou coordenador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        {isAdmin && (
          <select
            value={filterMinistry}
            onChange={e => setFilterMinistry(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos os ministérios</option>
            {ministries.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Archive size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">
            {search || filterMinistry ? 'Nenhum resultado encontrado.' : 'Nenhum voluntário arquivado.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Sub-área</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Último status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Arquivado em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <button
                        onClick={() => navigate(`/voluntario/${v.id}`)}
                        className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-sm flex items-center gap-1"
                      >
                        {v.name}
                        <ChevronRight size={12} className="text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5">{v.coordinator || '—'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-600">{v.subArea || '—'}</span>
                    {isAdmin && (
                      <p className="text-xs text-gray-400">{v.ministryName}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.currentStage === 'nao_retornou' ? 'bg-red-50 text-red-600' :
                      v.currentStage === 'mudou_area' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {STAGE_LABELS[v.currentStage] ?? v.currentStage}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-sm text-gray-500">
                    {formatDate(v.archivedAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => reactivate(v)}
                      disabled={reactivating === v.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 ml-auto"
                    >
                      <RotateCcw size={13} />
                      {reactivating === v.id ? 'Reativando...' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

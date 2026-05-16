import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Search, Users, AlertTriangle } from 'lucide-react';
import { getMinistryById } from '../data/ministries';
import { getVolunteersByMinistry, getDaysSinceLastContact } from '../data/volunteers';
import { STAGE_ORDER, STAGE_LABELS } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import VolunteerCard from '../components/VolunteerCard';

export default function MinistryPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ministry = getMinistryById(id || '');
  const [view, setView] = useState<'kanban' | 'table'>('table');
  const [search, setSearch] = useState('');

  if (!ministry) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Ministério não encontrado.</p>
      </div>
    );
  }

  const allVolunteers = getVolunteersByMinistry(ministry.id);
  const filtered = allVolunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.subArea.toLowerCase().includes(search.toLowerCase()) ||
    v.coordinator.toLowerCase().includes(search.toLowerCase())
  );
  const alertVolunteers = allVolunteers.filter(v => {
    const days = getDaysSinceLastContact(v);
    return days >= 7;
  });

  // Compute sub-area volunteer counts
  const subAreaCounts = ministry.subAreas.map(sa => ({
    ...sa,
    count: allVolunteers.filter(v => v.subArea === sa.name).length,
    established: allVolunteers.filter(v => v.subArea === sa.name && v.currentStage === 'estabelecido').length,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-6">
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
            <p className="text-xl font-bold">{allVolunteers.filter(v => v.currentStage !== 'estabelecido').length}</p>
            <p className="text-white/70 text-xs">Em Jornada</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-300">{alertVolunteers.length}</p>
            <p className="text-white/70 text-xs">Com Alertas</p>
          </div>
        </div>
      </div>

      {/* Sub-areas grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Sub-Áreas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {subAreaCounts.map(sa => (
            <div
              key={sa.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <p className="text-sm font-semibold text-gray-800 leading-tight">{sa.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sa.coordinator}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-gray-400" />
                  <span className="text-lg font-bold text-gray-800">{sa.count}</span>
                </div>
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                  {sa.established} est.
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: sa.count > 0 ? `${(sa.established / sa.count) * 100}%` : '0%',
                    backgroundColor: ministry.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alertVolunteers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-800">
              {alertVolunteers.length} voluntário{alertVolunteers.length !== 1 ? 's' : ''} aguardando follow-up
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alertVolunteers.map(v => {
              const days = getDaysSinceLastContact(v);
              return (
                <button
                  key={v.id}
                  className="text-left bg-white rounded-lg px-3 py-2.5 border border-orange-200 hover:border-orange-400 transition-colors"
                  onClick={() => navigate(`/voluntario/${v.id}`)}
                >
                  <p className="text-sm font-medium text-gray-800">{v.name}</p>
                  <p className="text-xs text-gray-500">{v.subArea} · {v.coordinator}</p>
                  <p className="text-xs font-semibold text-orange-600 mt-1">{days} dias sem contato</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View toggle + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar voluntário, área, coordenador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              view === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={15} />
            Tabela
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              view === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={15} />
            Kanban
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">Área</th>
                  <th className="text-left px-5 py-3">Coordenador</th>
                  <th className="text-left px-5 py-3">Etapa</th>
                  <th className="text-left px-5 py-3">Último Contato</th>
                  <th className="text-left px-5 py-3">Telefone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => {
                  const days = getDaysSinceLastContact(v);
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
                        <span className="text-sm text-gray-600">{v.coordinator}</span>
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

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGE_ORDER.map(stage => {
              const stageVolunteers = filtered.filter(v => v.currentStage === stage);
              return (
                <div key={stage} className="w-56 flex-shrink-0">
                  <div className="bg-gray-100 rounded-t-xl px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600 leading-tight">{STAGE_LABELS[stage]}</p>
                    <span className="text-xs bg-white text-gray-600 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {stageVolunteers.length}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-b-xl min-h-24 p-2 space-y-2">
                    {stageVolunteers.map(v => (
                      <VolunteerCard key={v.id} volunteer={v} />
                    ))}
                    {stageVolunteers.length === 0 && (
                      <div className="text-center py-6 text-gray-300 text-xs">Vazio</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

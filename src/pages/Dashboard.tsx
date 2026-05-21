import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Users, TrendingUp, Award, AlertTriangle, Phone, UserPlus, X, Check, Upload, Cake } from 'lucide-react';
import ImportModal from '../components/ImportModal';
import { getDaysSinceLastContact } from '../data/volunteers';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import { useVolunteers } from '../hooks/useVolunteers';
import { useMinistries } from '../hooks/useMinistries';
import { supabase } from '../lib/supabase';

function KPICard({
  label, value, sub, icon, color
}: { label: string; value: number | string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm font-medium text-gray-700 leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Add Volunteer Modal ──────────────────────────────────────────────────────
function AddVolunteerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { ministries: mins } = useMinistries();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', ministryId: '', subArea: '', coordinator: '', notes: '', howFound: '', participatesGc: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedMinistry = mins.find(m => m.id === form.ministryId);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // Auto-fill coordinator when sub-area is picked (store NAME, not ID)
  const handleSubArea = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sub = selectedMinistry?.subAreas.find(s => s.name === e.target.value);
    const coordName = sub?.coordinatorNames?.[0] || sub?.coordinator || '';
    setForm(p => ({ ...p, subArea: e.target.value, coordinator: coordName }));
  };

  const handleMinistry = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(p => ({ ...p, ministryId: e.target.value, subArea: '', coordinator: '' }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.ministryId || !form.subArea) {
      setError('Preencha os campos obrigatórios: nome, WhatsApp, ministério e sub-área.');
      return;
    }
    setSaving(true);
    setError('');
    const id = 'v' + Date.now();
    const now = new Date().toISOString();

    const { error: err } = await supabase.from('volunteers').insert({
      id, name: form.name.trim(), phone: form.phone.trim(),
      email: form.email.trim() || null,
      ministry_id: form.ministryId, sub_area: form.subArea,
      coordinator: form.coordinator.trim(),
      how_found: form.howFound || null,
      participates_gc: form.participatesGc === 'Sim' ? true : form.participatesGc === 'Não' ? false : null,
      current_stage: 'cadastrado', notes: form.notes.trim(),
      registered_at: now, last_contact_date: now,
    });

    if (err) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return; }

    await supabase.from('stage_history').insert({ volunteer_id: id, stage: 'cadastrado', date: now });

    setSuccess(true);
    setTimeout(() => { onSaved(); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <UserPlus size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-bold text-gray-900">Adicionar Voluntário</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={28} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-800">Voluntário cadastrado!</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dados Pessoais</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                  <input value={form.name} onChange={set('name')} placeholder="Nome do voluntário"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                  <input value={form.phone} onChange={set('phone')} placeholder="(31) 9 0000-0000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input value={form.email} onChange={set('email')} placeholder="email@opcional.com" type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Ministério</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ministério *</label>
                  <select value={form.ministryId} onChange={handleMinistry}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Selecione...</option>
                    {mins.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sub-área *</label>
                  <select value={form.subArea} onChange={handleSubArea} disabled={!form.ministryId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                    <option value="">Selecione...</option>
                    {selectedMinistry?.subAreas.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coordenador responsável</label>
                  <input value={form.coordinator} onChange={set('coordinator')} placeholder="Preenchido automaticamente pela sub-área"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Como chegou até nós?</label>
                  <select value={form.howFound} onChange={set('howFound')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Selecione...</option>
                    {['Integra','Culto Visão','App da Igreja','Indicação de Membro'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Participa de GC?</label>
                  <div className="flex gap-2 mt-1">
                    {['Sim', 'Não'].map(opt => (
                      <label key={opt} className={`flex-1 flex items-center justify-center gap-1.5 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                        form.participatesGc === opt
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>
                        <input type="radio" name="participatesGc" value={opt}
                          checked={form.participatesGc === opt}
                          onChange={e => setForm(p => ({ ...p, participatesGc: e.target.value }))}
                          className="hidden" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea value={form.notes} onChange={set('notes')} rows={1} placeholder="Notas..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Salvando...' : <><UserPlus size={15} /> Cadastrar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  const navigate = useNavigate();
  const { volunteers, loading, refetch } = useVolunteers();
  const { ministries } = useMinistries();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // KPI calculations
  const total = volunteers.length;
  const established = volunteers.filter(v => v.currentStage === 'estabelecido').length;
  const inJourney = volunteers.filter(v => v.currentStage !== 'estabelecido').length;
  const alerts = volunteers
    .filter(v => getDaysSinceLastContact(v) >= 7)
    .sort((a, b) => getDaysSinceLastContact(b) - getDaysSinceLastContact(a));

  // Funnel data
  const funnelData = STAGE_ORDER.map(stage => ({
    name: STAGE_LABELS[stage],
    count: volunteers.filter(v => v.currentStage === stage).length,
    shortName: STAGE_LABELS[stage].split(' ')[0],
  }));

  // Ministry pie data
  const ministryData = ministries.map(m => ({
    name: m.name,
    value: volunteers.filter(v => v.ministryId === m.id).length,
    color: m.color,
  }));

  // Timeline: last 12 weeks (always relative to today)
  function getWeeklyData() {
    const now = new Date();
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const count = volunteers.filter(v => {
        const d = new Date(v.registeredAt);
        return d >= weekStart && d <= weekEnd;
      }).length;
      weeks.push({ week: `S${12 - w}`, cadastros: count });
    }
    return weeks;
  }

  // Coordinator stats
  function getCoordinatorStats() {
    const stats: Record<string, number> = {};
    volunteers.forEach(v => {
      stats[v.coordinator] = (stats[v.coordinator] || 0) + 1;
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }

  const weeklyData = getWeeklyData();
  const coordinatorStats = getCoordinatorStats();

  // Birthday this month
  const todayMonth = new Date().getMonth() + 1;
  const birthdayVolunteers = volunteers
    .filter(v => {
      if (!v.birthday) return false;
      const m = parseInt(v.birthday.split('-')[1], 10);
      return m === todayMonth;
    })
    .sort((a, b) => {
      const da = parseInt(a.birthday!.split('-')[2], 10);
      const db = parseInt(b.birthday!.split('-')[2], 10);
      return da - db;
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
      {/* Title + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visão geral da jornada de voluntários — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <UserPlus size={16} />
            Adicionar Voluntário
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddVolunteerModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => refetch()}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { refetch(); setShowImportModal(false); }}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total de Voluntários"
          value={total}
          sub="Em todos os ministérios"
          icon={<Users size={22} className="text-indigo-600" />}
          color="bg-indigo-50"
        />
        <KPICard
          label="Em Jornada"
          value={inJourney}
          sub="Ainda em processo"
          icon={<TrendingUp size={22} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <KPICard
          label="Estabelecidos"
          value={established}
          sub="Jornada completa"
          icon={<Award size={22} className="text-green-600" />}
          color="bg-green-50"
        />
        <KPICard
          label="Aguardam Follow-up"
          value={alerts.length}
          sub="Mais de 7 dias parados"
          icon={<AlertTriangle size={22} className="text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* Birthdays this month */}
      {birthdayVolunteers.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
              <Cake size={16} className="text-pink-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Aniversariantes do Mês</h2>
              <p className="text-xs text-gray-400">{new Date().toLocaleDateString('pt-BR', { month: 'long' })} · {birthdayVolunteers.length} voluntário{birthdayVolunteers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {birthdayVolunteers.map(v => {
              const day = parseInt(v.birthday!.split('-')[2], 10);
              const isToday = day === new Date().getDate();
              return (
                <button
                  key={v.id}
                  onClick={() => navigate(`/voluntario/${v.id}`)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isToday ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}
                >
                  {isToday && '🎂 '}
                  {v.name.split(' ')[0]} <span className="opacity-70">dia {day}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Funil de Jornada</h2>
          <p className="text-xs text-gray-400 mb-4">Distribuição dos voluntários por etapa</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelData} margin={{ top: 0, right: 10, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [value, 'Voluntários']}
              />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ministry Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Por Ministério</h2>
          <p className="text-xs text-gray-400 mb-4">Distribuição atual</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={ministryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {ministryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [value, 'voluntários']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
            {ministryData.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-xs text-gray-600 truncate">{m.name}</span>
                <span className="text-xs font-semibold text-gray-800 ml-auto">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Novos Cadastros por Semana</h2>
          <p className="text-xs text-gray-400 mb-4">Últimas 12 semanas</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [value, 'Cadastros']}
              />
              <Line
                type="monotone"
                dataKey="cadastros"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ fill: '#4f46e5', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Coordinators */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Top Coordenadores</h2>
          <p className="text-xs text-gray-400 mb-4">Voluntários ativos</p>
          <div className="space-y-3">
            {coordinatorStats.map((c, i) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-800">{c.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: coordinatorStats.length > 0 ? `${(c.count / coordinatorStats[0].count) * 100}%` : '0%',
                      backgroundColor: i === 0 ? '#4f46e5' : i === 1 ? '#6366f1' : '#818cf8',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Alertas de Follow-up</h2>
            <p className="text-xs text-gray-400 mt-0.5">Voluntários parados há 7+ dias sem avanço de etapa</p>
          </div>
          <button
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            onClick={() => navigate('/follow-up')}
          >
            Ver todos →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left pb-3 pr-4">Nome</th>
                <th className="text-left pb-3 pr-4">Ministério</th>
                <th className="text-left pb-3 pr-4">Área</th>
                <th className="text-left pb-3 pr-4">Etapa Atual</th>
                <th className="text-left pb-3 pr-4">Dias Parado</th>
                <th className="text-left pb-3 pr-4">Coordenador</th>
                <th className="text-left pb-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alerts.slice(0, 8).map(v => {
                const ministry = ministries.find(m => m.id === v.ministryId);
                const days = getDaysSinceLastContact(v);
                return (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-gray-800">{v.name}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-600">{ministry?.name}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-600">{v.subArea}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <JourneyBadge stage={v.currentStage} size="sm" />
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-sm font-semibold ${days >= 30 ? 'text-red-600' : days >= 14 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {days} dias
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-600">{v.coordinator}</span>
                    </td>
                    <td className="py-3">
                      <button
                        className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                        onClick={(e) => { e.stopPropagation(); navigate(`/voluntario/${v.id}`); }}
                      >
                        <Phone size={11} />
                        Contactar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Coordinator workload + Ministry goals ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coordinator workload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Carga por Coordenador</h2>
          <div className="space-y-3">
            {(() => {
              const map: Record<string, { active: number; total: number }> = {};
              volunteers.forEach(v => {
                if (!map[v.coordinator]) map[v.coordinator] = { active: 0, total: 0 };
                map[v.coordinator].total++;
                if (v.currentStage !== 'estabelecido' && !['mudou_area','nao_retornou'].includes(v.currentStage))
                  map[v.coordinator].active++;
              });
              const sorted = Object.entries(map).sort((a, b) => b[1].active - a[1].active);
              const max = sorted[0]?.[1]?.active || 1;
              return sorted.map(([name, { active, total }]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{name}</span>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{active} ativos / {total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${active >= 15 ? 'bg-red-500' : active >= 8 ? 'bg-orange-400' : 'bg-indigo-500'}`}
                      style={{ width: `${(active / max) * 100}%` }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Ministry goals */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Metas de Estabelecidos</h2>
          <div className="space-y-4">
            {ministries.map(m => {
              const mvols = volunteers.filter(v => v.ministryId === m.id);
              const established = mvols.filter(v => v.currentStage === 'estabelecido').length;
              const goals: Record<string, number> = (() => {
                try { return JSON.parse(localStorage.getItem('ministryGoals') || '{}'); } catch { return {}; }
              })();
              const goal = goals[m.id] || 0;
              const pct = goal > 0 ? Math.min((established / goal) * 100, 100) : 0;
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{m.name}</span>
                    <span className="text-xs text-gray-400">
                      {established}{goal > 0 ? ` / ${goal} est.` : ' estabelecidos'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: goal > 0 ? `${pct}%` : '0%', backgroundColor: m.color }} />
                  </div>
                  {goal > 0 && pct >= 100 && <p className="text-xs text-green-600 font-medium mt-0.5">✓ Meta atingida!</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

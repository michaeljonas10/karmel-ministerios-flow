import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Users, TrendingUp, Award, AlertTriangle, Phone } from 'lucide-react';
import { volunteers, getAlertVolunteers, getDaysSinceLastContact } from '../data/volunteers';
import { ministries } from '../data/ministries';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
import JourneyBadge from '../components/JourneyBadge';

// KPI calculations
const total = volunteers.length;
const established = volunteers.filter(v => v.currentStage === 'estabelecido').length;
const inJourney = volunteers.filter(v => v.currentStage !== 'estabelecido').length;
const alerts = getAlertVolunteers(7);

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

// Timeline: last 12 weeks
function getWeeklyData() {
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date('2026-05-15');
    weekStart.setDate(weekStart.getDate() - w * 7 - 6);
    const weekEnd = new Date('2026-05-15');
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const count = volunteers.filter(v => {
      const d = new Date(v.registeredAt);
      return d >= weekStart && d <= weekEnd;
    }).length;
    weeks.push({
      week: `S${12 - w}`,
      cadastros: count,
    });
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

export default function Dashboard() {
  const navigate = useNavigate();
  const weeklyData = getWeeklyData();
  const coordinatorStats = getCoordinatorStats();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Demo banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <span className="text-indigo-600 text-sm font-medium">Modo Demo</span>
        <span className="text-indigo-400 text-sm">— Este painel usa dados de exemplo realistas da Igreja Karmel / Lagoinha.</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da jornada de voluntários — maio 2026</p>
      </div>

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
                      width: `${(c.count / coordinatorStats[0].count) * 100}%`,
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
    </div>
  );
}

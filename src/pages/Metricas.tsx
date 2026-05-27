import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { TrendingUp, Users, CheckCircle, AlertTriangle, Target, Calendar, X, Download, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useVolunteers } from '../hooks/useVolunteers'
import { useMinistries } from '../hooks/useMinistries'
import { STAGE_LABELS, STAGE_ORDER, HOW_FOUND_OPTIONS } from '../types'
import type { Volunteer } from '../types'
import { getDaysSinceLastContact } from '../data/volunteers'
import { supabase } from '../lib/supabase'
const HOW_FOUND_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#e11d48']
const STAGE_COLORS = ['#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#1e1b4b']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type FilterMode = 'all' | 'year' | 'month' | 'range'

// ─── Shared helpers ───────────────────────────────────────────────────────────
function getDateBounds(mode: FilterMode, year: number, month: number, startDate: string, endDate: string): { from: Date; to: Date } | null {
  if (mode === 'all') return null
  if (mode === 'year') return { from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59) }
  if (mode === 'month') return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0, 23, 59, 59) }
  if (mode === 'range' && startDate && endDate) return { from: new Date(startDate), to: new Date(endDate + 'T23:59:59') }
  return null
}

/** Returns end-of-day (23:59:59.999) for a given date */
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function buildTimeSeries(volunteers: Volunteer[], mode: FilterMode, year: number, month: number, startDate: string, endDate: string) {
  const now = new Date()

  if (mode === 'month') {
    const firstDay = new Date(year, month, 1)
    const lastDay = endOfDay(new Date(year, month + 1, 0))
    const weeks: { month: string; cadastros: number; estabelecidos: number }[] = []
    const cur = new Date(firstDay)
    let weekNum = 1
    while (cur <= lastDay) {
      const wStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0, 0)
      const wEndRaw = new Date(cur)
      wEndRaw.setDate(wEndRaw.getDate() + 6)
      const wEnd = endOfDay(wEndRaw > lastDay ? lastDay : wEndRaw)
      weeks.push({
        month: `Sem ${weekNum}`,
        cadastros: volunteers.filter(v => { const d = new Date(v.registeredAt); return d >= wStart && d <= wEnd }).length,
        estabelecidos: volunteers.filter(v => {
          const last = v.stageHistory.filter(h => h.stage === 'estabelecido').pop()
          if (!last) return false
          return new Date(last.date) >= wStart && new Date(last.date) <= wEnd
        }).length,
      })
      cur.setDate(cur.getDate() + 7)
      weekNum++
    }
    return weeks
  }

  if (mode === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(year, i, 1)
      const to = endOfDay(new Date(year, i + 1, 0))
      return {
        month: MONTH_SHORT[i],
        cadastros: volunteers.filter(v => { const d = new Date(v.registeredAt); return d >= from && d <= to }).length,
        estabelecidos: volunteers.filter(v => {
          const last = v.stageHistory.filter(h => h.stage === 'estabelecido').pop()
          if (!last) return false
          return new Date(last.date) >= from && new Date(last.date) <= to
        }).length,
      }
    })
  }

  if (mode === 'range' && startDate && endDate) {
    const from = new Date(startDate)
    const to = endOfDay(new Date(endDate))
    const months: { month: string; cadastros: number; estabelecidos: number }[] = []
    const cur = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cur <= to) {
      const mStart = new Date(cur)
      const mEnd = endOfDay(new Date(cur.getFullYear(), cur.getMonth() + 1, 0))
      months.push({
        month: `${MONTH_SHORT[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}`,
        cadastros: volunteers.filter(v => { const d = new Date(v.registeredAt); return d >= mStart && d <= mEnd }).length,
        estabelecidos: volunteers.filter(v => {
          const last = v.stageHistory.filter(h => h.stage === 'estabelecido').pop()
          if (!last) return false
          return new Date(last.date) >= mStart && new Date(last.date) <= mEnd
        }).length,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
    return months
  }

  // Default: last 6 months (monthly buckets)
  return Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const mEnd = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    return {
      month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      cadastros: volunteers.filter(v => { const r = new Date(v.registeredAt); return r >= mStart && r <= mEnd }).length,
      estabelecidos: volunteers.filter(v => {
        const last = v.stageHistory.filter(h => h.stage === 'estabelecido').pop()
        if (!last) return false
        const r = new Date(last.date)
        return r >= mStart && r <= mEnd
      }).length,
    }
  })
}

// ─── Analytics engine ─────────────────────────────────────────────────────────
function useMetrics(volunteers: Volunteer[], allVols: Volunteer[], mode: FilterMode, year: number, month: number, startDate: string, endDate: string) {
  return useMemo(() => {
    const stageFunnel = STAGE_ORDER.map((s, i) => ({
      stage: STAGE_LABELS[s], shortName: STAGE_LABELS[s].split(' ').slice(0, 2).join(' '),
      count: volunteers.filter(v => v.currentStage === s).length, fill: STAGE_COLORS[i],
    }))
    const originData = HOW_FOUND_OPTIONS.map((opt, i) => ({
      name: opt, value: volunteers.filter(v => v.howFound === opt).length, color: HOW_FOUND_COLORS[i],
    })).filter(d => d.value > 0)
    const unknownOrigin = volunteers.filter(v => !v.howFound || !HOW_FOUND_OPTIONS.includes(v.howFound)).length
    if (unknownOrigin > 0) originData.push({ name: 'Não informado', value: unknownOrigin, color: '#d1d5db' })
    const monthlyData = buildTimeSeries(allVols, mode, year, month, startDate, endDate)
    const subAreaMap: Record<string, number> = {}
    volunteers.forEach(v => {
      if (!v.subArea) return; // skip volunteers without a sub-area
      const key = v.subArea;
      subAreaMap[key] = (subAreaMap[key] || 0) + 1
    })
    const subAreaData = Object.entries(subAreaMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))
    const total = volunteers.length
    const established = volunteers.filter(v => v.currentStage === 'estabelecido').length
    const establishRate = total > 0 ? Math.round((established / total) * 100) : 0
    const alerts = volunteers.filter(v => getDaysSinceLastContact(v) >= 7).length
    const establishedVols = volunteers.filter(v => v.stageHistory.some(h => h.stage === 'estabelecido'))
    let avgDaysToEstablish = 0
    if (establishedVols.length > 0) {
      const totalDays = establishedVols.reduce((sum, v) => {
        const start = new Date(v.registeredAt)
        const end = new Date(v.stageHistory.filter(h => h.stage === 'estabelecido').pop()!.date)
        return sum + Math.round((end.getTime() - start.getTime()) / 86400000)
      }, 0)
      avgDaysToEstablish = Math.round(totalDays / establishedVols.length)
    }
    const contactedThisWeek = volunteers.filter(v => getDaysSinceLastContact(v) <= 7).length
    const contactedThisMonth = volunteers.filter(v => getDaysSinceLastContact(v) <= 30).length
    const inGc = volunteers.filter(v => v.participatesGc === true).length
    const notInGc = volunteers.filter(v => v.participatesGc === false).length
    const gcUnknown = total - inGc - notInGc
    const gcData = [
      { name: 'Participa de GC', value: inGc, color: '#6366f1' },
      { name: 'Não participa', value: notInGc, color: '#f59e0b' },
      ...(gcUnknown > 0 ? [{ name: 'Não informado', value: gcUnknown, color: '#e5e7eb' }] : []),
    ].filter(d => d.value > 0)
    return { stageFunnel, originData, monthlyData, subAreaData, total, established, establishRate, alerts, avgDaysToEstablish, contactedThisWeek, contactedThisMonth, inGc, notInGc, gcUnknown, gcData }
  }, [volunteers, allVols, mode, year, month, startDate, endDate])
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">{children}</h2>
}
function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>)}
    </div>
  )
}

// ─── Period filter bar ────────────────────────────────────────────────────────
function PeriodFilter({ mode, setMode, year, setYear, month, setMonth, startDate, setStartDate, endDate, setEndDate, periodLabel }: {
  mode: FilterMode; setMode: (m: FilterMode) => void
  year: number; setYear: (y: number) => void
  month: number; setMonth: (m: number) => void
  startDate: string; setStartDate: (d: string) => void
  endDate: string; setEndDate: (d: string) => void
  periodLabel: string
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const btn = (active: boolean) => `px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Período</span>
        {mode !== 'all' && periodLabel && (
          <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            {periodLabel}
            <button onClick={() => setMode('all')}><X size={10} /></button>
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['all','year','month','range'] as FilterMode[]).map(m => (
          <button key={m} className={btn(mode === m)} onClick={() => setMode(m)}>
            {{ all: 'Tudo', year: 'Por Ano', month: 'Por Mês', range: 'Intervalo' }[m]}
          </button>
        ))}
      </div>
      {(mode === 'year' || mode === 'month') && (
        <div className="flex gap-3 mt-3 flex-wrap">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {mode === 'month' && (
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
            </select>
          )}
        </div>
      )}
      {mode === 'range' && (
        <div className="flex gap-3 mt-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">De</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Até</label>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PDF Report (hidden render target) ───────────────────────────────────────
interface ReportProps {
  churchName: string
  logoUrl: string  // base64 data URL or empty string
  scopeLabel: string
  periodLabel: string
  chartTimeLabel: string
  metrics: ReturnType<typeof useMetrics>
  ministryBreakdown: { name: string; color: string; total: number; established: number; alerts: number }[]
  isAdmin: boolean
}

function ReportDocument({ churchName, logoUrl, scopeLabel, periodLabel, chartTimeLabel, metrics, ministryBreakdown, isAdmin }: ReportProps) {
  const { stageFunnel, originData, monthlyData, subAreaData, total, established, establishRate, alerts, avgDaysToEstablish, contactedThisWeek, contactedThisMonth, inGc, notInGc, gcUnknown, gcData } = metrics
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div style={{ width: 900, fontFamily: 'system-ui, sans-serif', backgroundColor: '#fff', color: '#111' }}>

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #7c3aed 100%)', padding: '36px 40px', borderRadius: '0 0 24px 24px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 4 }} />
              : <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>P</span>
                </div>
            }
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>{churchName}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Pulse Ministérios</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Relatório de Métricas</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>{scopeLabel}</div>
            {periodLabel && <div style={{ color: '#a5f3fc', fontSize: 12, marginTop: 2, fontWeight: 600 }}>Período: {periodLabel}</div>}
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>Gerado em {now}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px' }}>

        {/* ── SECTION LABEL helper ── */}
        {/* KPI Cards */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
            Visão Geral
            <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[
              { label: 'Total de Voluntários', value: total, sub: 'cadastrados no período', accent: '#6366f1', bg: '#eef2ff' },
              { label: 'Estabelecidos', value: established, sub: `${establishRate}% taxa de conversão`, accent: '#10b981', bg: '#ecfdf5' },
              { label: 'Aguardam Contato', value: alerts, sub: '≥ 7 dias sem contato', accent: '#f59e0b', bg: '#fffbeb' },
              { label: 'Tempo Médio', value: avgDaysToEstablish > 0 ? `${avgDaysToEstablish}d` : '—', sub: 'para se estabelecer', accent: '#8b5cf6', bg: '#f5f3ff' },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg, borderRadius: 14, padding: '16px 18px', border: `1px solid ${k.accent}22` }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: k.accent }}>{k.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{k.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Health */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 14 }}>Saúde dos Contatos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Contatados esta semana', value: contactedThisWeek, color: '#10b981', bg: '#ecfdf5' },
                { label: 'Contatados este mês', value: contactedThisMonth, color: '#3b82f6', bg: '#eff6ff' },
                { label: 'Precisam de atenção', value: alerts, color: '#f59e0b', bg: '#fffbeb' },
              ].map(item => (
                <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Charts Section 1: Jornada & Origem ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
            Jornada & Origem
            <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            {/* Stage funnel */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Etapas da Jornada</div>
              <BarChart width={540} height={220} data={stageFunnel} margin={{ top: 0, right: 0, bottom: 70, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="shortName" tick={{ fontSize: 9, fill: '#9ca3af' }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Bar dataKey="count" name="Voluntários" radius={[4, 4, 0, 0]}>
                  {stageFunnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </div>
            {/* Origin pie */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Como Chegaram Até Nós</div>
              {originData.length === 0
                ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Sem dados</div>
                : (
                  <PieChart width={260} height={220}>
                    <Pie data={originData} cx="50%" cy="45%" outerRadius={70} dataKey="value" nameKey="name"
                      label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                      {originData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: '#6b7280' }}>{v}</span>} />
                  </PieChart>
                )
              }
              {/* Origin legend table */}
              <div style={{ marginTop: 8 }}>
                {originData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                      <span style={{ fontSize: 11, color: '#374151' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* GC pie */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Participação em GC</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 12 }}>Grupo de Células</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{inGc}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Participam</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{notInGc}</div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>Não participam</div>
                </div>
                {gcUnknown > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#d1d5db' }}>{gcUnknown}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Não informado</div>
                  </div>
                )}
              </div>
              <PieChart width={200} height={140}>
                <Pie data={gcData} cx="50%" cy="50%" outerRadius={55} dataKey="value" nameKey="name"
                  label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                  {gcData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </div>
          </div>
        </div>

        {/* ── Charts Section 2: Crescimento & Distribuição ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
            Crescimento & Distribuição
            <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Monthly line */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Cadastros — {chartTimeLabel}</div>
              <LineChart width={380} height={200} data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: '#6b7280' }}>{v}</span>} />
                <Line type="monotone" dataKey="cadastros" name="Cadastros" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="estabelecidos" name="Estabelecidos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
              </LineChart>
            </div>
            {/* Sub-area bar */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Voluntários por Sub-área (top 10)</div>
              {subAreaData.length === 0
                ? <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>Sem dados</div>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(120, subAreaData.length * 36)}>
                    <BarChart data={subAreaData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={100}
                        tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Voluntários" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>
        </div>

        {/* ── Admin: per-ministry table ── */}
        {isAdmin && ministryBreakdown.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
              Breakdown por Ministério
              <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Ministério', 'Total', 'Estabelecidos', 'Taxa', 'Precisam Contato'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ministryBreakdown.map((m, idx) => {
                    const rate = m.total ? Math.round(m.established / m.total * 100) : 0
                    return (
                      <tr key={m.name} style={{ borderBottom: idx < ministryBreakdown.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                            <span style={{ fontWeight: 600, color: '#111' }}>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#374151' }}>{m.total}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#10b981' }}>{m.established}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 80, height: 6, background: '#e5e7eb', borderRadius: 3 }}>
                              <div style={{ width: `${rate}%`, height: 6, background: '#10b981', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{rate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {m.alerts > 0
                            ? <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{m.alerts}</span>
                            : <span style={{ color: '#10b981', fontSize: 11 }}>✓ Em dia</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, paddingBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Pulse Ministérios — {churchName}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Relatório gerado em {now}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Export function ──────────────────────────────────────────────────────────
async function exportToPDF(reportRef: React.RefObject<HTMLDivElement | null>, filename: string) {
  const el = reportRef.current
  if (!el) return

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // Temporarily show element for capture
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  el.style.top = '0'
  el.style.display = 'block'
  el.style.zIndex = '-1'

  await new Promise(r => setTimeout(r, 300)) // let charts render

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 900,
    windowWidth: 900,
  })

  el.style.display = 'none'
  el.style.position = ''

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = pdf.internal.pageSize.getHeight()
  const imgW = canvas.width
  const imgH = canvas.height
  const ratio = pdfW / (imgW / 2)
  const totalH = (imgH / 2) * ratio
  let yOffset = 0
  let pageCount = 0

  while (yOffset < totalH) {
    if (pageCount > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, totalH)
    yOffset += pdfH
    pageCount++
  }

  pdf.save(filename)
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Metricas() {
  usePageTitle('Métricas')
  const { profile, isAdmin, isLeader, isCoordinator } = useAuth()
  const { volunteers, loading: volLoading } = useVolunteers()
  const { ministries, loading: minLoading } = useMinistries()
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [churchName, setChurchName] = useState('Lagoinha Osasco')
  const [logoDataUrl, setLogoDataUrl] = useState('')

  // Load church settings and pre-convert logo to base64 for reliable html2canvas rendering
  useEffect(() => {
    supabase.from('church_settings').select('church_name,logo_url').eq('id', 'main').single()
      .then(async ({ data }) => {
        if (data?.church_name) setChurchName(data.church_name)
        if (data?.logo_url) {
          try {
            const res = await fetch(data.logo_url)
            const blob = await res.blob()
            const reader = new FileReader()
            reader.onload = () => setLogoDataUrl(reader.result as string)
            reader.readAsDataURL(blob)
          } catch {
            setLogoDataUrl(data.logo_url)
          }
        }
      })
  }, [])

  const now = new Date()
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ministryFilter, setMinistryFilter] = useState<string>('all')

  const scopedVolunteers = useMemo(() => {
    if (isAdmin) {
      return ministryFilter === 'all' ? volunteers : volunteers.filter(v => v.ministryId === ministryFilter)
    }
    if (isLeader) return volunteers.filter(v => v.ministryId === profile?.ministry_id)
    if (isCoordinator) {
      // profile.sub_areas contains IDs (e.g. "follow_fotografia")
      // but v.subArea contains the display name (e.g. "Fotografia")
      // → resolve IDs → names via ministry context before filtering
      const ministry = ministries.find(m => m.id === profile?.ministry_id)
      const prefix = (profile?.ministry_id ?? '') + '_'
      const stripPfx = (s: string) => { let r = s; while (r.startsWith(prefix)) r = r.slice(prefix.length); return r }
      const mySubAreaNames = (profile?.sub_areas ?? [])
        .map(id => {
          const exact = ministry?.subAreas.find(sa => sa.id === id)
          if (exact) return exact.name
          const base = stripPfx(id)
          return ministry?.subAreas.find(sa => stripPfx(sa.id) === base)?.name ?? null
        })
        .filter(Boolean) as string[]
      return volunteers.filter(v =>
        v.ministryId === profile?.ministry_id && mySubAreaNames.includes(v.subArea)
      )
    }
    return []
  }, [volunteers, profile, isAdmin, isLeader, isCoordinator, ministryFilter, ministries])

  const dateFilteredVolunteers = useMemo(() => {
    const bounds = getDateBounds(filterMode, selectedYear, selectedMonth, startDate, endDate)
    if (!bounds) return scopedVolunteers
    return scopedVolunteers.filter(v => new Date(v.registeredAt) >= bounds.from && new Date(v.registeredAt) <= bounds.to)
  }, [scopedVolunteers, filterMode, selectedYear, selectedMonth, startDate, endDate])

  const periodLabel = useMemo(() => {
    if (filterMode === 'year') return String(selectedYear)
    if (filterMode === 'month') return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    if (filterMode === 'range' && startDate && endDate) {
      const fmt = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      return `${fmt(startDate)} – ${fmt(endDate)}`
    }
    return ''
  }, [filterMode, selectedYear, selectedMonth, startDate, endDate])

  const chartTimeLabel = useMemo(() => {
    if (filterMode === 'month') return `${MONTH_NAMES[selectedMonth]} ${selectedYear} (por semana)`
    if (filterMode === 'year') return `${selectedYear} (por mês)`
    if (filterMode === 'range' && startDate && endDate) return `${periodLabel} (por mês)`
    return 'Últimos 6 meses'
  }, [filterMode, selectedYear, selectedMonth, startDate, endDate, periodLabel])

  const metrics = useMetrics(dateFilteredVolunteers, scopedVolunteers, filterMode, selectedYear, selectedMonth, startDate, endDate)
  const { stageFunnel, originData, monthlyData, subAreaData, total, established, establishRate, alerts, avgDaysToEstablish, contactedThisWeek, contactedThisMonth, inGc, notInGc, gcUnknown, gcData } = metrics

  const scopeLabel = isAdmin
    ? ministryFilter === 'all'
      ? 'Todos os Ministérios'
      : ministries.find(m => m.id === ministryFilter)?.name ?? 'Ministério'
    : isLeader
    ? ministries.find(m => m.id === profile?.ministry_id)?.name ?? 'Meu Ministério'
    : `Sub-área${(profile?.sub_areas?.length ?? 0) > 1 ? 's' : ''}: ${(profile?.sub_areas ?? []).join(', ')}`

  const ministryBreakdown = useMemo(() => isAdmin
    ? ministries.map(m => {
        const mvs = dateFilteredVolunteers.filter(v => v.ministryId === m.id)
        return { name: m.name, color: m.color, total: mvs.length, established: mvs.filter(v => v.currentStage === 'estabelecido').length, alerts: mvs.filter(v => getDaysSinceLastContact(v) >= 7).length }
      }).filter(m => m.total > 0)
    : [], [isAdmin, ministries, dateFilteredVolunteers])

  const handleExport = useCallback(async () => {
    setExporting(true)
    const scope = scopeLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const period = periodLabel ? `_${periodLabel.replace(/[^a-z0-9]/gi, '_')}` : ''
    const filename = `metricas_${scope}${period}_${now.toISOString().slice(0, 10)}.pdf`
    await exportToPDF(reportRef, filename)
    setExporting(false)
  }, [scopeLabel, periodLabel])

  if (volLoading || minLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">Carregando métricas...</p></div>
  }

  const rangeActive = filterMode === 'range' && (!startDate || !endDate)

  return (
    <>
      {/* Hidden report render target */}
      <div ref={reportRef} style={{ display: 'none' }}>
        <ReportDocument
          churchName={churchName}
          logoUrl={logoDataUrl}
          scopeLabel={scopeLabel}
          periodLabel={periodLabel || 'Todo o período'}
          chartTimeLabel={chartTimeLabel}
          metrics={metrics}
          ministryBreakdown={ministryBreakdown}
          isAdmin={isAdmin}
        />
      </div>

      <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={24} style={{ color: 'var(--accent)' }} />
              Métricas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Escopo: <span className="font-medium text-gray-700">{scopeLabel}</span>
              {filterMode !== 'all' && periodLabel && <> · <span className="font-medium text-indigo-600">{periodLabel}</span></>}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || rangeActive}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            style={{ background: exporting ? '#9ca3af' : 'var(--accent)' }}
          >
            {exporting ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
            {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
        </div>

        {/* Ministry filter — admin only */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ministério</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMinistryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ministryFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
              >
                Todos
              </button>
              {ministries.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMinistryFilter(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ministryFilter === m.id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                  style={ministryFilter === m.id ? { backgroundColor: m.color, borderColor: m.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ministryFilter === m.id ? 'rgba(255,255,255,0.7)' : m.color }} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Period filter */}
        <PeriodFilter
          mode={filterMode} setMode={setFilterMode}
          year={selectedYear} setYear={setSelectedYear}
          month={selectedMonth} setMonth={setSelectedMonth}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
          periodLabel={periodLabel}
        />

        {rangeActive ? (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center text-sm text-indigo-700">
            Selecione a data de início e fim para visualizar as métricas do intervalo.
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div>
              <SectionTitle>Visão Geral</SectionTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Users size={18} className="text-indigo-600" />} label="Total" value={total} color="bg-indigo-50" />
                <StatCard icon={<CheckCircle size={18} className="text-green-600" />} label="Estabelecidos" value={established} sub={`${establishRate}% do total`} color="bg-green-50" />
                <StatCard icon={<AlertTriangle size={18} className="text-orange-500" />} label="Aguardam Contato" value={alerts} sub="≥7 dias sem contato" color="bg-orange-50" />
                <StatCard icon={<Target size={18} className="text-purple-600" />} label="Tempo Médio" value={avgDaysToEstablish > 0 ? `${avgDaysToEstablish}d` : '—'} sub="para se estabelecer" color="bg-purple-50" />
              </div>
            </div>

            {/* Contact health */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Saúde dos Contatos</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Contatados esta semana', value: contactedThisWeek, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Contatados este mês', value: contactedThisMonth, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Precisam de atenção', value: alerts, color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-4`}>
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts row 1 */}
            <div>
              <SectionTitle>Jornada & Origem</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Etapas da Jornada" className="lg:col-span-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stageFunnel} margin={{ top: 0, right: 0, bottom: 60, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Voluntários" radius={[4, 4, 0, 0]}>
                        {stageFunnel.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Como Chegaram Até Nós">
                  {originData.length === 0
                    ? <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Sem dados de origem</div>
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={originData} cx="50%" cy="45%" outerRadius={70} dataKey="value" nameKey="name"
                            label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                            {originData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} />
                          <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  }
                </ChartCard>
                <ChartCard title="Participação em GC">
                  <p className="text-xs text-gray-400 -mt-1 mb-3">Grupo de Células</p>
                  <div className="flex justify-around mb-3">
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-indigo-600">{inGc}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Participam</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-amber-500">{notInGc}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Não participam</p>
                    </div>
                    {gcUnknown > 0 && (
                      <div className="text-center">
                        <p className="text-3xl font-extrabold text-gray-300">{gcUnknown}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Não informado</p>
                      </div>
                    )}
                  </div>
                  {gcData.length > 0 && (
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={gcData} cx="50%" cy="50%" outerRadius={55} dataKey="value" nameKey="name"
                          label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>
                          {gcData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                        <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>

            {/* Charts row 2 */}
            <div>
              <SectionTitle>Crescimento & Distribuição</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title={`Cadastros — ${chartTimeLabel}`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                      <Line type="monotone" dataKey="cadastros" name="Cadastros" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="estabelecidos" name="Estabelecidos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Voluntários por Sub-área (top 10)">
                  {subAreaData.length === 0
                    ? <div className="h-[120px] flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
                    : (
                      <ResponsiveContainer width="100%" height={Math.max(120, subAreaData.length * 36)}>
                        <BarChart data={subAreaData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 100 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={100}
                            tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Voluntários" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </ChartCard>
              </div>
            </div>

            {/* Admin ministry breakdown */}
            {isAdmin && ministryBreakdown.length > 0 && (
              <div>
                <SectionTitle>Por Ministério</SectionTitle>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-xs text-gray-400 uppercase tracking-wider">
                        {['Ministério','Total','Estabelecidos','Taxa','Precisam Contato'].map(h => (
                          <th key={h} className="text-left px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ministryBreakdown.map(m => (
                        <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                              <span className="text-sm font-medium text-gray-800">{m.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-700 font-semibold">{m.total}</td>
                          <td className="px-5 py-3.5 text-sm text-green-600 font-semibold">{m.established}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                                <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${m.total ? Math.round(m.established / m.total * 100) : 0}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{m.total ? Math.round(m.established / m.total * 100) : 0}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {m.alerts > 0
                              ? <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{m.alerts}</span>
                              : <span className="text-xs text-green-600">✓ Em dia</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

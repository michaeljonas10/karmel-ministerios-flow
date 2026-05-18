import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  ArrowLeft, Mail, Calendar, User, ChevronRight, ChevronLeft,
  CheckCircle, MessageSquare, Clock, Pencil, X, Save
} from 'lucide-react';
import WaButton from '../components/WaButton';
import { getDaysSinceLastContact } from '../data/volunteers';
import { useMinistries } from '../contexts/MinistriesContext';
import { STAGE_LABELS, STAGE_ORDER, OFF_TRACK_STAGES } from '../types';
import type { Volunteer, JourneyStage } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import StageProgressBar from '../components/StageProgressBar';
import { supabase } from '../lib/supabase';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function VolunteerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ministries } = useMinistries();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  usePageTitle(volunteer?.name ?? 'Voluntário');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [editField, setEditField] = useState<'phone' | 'email' | 'name' | 'subArea' | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    async function fetchVolunteer() {
      if (!id) return;
      const { data, error } = await supabase
        .from('volunteers')
        .select('*, stage_history(*)')
        .eq('id', id)
        .single();

      if (data && !error) {
        setVolunteer({
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          registeredAt: data.registered_at,
          ministryId: data.ministry_id,
          subArea: data.sub_area,
          coordinator: data.coordinator,
          currentStage: data.current_stage,
          stageHistory: (data.stage_history || []).map((h: { stage: string; date: string; note?: string }) => ({
            stage: h.stage,
            date: h.date,
            note: h.note,
          })),
          notes: data.notes,
          lastContactDate: data.last_contact_date,
          alertDays: data.alert_days,
        });
      }
      setLoading(false);
    }
    fetchVolunteer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500">Voluntário não encontrado.</p>
        <button
          className="text-indigo-600 hover:underline text-sm"
          onClick={() => navigate('/')}
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const ministry = ministries.find(m => m.id === volunteer.ministryId);
  const days = getDaysSinceLastContact(volunteer);
  const isOffTrack = OFF_TRACK_STAGES.includes(volunteer.currentStage);
  const currentIdx = isOffTrack ? -1 : STAGE_ORDER.indexOf(volunteer.currentStage);
  const canAdvance = !isOffTrack && currentIdx < STAGE_ORDER.length - 1;
  const canRetreat = !isOffTrack && currentIdx > 0;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function markContacted() {
    if (!volunteer) return;
    const now = new Date().toISOString();
    setVolunteer(v => v ? { ...v, lastContactDate: now, alertDays: 0 } : v);
    await supabase.from('volunteers').update({ last_contact_date: now }).eq('id', volunteer.id);
    showToast('Contato registrado!');
  }

  async function advanceStage() {
    if (!volunteer || !canAdvance) return;
    const nextStage = STAGE_ORDER[currentIdx + 1];
    const now = new Date().toISOString();
    setVolunteer(v => v ? {
      ...v,
      currentStage: nextStage,
      lastContactDate: now,
      alertDays: 0,
      stageHistory: [...v.stageHistory, { stage: nextStage, date: now }],
    } : v);
    await supabase.from('volunteers').update({ current_stage: nextStage, last_contact_date: now }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage: nextStage, date: now });
    showToast(`Avançado para: ${STAGE_LABELS[nextStage]}`);
  }

  async function retreatStage() {
    if (!volunteer || !canRetreat) return;
    const prevStage = STAGE_ORDER[currentIdx - 1];
    const now = new Date().toISOString();
    setVolunteer(v => v ? {
      ...v,
      currentStage: prevStage,
      stageHistory: [...v.stageHistory, { stage: prevStage, date: now }],
    } : v);
    await supabase.from('volunteers').update({ current_stage: prevStage }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage: prevStage, date: now, note: 'Etapa retrocedida manualmente' });
    showToast(`Retrocedido para: ${STAGE_LABELS[prevStage]}`);
  }

  async function setOffTrack(stage: 'mudou_area' | 'nao_retornou') {
    if (!volunteer) return;
    const now = new Date().toISOString();
    setVolunteer(v => v ? { ...v, currentStage: stage, stageHistory: [...v.stageHistory, { stage, date: now }] } : v);
    await supabase.from('volunteers').update({ current_stage: stage }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage, date: now });
    showToast(`Status: ${STAGE_LABELS[stage]}`);
  }

  async function reactivate() {
    if (!volunteer) return;
    const now = new Date().toISOString();
    const lastTrackStage = ([...volunteer.stageHistory].reverse()
      .find(h => STAGE_ORDER.includes(h.stage as JourneyStage))?.stage as JourneyStage) ?? 'cadastrado';
    setVolunteer(v => v ? {
      ...v,
      currentStage: lastTrackStage,
      stageHistory: [...v.stageHistory, { stage: lastTrackStage, date: now, note: 'Reativado' }],
    } : v);
    await supabase.from('volunteers').update({ current_stage: lastTrackStage }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage: lastTrackStage, date: now, note: 'Reativado' });
    showToast(`Reativado em: ${STAGE_LABELS[lastTrackStage]}`);
  }

  function startEdit(field: 'phone' | 'email' | 'name' | 'subArea') {
    setEditField(field);
    setEditValue(volunteer?.[field] ?? '');
  }

  async function saveEdit() {
    if (!volunteer || !editField) return;
    const trimmed = editValue.trim();
    const dbField = editField === 'subArea' ? 'sub_area' : editField;
    const updates: Record<string, string> = { [dbField]: trimmed };

    if (editField === 'subArea') {
      const newCoordinator = ministry?.subAreas.find(sa => sa.name === trimmed)?.coordinator;
      if (newCoordinator) {
        updates.coordinator = newCoordinator;
        setVolunteer(v => v ? { ...v, subArea: trimmed, coordinator: newCoordinator } : v);
      } else {
        setVolunteer(v => v ? { ...v, [editField]: trimmed } : v);
      }
    } else {
      setVolunteer(v => v ? { ...v, [editField]: trimmed } : v);
    }

    setEditField(null);
    await supabase.from('volunteers').update(updates).eq('id', volunteer.id);
    showToast('Atualizado com sucesso!');
  }

  async function addNote() {
    if (!volunteer || !noteInput.trim()) return;
    const note = noteInput.trim();
    const updatedNotes = volunteer.notes
      ? `${volunteer.notes}\n[${new Date().toLocaleDateString('pt-BR')}] ${note}`
      : `[${new Date().toLocaleDateString('pt-BR')}] ${note}`;
    setVolunteer(v => v ? { ...v, notes: updatedNotes } : v);
    setNoteInput('');
    setShowNoteInput(false);
    await supabase.from('volunteers').update({ notes: updatedNotes }).eq('id', volunteer.id);
    showToast('Nota adicionada!');
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle size={16} />
          {toastMsg}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div
          className="h-2"
          style={{ backgroundColor: ministry?.color || '#4f46e5' }}
        />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: ministry?.color || '#4f46e5' }}
                >
                  {volunteer.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{volunteer.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-gray-500">{ministry?.name}</span>
                    <span className="text-gray-300">·</span>
                    {editField === 'subArea' ? (
                      <div className="flex items-center gap-1">
                        <select
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditField(null); }}
                          className="border border-indigo-300 rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {ministry?.subAreas.map(sa => (
                            <option key={sa.id} value={sa.name}>{sa.name}</option>
                          ))}
                        </select>
                        <button onClick={saveEdit} className="text-green-600 hover:text-green-800 p-1"><Save size={14} /></button>
                        <button onClick={() => setEditField(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">{volunteer.subArea}</span>
                        <button
                          onClick={() => startEdit('subArea')}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5"
                          title="Editar sub-área"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <JourneyBadge stage={volunteer.currentStage} />
                {days >= 7 && (
                  <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
                    {days} dias sem contato
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <WaButton phone={volunteer.phone} name={volunteer.name} size="md" onClick={() => volunteer.phone && markContacted()} />
              {isOffTrack ? (
                <button
                  className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                  onClick={reactivate}
                >
                  <ChevronRight size={14} />
                  Reativar na Trilha
                </button>
              ) : (
                <>
                  <button
                    className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={retreatStage}
                    disabled={!canRetreat}
                    title="Retroceder etapa"
                  >
                    <ChevronLeft size={14} />
                    Retroceder
                  </button>
                  <button
                    className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={advanceStage}
                    disabled={!canAdvance}
                  >
                    <ChevronRight size={14} />
                    Avançar Etapa
                  </button>
                  <button
                    className="flex items-center gap-2 text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl font-medium transition-colors text-xs"
                    onClick={() => setOffTrack('mudou_area')}
                  >
                    Mudou de Ministério
                  </button>
                  <button
                    className="flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-xl font-medium transition-colors text-xs"
                    onClick={() => setOffTrack('nao_retornou')}
                  >
                    Não Retornou
                  </button>
                </>
              )}
              <button
                className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors"
                onClick={() => setShowNoteInput(!showNoteInput)}
              >
                <MessageSquare size={14} />
                Nota
              </button>
            </div>
          </div>

          {/* Note input */}
          {showNoteInput && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Adicionar nota sobre este voluntário..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                autoFocus
              />
              <button
                onClick={addNote}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Salvar
              </button>
            </div>
          )}

          {/* Contact info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            {/* Phone — editable */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Telefone</p>
              {editField === 'phone' ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="tel"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditField(null); }}
                    className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono min-w-0"
                    placeholder="(31) 9 0000-0000"
                  />
                  <button onClick={saveEdit} className="text-green-600 hover:text-green-800 p-1"><Save size={14} /></button>
                  <button onClick={() => setEditField(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <WaButton phone={volunteer.phone} name={volunteer.name} size="sm" onClick={() => volunteer.phone && markContacted()} />
                  <span className="text-xs text-gray-400 font-mono hidden sm:inline">{volunteer.phone || '—'}</span>
                  <button onClick={() => startEdit('phone')} className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5" title="Editar telefone">
                    <Pencil size={11} />
                  </button>
                </div>
              )}
            </div>
            {/* Email — editable */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
              {editField === 'email' ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="email"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditField(null); }}
                    className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0"
                    placeholder="email@exemplo.com"
                  />
                  <button onClick={saveEdit} className="text-green-600 hover:text-green-800 p-1"><Save size={14} /></button>
                  <button onClick={() => setEditField(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{volunteer.email || <span className="text-gray-400 italic">não informado</span>}</span>
                  <button onClick={() => startEdit('email')} className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5 flex-shrink-0" title="Editar email">
                    <Pencil size={11} />
                  </button>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Coordenador</p>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-gray-400" />
                <span className="text-sm text-gray-700">{volunteer.coordinator}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cadastro</p>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(volunteer.registeredAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar — hidden for off-track statuses */}
      {isOffTrack ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${volunteer.currentStage === 'mudou_area' ? 'bg-amber-50' : 'bg-red-50'}`}>
            <span className="text-2xl">{volunteer.currentStage === 'mudou_area' ? '🔄' : '📵'}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Status</p>
            <JourneyBadge stage={volunteer.currentStage} />
            <p className="text-xs text-gray-400 mt-1">A trilha de jornada não se aplica a este status.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-6">Progresso da Jornada</h2>
          <StageProgressBar currentStage={volunteer.currentStage} />
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <span>Etapa {currentIdx + 1} de {STAGE_ORDER.length}</span>
            <span>{Math.round(((currentIdx + 1) / STAGE_ORDER.length) * 100)}% concluído</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${((currentIdx + 1) / STAGE_ORDER.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Histórico de Etapas</h2>
          <div className="space-y-4">
            {[...volunteer.stageHistory].reverse().map((entry, i) => {
              const isFirst = i === 0;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isFirst ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}>
                      {isFirst ? (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      ) : (
                        <CheckCircle size={12} className="text-gray-500" />
                      )}
                    </div>
                    {i < volunteer.stageHistory.length - 1 && (
                      <div className="w-px flex-1 bg-gray-100 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-medium ${isFirst ? 'text-indigo-600' : 'text-gray-700'}`}>
                      {STAGE_LABELS[entry.stage as keyof typeof STAGE_LABELS] || entry.stage}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.date)}</p>
                    {entry.note && (
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded p-2">{entry.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes + Last contact */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-gray-400" />
              <h2 className="text-base font-semibold text-gray-800">Último Contato</h2>
            </div>
            <p className="text-sm text-gray-600">{formatDate(volunteer.lastContactDate)}</p>
            <p className={`text-xs mt-1 font-medium ${
              days >= 14 ? 'text-red-500' : days >= 7 ? 'text-orange-500' : 'text-green-500'
            }`}>
              {days === 0 ? 'Hoje' : `Há ${days} dia${days !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-gray-400" />
              <h2 className="text-base font-semibold text-gray-800">Observações</h2>
            </div>
            {volunteer.notes ? (
              <div className="space-y-2">
                {volunteer.notes.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nenhuma observação registrada.</p>
            )}
          </div>

          {/* Ministry info */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{ backgroundColor: ministry?.color || '#4f46e5' }}
          >
            <p className="text-sm font-semibold opacity-80 mb-1">Ministério</p>
            <p className="text-lg font-bold">{ministry?.name}</p>
            <p className="text-sm opacity-80 mt-1">{volunteer.subArea}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {ministry?.coordinators.map(c => (
                <span key={c} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

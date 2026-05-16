import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Calendar, User, ChevronRight,
  CheckCircle, MessageSquare, Clock
} from 'lucide-react';
import { whatsappUrl } from '../lib/whatsapp';
import { getDaysSinceLastContact } from '../data/volunteers';
import { getMinistryById } from '../data/ministries';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
import type { Volunteer } from '../types';
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
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

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

  const ministry = getMinistryById(volunteer.ministryId);
  const days = getDaysSinceLastContact(volunteer);
  const currentIdx = STAGE_ORDER.indexOf(volunteer.currentStage);
  const canAdvance = currentIdx < STAGE_ORDER.length - 1;

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
                    <span className="text-sm text-gray-500">{volunteer.subArea}</span>
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
              <a
                href={volunteer.phone ? whatsappUrl(volunteer.phone, volunteer.name) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                onClick={() => volunteer.phone && markContacted()}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
              <button
                className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={advanceStage}
                disabled={!canAdvance}
              >
                <ChevronRight size={14} />
                Avançar Etapa
              </button>
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
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Telefone</p>
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" className="text-green-500 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <a
                  href={volunteer.phone ? whatsappUrl(volunteer.phone, volunteer.name) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:text-green-700 font-mono hover:underline"
                >
                  {volunteer.phone}
                </a>
              </div>
            </div>
            {volunteer.email && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-700 truncate">{volunteer.email}</span>
                </div>
              </div>
            )}
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

      {/* Progress bar */}
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

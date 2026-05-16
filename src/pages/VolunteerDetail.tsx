import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, Calendar, User, ChevronRight,
  CheckCircle, MessageSquare, Clock
} from 'lucide-react';
import { getVolunteerById, getDaysSinceLastContact } from '../data/volunteers';
import { getMinistryById } from '../data/ministries';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import StageProgressBar from '../components/StageProgressBar';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function VolunteerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const volunteerData = getVolunteerById(id || '');
  const [volunteer, setVolunteer] = useState(volunteerData);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

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

  function markContacted() {
    setVolunteer(v => v ? { ...v, lastContactDate: '2026-05-15', alertDays: 0 } : v);
    showToast('Contato registrado!');
  }

  function advanceStage() {
    if (!canAdvance) return;
    const nextStage = STAGE_ORDER[currentIdx + 1];
    setVolunteer(v => v ? {
      ...v,
      currentStage: nextStage,
      lastContactDate: '2026-05-15',
      alertDays: 0,
      stageHistory: [...v.stageHistory, { stage: nextStage, date: '2026-05-15' }],
    } : v);
    showToast(`Avançado para: ${STAGE_LABELS[nextStage]}`);
  }

  function addNote() {
    if (!noteInput.trim()) return;
    const note = noteInput.trim();
    setVolunteer(v => v ? { ...v, notes: v.notes ? `${v.notes}\n[${new Date().toLocaleDateString('pt-BR')}] ${note}` : `[${new Date().toLocaleDateString('pt-BR')}] ${note}` } : v);
    setNoteInput('');
    setShowNoteInput(false);
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
              <button
                className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                onClick={markContacted}
              >
                <Phone size={14} />
                Contatado
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
                <Phone size={13} className="text-gray-400" />
                <span className="text-sm text-gray-700 font-mono">{volunteer.phone}</span>
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
                      {STAGE_LABELS[entry.stage]}
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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  ArrowLeft, Mail, Calendar, User, ChevronRight, ChevronLeft,
  CheckCircle, MessageSquare, Clock, Pencil, X, Save, Copy, Cake, PhoneCall, Compass, Archive, History, Monitor, ArrowRightLeft,
} from 'lucide-react';
import WaButton from '../components/WaButton';
import { getDaysSinceLastContact } from '../data/volunteers';
import { useMinistries } from '../contexts/MinistriesContext';
import { useAuth } from '../contexts/AuthContext';
import { STAGE_LABELS, STAGE_ORDER, OFF_TRACK_STAGES, HOW_FOUND_OPTIONS, getMinistryStages } from '../types';
import type { Volunteer, JourneyStage } from '../types';
import JourneyBadge from '../components/JourneyBadge';
import StageProgressBar from '../components/StageProgressBar';
import { supabase } from '../lib/supabase';
import { buildTemplate } from '../data/waTemplates';

function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  // Force local-timezone interpretation: if it's a date-only string (YYYY-MM-DD)
  // appending T12:00:00 avoids UTC midnight shifting the date by ±1 day.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T12:00:00' : dateStr;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function VolunteerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { ministries } = useMinistries();
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  usePageTitle(volunteer?.name ?? 'Voluntário');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [editField, setEditField] = useState<'phone' | 'email' | 'name' | 'subArea' | 'birthday' | 'howFound' | null>(null);
  const [editingSubAreas, setEditingSubAreas] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferMinistryId, setTransferMinistryId] = useState('');
  const [transferSubArea, setTransferSubArea] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [templateCopied, setTemplateCopied] = useState(false);
  const [showEncerrar, setShowEncerrar] = useState(false);
  const [encerrarReason, setEncerrarReason] = useState('');
  const [editLog, setEditLog] = useState<{ field: string; old_value: string | null; new_value: string | null; changed_by: string | null; changed_at: string }[]>([]);
  const [showEditLog, setShowEditLog] = useState(false);
  const [contactLog, setContactLog] = useState<{ id: string; contacted_by: string; contacted_at: string }[]>([]);
  const [showContactLog, setShowContactLog] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchVolunteer() {
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
          subAreas: (data.sub_areas as string[] | undefined)?.length
            ? (data.sub_areas as string[])
            : [data.sub_area].filter(Boolean),
          coordinator: data.coordinator,
          currentStage: data.current_stage,
          stageHistory: (data.stage_history || []).map((h: { stage: string; date: string; note?: string; changed_by?: string }) => ({
            stage: h.stage,
            date: h.date,
            note: h.note,
            changedBy: h.changed_by ?? undefined,
          })),
          notes: data.notes,
          lastContactDate: data.last_contact_date,
          alertDays: data.alert_days,
          birthday: data.birthday ?? undefined,
          howFound: data.how_found ?? undefined,
          participatesGc: data.participates_gc ?? undefined,
          platforms: data.platforms ?? [],
          contactAttempts: data.contact_attempts ?? 0,
        });
      }
      setLoading(false);
    }

    async function fetchEditLog() {
      const { data } = await supabase
        .from('volunteer_edit_log')
        .select('field, old_value, new_value, changed_by, changed_at')
        .eq('volunteer_id', id)
        .order('changed_at', { ascending: false })
        .limit(50);
      if (data) setEditLog(data);
    }

    async function fetchContactLog() {
      const { data } = await supabase
        .from('contact_log')
        .select('id, contacted_by, contacted_at')
        .eq('volunteer_id', id)
        .order('contacted_at', { ascending: false })
        .limit(50);
      if (data) setContactLog(data);
    }

    fetchVolunteer();
    fetchEditLog();
    fetchContactLog();

    const channel = supabase
      .channel(`volunteer-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'volunteers', filter: `id=eq.${id}` },
        fetchVolunteer
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stage_history', filter: `volunteer_id=eq.${id}` },
        fetchVolunteer
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
  const stageOrder = getMinistryStages(ministry);
  const days = getDaysSinceLastContact(volunteer);
  const isOffTrack = OFF_TRACK_STAGES.includes(volunteer.currentStage);
  const currentIdx = isOffTrack ? -1 : stageOrder.indexOf(volunteer.currentStage);
  const canAdvance = !isOffTrack && currentIdx < stageOrder.length - 1;
  const canRetreat = !isOffTrack && currentIdx > 0;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function markContacted() {
    if (!volunteer) return;
    const now = new Date().toISOString();
    const newAttempts = (volunteer.contactAttempts ?? 0) + 1;
    const authorName = profile?.name ?? 'Desconhecido';
    setVolunteer(v => v ? { ...v, lastContactDate: now, alertDays: 0, contactAttempts: newAttempts } : v);
    await supabase.from('volunteers').update({ last_contact_date: now, contact_attempts: newAttempts }).eq('id', volunteer.id);
    const newEntry = { id: crypto.randomUUID(), contacted_by: authorName, contacted_at: now };
    await supabase.from('contact_log').insert({ volunteer_id: volunteer.id, contacted_by: authorName, contacted_at: now });
    setContactLog(prev => [newEntry, ...prev]);
    showToast('Contato registrado!');
  }

  async function resetAttempts() {
    if (!volunteer) return;
    setVolunteer(v => v ? { ...v, contactAttempts: 0 } : v);
    await supabase.from('volunteers').update({ contact_attempts: 0 }).eq('id', volunteer.id);
  }

  function copyTemplate() {
    if (!volunteer || !ministry) return;
    const msg = buildTemplate(volunteer.currentStage, volunteer, ministry.name, profile?.name);
    navigator.clipboard.writeText(msg).then(() => {
      setTemplateCopied(true);
      setTimeout(() => setTemplateCopied(false), 2000);
    });
  }

  async function advanceStage() {
    if (!volunteer || !canAdvance) return;
    const nextStage = stageOrder[currentIdx + 1];
    const now = new Date().toISOString();
    const authorName = profile?.name ?? 'Desconhecido';
    setVolunteer(v => v ? {
      ...v,
      currentStage: nextStage,
      lastContactDate: now,
      alertDays: 0,
      stageHistory: [...v.stageHistory, { stage: nextStage, date: now, changedBy: authorName }],
    } : v);
    await supabase.from('volunteers').update({ current_stage: nextStage, last_contact_date: now }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage: nextStage, date: now, changed_by: authorName });
    showToast(`Avançado para: ${STAGE_LABELS[nextStage]}`);
  }

  async function retreatStage() {
    if (!volunteer || !canRetreat) return;
    const prevStage = stageOrder[currentIdx - 1];
    const now = new Date().toISOString();
    const authorName = profile?.name ?? 'Desconhecido';
    setVolunteer(v => v ? {
      ...v,
      currentStage: prevStage,
      stageHistory: [...v.stageHistory, { stage: prevStage, date: now, note: 'Etapa retrocedida manualmente', changedBy: authorName }],
    } : v);
    await supabase.from('volunteers').update({ current_stage: prevStage }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage: prevStage, date: now, note: 'Etapa retrocedida manualmente', changed_by: authorName });
    showToast(`Retrocedido para: ${STAGE_LABELS[prevStage]}`);
  }

  async function setOffTrack(stage: 'mudou_area' | 'nao_retornou') {
    if (!volunteer) return;
    const now = new Date().toISOString();
    const authorName = profile?.name ?? 'Desconhecido';
    setVolunteer(v => v ? { ...v, currentStage: stage, stageHistory: [...v.stageHistory, { stage, date: now, changedBy: authorName }] } : v);
    await supabase.from('volunteers').update({ current_stage: stage }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage, date: now, changed_by: authorName });
    showToast(`Status: ${STAGE_LABELS[stage]}`);
  }

  async function reactivate() {
    if (!volunteer) return;
    const now = new Date().toISOString();
    const authorName = profile?.name ?? 'Desconhecido';
    const lastTrackStage = ([...volunteer.stageHistory].reverse()
      .find(h => stageOrder.includes(h.stage as JourneyStage))?.stage as JourneyStage) ?? stageOrder[0];
    setVolunteer(v => v ? {
      ...v,
      currentStage: lastTrackStage,
      stageHistory: [...v.stageHistory, { stage: lastTrackStage, date: now, note: 'Reativado', changedBy: authorName }],
    } : v);
    await supabase.from('volunteers').update({ current_stage: lastTrackStage }).eq('id', volunteer.id);
    await supabase.from('stage_history').insert({ volunteer_id: volunteer.id, stage: lastTrackStage, date: now, note: 'Reativado', changed_by: authorName });
    showToast(`Reativado em: ${STAGE_LABELS[lastTrackStage]}`);
  }

  function startEdit(field: 'phone' | 'email' | 'name' | 'subArea' | 'birthday' | 'howFound') {
    setEditField(field);
    if (field === 'birthday') setEditValue(volunteer?.birthday ?? '');
    else if (field === 'howFound') setEditValue(volunteer?.howFound ?? '');
    else setEditValue(volunteer?.[field as 'phone' | 'email' | 'name' | 'subArea'] ?? '');
  }

  async function saveEdit() {
    if (!volunteer || !editField) return;
    const trimmed = editValue.trim();
    const dbField = editField === 'subArea' ? 'sub_area' : editField === 'howFound' ? 'how_found' : editField;
    const updates: Record<string, string | null> = { [dbField]: trimmed || null };

    if (editField === 'subArea') {
      const subAreaObj = ministry?.subAreas.find(sa => sa.name === trimmed);
      // Prioriza coordenador real (user_profiles), cai para legacy freetext, depois vazio
      const newCoordinator =
        subAreaObj?.coordinatorNames?.[0] ??
        subAreaObj?.coordinator ??
        '';
      updates.coordinator = newCoordinator;
      // Mantém sub_areas coerente: troca a primária antiga pela nova, mantém secundárias
      const oldPrimary = volunteer.subArea;
      const newSubAreas = [trimmed, ...(volunteer.subAreas ?? []).filter(s => s !== oldPrimary && s !== trimmed)];
      (updates as Record<string, unknown>).sub_areas = newSubAreas;
      setVolunteer(v => v ? { ...v, subArea: trimmed, subAreas: newSubAreas, coordinator: newCoordinator } : v);
    } else if (editField === 'birthday') {
      setVolunteer(v => v ? { ...v, birthday: trimmed || undefined } : v);
    } else if (editField === 'howFound') {
      setVolunteer(v => v ? { ...v, howFound: trimmed || undefined } : v);
    } else {
      setVolunteer(v => v ? { ...v, [editField]: trimmed } : v);
    }

    setEditField(null);
    await supabase.from('volunteers').update(updates).eq('id', volunteer.id);

    // Log the edit
    const fieldLabel: Record<string, string> = {
      phone: 'Telefone', email: 'Email', name: 'Nome',
      subArea: 'Sub-área', birthday: 'Aniversário', howFound: 'Como chegou',
    };
    const oldVal = editField === 'birthday' ? (volunteer.birthday ?? null)
      : editField === 'howFound' ? (volunteer.howFound ?? null)
      : (volunteer[editField as 'phone' | 'email' | 'name' | 'subArea'] ?? null);
    await supabase.from('volunteer_edit_log').insert({
      volunteer_id: volunteer.id,
      field: fieldLabel[editField] ?? editField,
      old_value: oldVal,
      new_value: trimmed || null,
      changed_by: profile?.name ?? null,
    });
    setEditLog(prev => [{
      field: fieldLabel[editField] ?? editField,
      old_value: oldVal,
      new_value: trimmed || null,
      changed_by: profile?.name ?? null,
      changed_at: new Date().toISOString(),
    }, ...prev]);

    showToast('Atualizado com sucesso!');
  }

  async function archiveVolunteer(reason?: string) {
    if (!volunteer) return;
    const now = new Date().toISOString();
    const userName = profile?.name ?? 'Desconhecido';
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const reasonSuffix = reason
      ? `\n\n[Arquivado por ${userName} em ${dateStr} às ${timeStr}]\nMotivo: ${reason}`
      : '';
    const updatedNotes = (volunteer.notes || '') + reasonSuffix;
    await supabase.from('volunteers').update({ archived_at: now, notes: updatedNotes }).eq('id', volunteer.id);
    showToast('Voluntário arquivado.');
    setTimeout(() => navigate('/arquivados'), 1200);
  }

  async function toggleSecondarySubArea(saName: string) {
    if (!volunteer) return;
    const primary = volunteer.subArea;
    if (saName === primary) return; // não remove a primária aqui
    const current = volunteer.subAreas ?? [primary];
    const next = current.includes(saName)
      ? current.filter(s => s !== saName)
      : [...current, saName];
    const withPrimary = next.includes(primary) ? next : [primary, ...next];
    setVolunteer(v => v ? { ...v, subAreas: withPrimary } : v);
    await supabase.from('volunteers').update({ sub_areas: withPrimary }).eq('id', volunteer.id);
  }

  async function transferMinistry() {
    if (!volunteer || !transferMinistryId || !transferSubArea || transferring) return;
    setTransferring(true);

    const now = new Date().toISOString();
    const authorName = profile?.name ?? 'Desconhecido';
    const fromMinistry = ministry?.name ?? volunteer.ministryId;
    const toMinistry = ministries.find(m => m.id === transferMinistryId)?.name ?? transferMinistryId;
    const toSubAreaObj = ministries.find(m => m.id === transferMinistryId)?.subAreas.find(sa => sa.name === transferSubArea);
    const newCoordinator = toSubAreaObj?.coordinatorNames?.[0] ?? toSubAreaObj?.coordinator ?? '';
    const historyNote = `Transferido de ${fromMinistry} (${volunteer.subArea}) para ${toMinistry} (${transferSubArea})${transferNote ? ` — ${transferNote}` : ''}`;

    // Atualiza o voluntário
    await supabase.from('volunteers').update({
      ministry_id: transferMinistryId,
      sub_area: transferSubArea,
      sub_areas: [transferSubArea],
      coordinator: newCoordinator,
      current_stage: 'cadastrado',
      last_contact_date: now,
    }).eq('id', volunteer.id);

    // Registra no histórico de etapas
    await supabase.from('stage_history').insert({
      volunteer_id: volunteer.id,
      stage: 'cadastrado',
      date: now,
      note: historyNote,
      changed_by: authorName,
    });

    // Registra no log de edições
    await supabase.from('volunteer_edit_log').insert([
      { volunteer_id: volunteer.id, field: 'Ministério', old_value: fromMinistry, new_value: toMinistry, changed_by: authorName },
      { volunteer_id: volunteer.id, field: 'Sub-área', old_value: volunteer.subArea, new_value: transferSubArea, changed_by: authorName },
    ]);

    // Atualiza estado local
    setVolunteer(v => v ? {
      ...v,
      ministryId: transferMinistryId,
      subArea: transferSubArea,
      subAreas: [transferSubArea],
      coordinator: newCoordinator,
      currentStage: 'cadastrado',
      lastContactDate: now,
      stageHistory: [...v.stageHistory, { stage: 'cadastrado', date: now, note: historyNote, changedBy: authorName }],
    } : v);

    setTransferring(false);
    setShowTransfer(false);
    setTransferMinistryId('');
    setTransferSubArea('');
    setTransferNote('');
    showToast(`Transferido para ${toMinistry}!`);
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

      {/* Archive confirm modal */}
      {showEncerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-gray-900 mb-1">Encerrar jornada</h3>
            <p className="text-sm text-gray-500 mb-3">Descreva o motivo para registrar no histórico.</p>
            <textarea
              value={encerrarReason}
              onChange={e => setEncerrarReason(e.target.value)}
              placeholder="Descreva o motivo (mínimo 10 caracteres)..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none mb-4"
            />
            {encerrarReason.trim().length > 0 && encerrarReason.trim().length < 10 && (
              <p className="text-xs text-red-500 -mt-2 mb-3">Mínimo de 10 caracteres.</p>
            )}
            <div className="space-y-3 mb-5">
              <button
                disabled={encerrarReason.trim().length < 10}
                onClick={() => { setOffTrack('nao_retornou'); setShowEncerrar(false); setEncerrarReason(''); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-semibold text-red-700">Sem Retorno</p>
                <p className="text-xs text-red-500 mt-0.5">Voluntário não respondeu aos contatos. Ainda aparece no Follow-up.</p>
              </button>
              <button
                onClick={() => { setShowEncerrar(false); setEncerrarReason(''); setShowTransfer(true); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <p className="text-sm font-semibold text-blue-700">Transferir de Ministério</p>
                <p className="text-xs text-blue-500 mt-0.5">Seleciona o ministério e sub-área de destino. Registrado no histórico.</p>
              </button>
              <button
                disabled={encerrarReason.trim().length < 10}
                onClick={() => { archiveVolunteer(encerrarReason.trim()); setShowEncerrar(false); setEncerrarReason(''); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-semibold text-gray-700">Arquivar</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove de todas as listas. Acessível em Arquivados.</p>
              </button>
            </div>
            <button onClick={() => { setShowEncerrar(false); setEncerrarReason(''); }} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* Transfer Ministry Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft size={18} className="text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900">Transferir de Ministério</h3>
            </div>

            <div className="space-y-3 mb-4">
              {/* De → para */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-600">
                <span className="font-medium text-gray-800">{ministry?.name}</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-400 italic">{ministries.find(m => m.id === transferMinistryId)?.name ?? 'selecione abaixo'}</span>
              </div>

              {/* Ministério destino */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ministério de destino</label>
                <select
                  value={transferMinistryId}
                  onChange={e => { setTransferMinistryId(e.target.value); setTransferSubArea(''); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Selecione...</option>
                  {ministries.filter(m => m.id !== volunteer?.ministryId).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Sub-área destino */}
              {transferMinistryId && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sub-área no novo ministério</label>
                  <select
                    value={transferSubArea}
                    onChange={e => setTransferSubArea(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Selecione...</option>
                    {ministries.find(m => m.id === transferMinistryId)?.subAreas.map(sa => (
                      <option key={sa.id} value={sa.name}>{sa.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Observação opcional */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  placeholder="Ex: sentiu chamado para este ministério"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <p className="text-xs text-gray-400">
                A jornada reiniciará em <strong>Novo Cadastro</strong> no ministério de destino. A transferência ficará registrada no histórico.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowTransfer(false); setTransferMinistryId(''); setTransferSubArea(''); setTransferNote(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                disabled={!transferMinistryId || !transferSubArea || transferring}
                onClick={transferMinistry}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <ArrowRightLeft size={14} />
                {transferring ? 'Transferindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>

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
                  {/* Subáreas secundárias */}
                  {(() => {
                    const secondary = (volunteer.subAreas ?? []).filter(s => s && s !== volunteer.subArea);
                    if (secondary.length === 0 && !editingSubAreas) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {secondary.map(s => (
                          <span key={s} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {s}
                            {editingSubAreas && (
                              <button onClick={() => toggleSecondarySubArea(s)} className="text-indigo-400 hover:text-red-500 ml-0.5">
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        ))}
                        {editingSubAreas && ministry?.subAreas
                          .filter(sa => sa.name !== volunteer.subArea && !(volunteer.subAreas ?? []).includes(sa.name))
                          .map(sa => (
                            <button
                              key={sa.id}
                              onClick={() => toggleSecondarySubArea(sa.name)}
                              className="text-xs bg-gray-50 text-gray-500 border border-dashed border-gray-300 px-2 py-0.5 rounded-full hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                            >
                              + {sa.name}
                            </button>
                          ))
                        }
                        <button
                          onClick={() => setEditingSubAreas(e => !e)}
                          className="text-xs text-gray-400 hover:text-indigo-600 p-0.5 transition-colors"
                          title={editingSubAreas ? 'Fechar edição de subáreas' : 'Editar subáreas secundárias'}
                        >
                          {editingSubAreas ? <X size={11} /> : <Pencil size={11} />}
                        </button>
                      </div>
                    );
                  })()}
                  {/* Botão para adicionar 1ª subárea secundária quando não há nenhuma */}
                  {!editingSubAreas && (volunteer.subAreas ?? []).filter(s => s && s !== volunteer.subArea).length === 0 && (
                    <button
                      onClick={() => setEditingSubAreas(true)}
                      className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-0.5 mt-1 transition-colors"
                      title="Adicionar subárea secundária"
                    >
                      <Pencil size={10} /> <span>também atua em...</span>
                    </button>
                  )}
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
              <WaButton phone={volunteer.phone} message={ministry ? buildTemplate(volunteer.currentStage, volunteer, ministry.name, profile?.name) : undefined} size="md" onClick={() => volunteer.phone && markContacted()} />
              {isOffTrack ? (
                <>
                  <button
                    className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                    onClick={reactivate}
                  >
                    <ChevronRight size={14} />
                    Reativar na Trilha
                  </button>
                  <button
                    className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 px-3 py-2 rounded-xl font-medium transition-colors text-xs"
                    onClick={() => archiveVolunteer()}
                  >
                    <Archive size={13} />
                    Arquivar
                  </button>
                </>
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
                    className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 px-3 py-2 rounded-xl font-medium transition-colors text-xs"
                    onClick={() => setShowEncerrar(true)}
                  >
                    <Archive size={13} />
                    Encerrar Jornada
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
              <button
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-colors ${templateCopied ? 'bg-green-100 text-green-700' : 'bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200'}`}
                onClick={copyTemplate}
                title="Copiar mensagem WhatsApp para esta etapa"
              >
                <Copy size={14} />
                {templateCopied ? 'Copiado!' : 'Template WA'}
              </button>
              <button
                className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl font-medium transition-colors"
                onClick={() => setShowTransfer(true)}
                title="Transferir para outro ministério"
              >
                <ArrowRightLeft size={14} />
                Transferir
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mt-5 pt-5 border-t border-gray-100">
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
                <div className="flex items-center gap-1.5 min-w-0">
                  <WaButton phone={volunteer.phone} message={ministry ? buildTemplate(volunteer.currentStage, volunteer, ministry.name, profile?.name) : undefined} size="sm" onClick={() => volunteer.phone && markContacted()} />
                  <span className="text-xs text-gray-400 font-mono truncate hidden sm:inline">{volunteer.phone || '—'}</span>
                  <button onClick={() => startEdit('phone')} className="text-gray-400 hover:text-indigo-600 transition-colors p-0.5 flex-shrink-0" title="Editar telefone">
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
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate min-w-0">{volunteer.email || <span className="text-gray-400 italic">não informado</span>}</span>
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
                <span className="text-sm text-gray-700">
                  {volunteer.registeredAt
                    ? new Date(volunteer.registeredAt).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
            </div>
            {/* Birthday */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Aniversário</p>
              {editField === 'birthday' ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus type="date" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditField(null); }}
                    className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0"
                  />
                  <button onClick={saveEdit} className="text-green-600 p-1"><Save size={13} /></button>
                  <button onClick={() => setEditField(null)} className="text-gray-400 p-1"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Cake size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {volunteer.birthday
                      ? new Date(volunteer.birthday + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                      : <span className="text-gray-400 italic text-xs">não informado</span>}
                  </span>
                  <button onClick={() => startEdit('birthday')} className="text-gray-400 hover:text-indigo-600 p-0.5"><Pencil size={11} /></button>
                </div>
              )}
            </div>
            {/* Como chegou — editable */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Como chegou</p>
              {editField === 'howFound' ? (
                <div className="flex items-center gap-1">
                  <select
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditField(null); }}
                    className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0"
                  >
                    <option value="">— não informado —</option>
                    {HOW_FOUND_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button onClick={saveEdit} className="text-green-600 p-1"><Save size={13} /></button>
                  <button onClick={() => setEditField(null)} className="text-gray-400 p-1"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Compass size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-700 truncate min-w-0">
                    {volunteer.howFound || <span className="text-gray-400 italic">não informado</span>}
                  </span>
                  <button onClick={() => startEdit('howFound')} className="text-gray-400 hover:text-indigo-600 p-0.5 flex-shrink-0"><Pencil size={11} /></button>
                </div>
              )}
            </div>
            {/* Contact attempts */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tentativas</p>
              <div className="flex items-center gap-2">
                <PhoneCall size={13} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">{volunteer.contactAttempts ?? 0}</span>
                {(volunteer.contactAttempts ?? 0) > 0 && (
                  <button onClick={resetAttempts} className="text-xs text-gray-400 hover:text-red-500 transition-colors" title="Zerar tentativas">↺</button>
                )}
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
          <StageProgressBar currentStage={volunteer.currentStage} stageOrder={stageOrder} />
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
                    {entry.changedBy && (
                      <p className="text-xs text-indigo-500 mt-0.5 font-medium">por {entry.changedBy}</p>
                    )}
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <h2 className="text-base font-semibold text-gray-800">Contatos WhatsApp</h2>
              </div>
              {contactLog.length > 0 && (
                <button
                  onClick={() => setShowContactLog(v => !v)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showContactLog ? 'Ocultar' : `Ver todos (${contactLog.length})`}
                </button>
              )}
            </div>
            {contactLog.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{contactLog[0].contacted_by}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{formatDate(contactLog[0].contacted_at)}</span>
                </div>
                <p className={`text-xs mt-1 font-medium ${
                  days >= 14 ? 'text-red-500' : days >= 7 ? 'text-orange-500' : 'text-green-500'
                }`}>
                  {days === 0 ? 'Hoje' : `Há ${days} dia${days !== 1 ? 's' : ''}`}
                </p>
                {showContactLog && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    {contactLog.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">{entry.contacted_by}</span>
                        <span className="text-gray-400">{formatDate(entry.contacted_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">{formatDate(volunteer.lastContactDate)}</p>
                <p className={`text-xs mt-1 font-medium ${
                  days >= 14 ? 'text-red-500' : days >= 7 ? 'text-orange-500' : 'text-green-500'
                }`}>
                  {days === 0 ? 'Hoje' : `Há ${days} dia${days !== 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-gray-400 mt-1 italic">Nenhum contato registrado ainda.</p>
              </>
            )}
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

          {/* Platforms / technical skills */}
          {volunteer.platforms && volunteer.platforms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Monitor size={16} className="text-gray-400" />
                <h2 className="text-base font-semibold text-gray-800">Conhecimentos Técnicos</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {volunteer.platforms.map(p => (
                  <span key={p} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {/* Edit history */}
          {editLog.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <button
                onClick={() => setShowEditLog(v => !v)}
                className="flex items-center gap-2 w-full text-left"
              >
                <History size={15} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800 flex-1">Histórico de Edições</h2>
                <span className="text-xs text-gray-400">{editLog.length} alteraç{editLog.length !== 1 ? 'ões' : 'ão'} · {showEditLog ? 'ocultar' : 'ver'}</span>
              </button>
              {showEditLog && (
                <div className="mt-3 space-y-2">
                  {editLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-gray-600 border-l-2 border-gray-100 pl-3">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-700">{entry.field}</span>
                        {entry.old_value && <span className="text-gray-400"> · antes: <span className="line-through">{entry.old_value}</span></span>}
                        {entry.new_value && <span className="text-indigo-600"> → {entry.new_value}</span>}
                        {entry.changed_by && <span className="text-gray-400"> por {entry.changed_by}</span>}
                      </div>
                      <span className="text-gray-300 flex-shrink-0 whitespace-nowrap">
                        {new Date(entry.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

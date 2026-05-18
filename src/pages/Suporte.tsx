import { useState, useEffect, useRef } from 'react';
import {
  HelpCircle, Clock, CheckCircle2, AlertCircle,
  ExternalLink, ChevronRight, X, ZoomIn,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  title: string;
  description: string;
  screenshot_url: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

type TicketStatus = 'all' | 'open' | 'in_progress' | 'resolved';

function StatusBadge({ status }: { status: SupportTicket['status'] }) {
  const map = {
    open:        { label: 'Aberto',       cls: 'bg-blue-100 text-blue-700',   icon: <AlertCircle size={12} /> },
    in_progress: { label: 'Em andamento', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
    resolved:    { label: 'Resolvido',    cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

function TicketModal({
  ticket, onClose, onSaved,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onSaved: (updated: SupportTicket) => void;
}) {
  const [status, setStatus] = useState<SupportTicket['status']>(ticket.status);
  const [notes, setNotes] = useState(ticket.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, admin_notes: notes.trim() || null, updated_at: now })
      .eq('id', ticket.id);
    setSaving(false);
    if (!error) {
      onSaved({ ...ticket, status, admin_notes: notes.trim() || null, updated_at: now });
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <StatusBadge status={ticket.status} />
            <h2 className="font-bold text-gray-900 text-sm truncate">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
              {ticket.user_name || 'Usuário'}
            </span>
            {ticket.user_email && (
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{ticket.user_email}</span>
            )}
            <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded">
              {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descrição</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 border border-gray-100 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Screenshot */}
          {ticket.screenshot_url && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Print anexado</p>
                <a
                  href={ticket.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                >
                  <ExternalLink size={12} /> Abrir original
                </a>
              </div>
              <div
                className="relative cursor-zoom-in rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                onClick={() => setImgZoom(true)}
              >
                <img
                  src={ticket.screenshot_url}
                  alt="Screenshot do usuário"
                  className="w-full object-contain max-h-56"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                  <ZoomIn size={28} className="text-white drop-shadow" />
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2">
              {(['open', 'in_progress', 'resolved'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    status === s
                      ? s === 'open' ? 'bg-blue-600 text-white border-blue-600'
                        : s === 'in_progress' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {s === 'open' ? 'Aberto' : s === 'in_progress' ? 'Em andamento' : 'Resolvido'}
                </button>
              ))}
            </div>
          </div>

          {/* Admin notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Resposta / Notas internas
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Escreva uma resposta para o usuário ou anotações internas..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Full-screen image zoom */}
      {imgZoom && ticket.screenshot_url && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImgZoom(false)}
        >
          <img
            src={ticket.screenshot_url}
            alt="Screenshot ampliado"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => setImgZoom(false)}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Suporte() {
  usePageTitle('Suporte')
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('open');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/ajuda', { replace: true });
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTickets(data as SupportTicket[]);
        setLoading(false);
      });
  }, [isAdmin]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  const stats = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 min-w-0 w-full max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie os tickets enviados pelos usuários</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'open',        label: 'Abertos',       color: 'bg-blue-50  border-blue-200  text-blue-700'  },
          { key: 'in_progress', label: 'Em andamento',  color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { key: 'resolved',    label: 'Resolvidos',    color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.key} className={`rounded-2xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{stats[s.key as keyof typeof stats]}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s === 'all' ? 'Todos' : s === 'open' ? 'Abertos' : s === 'in_progress' ? 'Em andamento' : 'Resolvidos'}
            {s !== 'all' && <span className="ml-1.5 opacity-70">{stats[s as keyof typeof stats]}</span>}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <HelpCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum ticket encontrado</p>
            <p className="text-xs mt-1">
              {statusFilter === 'open' ? 'Nenhum ticket aberto no momento.' : 'Tente outro filtro.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={ticket.status} />
                    <span className="text-xs text-gray-400">
                      {new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                    {ticket.screenshot_url && (
                      <span className="text-xs bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-medium">
                        📎 print
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{ticket.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {ticket.user_name || ticket.user_email || 'Usuário'} · {ticket.description.slice(0, 90)}{ticket.description.length > 90 ? '…' : ''}
                  </p>
                  {ticket.admin_notes && (
                    <p className="text-xs text-indigo-500 mt-1 truncate">↳ {ticket.admin_notes}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onSaved={updated => {
            setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelected(null);
            showToast('Ticket atualizado!');
          }}
        />
      )}
    </div>
  );
}

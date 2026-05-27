/**
 * PendingInfoModal
 *
 * Aparece uma vez por sessão para coordenadores no Dashboard.
 * Mostra voluntários da sua sub-área com informações pendentes
 * e permite preenchê-las inline sem sair da tela.
 */
import { useState, useEffect, useRef } from 'react';
import { X, ClipboardCheck, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HOW_FOUND_OPTIONS } from '../types';
import type { Volunteer } from '../types';

const SESSION_KEY = 'pending_info_modal_dismissed';

interface PendingField {
  key: keyof Volunteer;
  label: string;
  type: 'date' | 'email' | 'select';
  options?: string[];
}

const PENDING_FIELDS: PendingField[] = [
  { key: 'birthday',  label: 'Data de nascimento', type: 'date' },
  { key: 'email',     label: 'E-mail',              type: 'email' },
  { key: 'howFound',  label: 'Como chegou até nós', type: 'select', options: HOW_FOUND_OPTIONS },
];

function isMissing(v: Volunteer, field: PendingField): boolean {
  const val = v[field.key];
  return val === null || val === undefined || val === '';
}

interface Props {
  volunteers: Volunteer[];
  mySubAreaNames: string[];   // sub-area names this coordinator manages
  onClose: () => void;
}

export default function PendingInfoModal({ volunteers, mySubAreaNames, onClose }: Props) {
  // Filter: only my sub-area volunteers with at least one missing field
  const candidates = volunteers.filter(v => {
    if (v.archivedAt) return false;
    if (['mudou_area', 'nao_retornou'].includes(v.currentStage)) return false;
    const inMyArea = mySubAreaNames.length === 0 || mySubAreaNames.some(s => (v.subAreas ?? [v.subArea]).includes(s));
    if (!inMyArea) return false;
    return PENDING_FIELDS.some(f => isMissing(v, f));
  });

  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    // Suave: atrasa 600ms para não aparecer junto com o carregamento da página
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (candidates.length === 0) {
    onClose();
    return null;
  }

  const current = candidates[idx];
  const missingFields = PENDING_FIELDS.filter(f => isMissing(current, f));
  const currentValues = values[current.id] ?? {};

  function setValue(volunteerId: string, fieldKey: string, val: string) {
    setValues(prev => ({
      ...prev,
      [volunteerId]: { ...(prev[volunteerId] ?? {}), [fieldKey]: val },
    }));
  }

  async function saveCurrentAndNext() {
    if (!current || saving) return;
    const edits = currentValues;
    const hasEdits = Object.keys(edits).some(k => edits[k] !== '' && edits[k] !== undefined);

    if (hasEdits) {
      setSaving(true);
      const updates: Record<string, string | null> = {};
      if (edits.birthday  !== undefined) updates.birthday  = edits.birthday  || null;
      if (edits.email     !== undefined) updates.email     = edits.email     || null;
      if (edits.howFound  !== undefined) updates.how_found = edits.howFound  || null;
      await supabase.from('volunteers').update(updates).eq('id', current.id);
      setSaved(prev => new Set(prev).add(current.id));
      setSaving(false);
    }

    if (idx < candidates.length - 1) {
      setIdx(i => i + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleDismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    dismiss();
  }

  const total = candidates.length;
  const progress = Math.round(((idx + (saved.has(current.id) ? 1 : 0)) / total) * 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 transition-all duration-300 ease-out ${visible ? 'bg-black/20 backdrop-blur-[2px]' : 'bg-transparent pointer-events-none'}`}
      onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}
    >
      <div
        className={`w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Informações pendentes</p>
              <p className="text-xs text-gray-400">{total} voluntário{total !== 1 ? 's' : ''} com dados incompletos</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 mb-4">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{idx + 1} de {total}</p>
        </div>

        {/* Volunteer card */}
        <div className="px-5 pb-2">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                {current.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{current.name}</p>
                <p className="text-xs text-gray-400">{current.subArea}</p>
              </div>
              {saved.has(current.id) && (
                <span className="ml-auto text-xs text-green-600 flex items-center gap-1 font-medium">
                  <Check size={12} /> Salvo
                </span>
              )}
            </div>

            {/* Missing fields */}
            <div className="space-y-3">
              {missingFields.map(field => (
                <div key={field.key as string}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={currentValues[field.key as string] ?? ''}
                      onChange={e => setValue(current.id, field.key as string, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    >
                      <option value="">Selecione...</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      ref={el => { if (el && missingFields[0].key === field.key) firstInputRef.current = el; }}
                      type={field.type}
                      value={currentValues[field.key as string] ?? ''}
                      onChange={e => setValue(current.id, field.key as string, e.target.value)}
                      max={field.type === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                      placeholder={field.type === 'email' ? 'nome@email.com' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button
            disabled={idx === 0}
            onClick={() => setIdx(i => i - 1)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft size={14} /> Anterior
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (idx < candidates.length - 1) setIdx(i => i + 1);
                else handleDismiss();
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Pular
            </button>
            <button
              onClick={saveCurrentAndNext}
              disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              {saving ? 'Salvando...' : idx < total - 1 ? (
                <><Check size={12} /> Salvar e próximo <ChevronRight size={12} /></>
              ) : (
                <><Check size={12} /> Salvar e fechar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SESSION_KEY };

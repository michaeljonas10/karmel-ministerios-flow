import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMinistries } from '../hooks/useMinistries';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import type { ThemeId } from '../contexts/ThemeContext';
import { Settings, Church, Link2, Users, Copy, Check, Plus, X, Pencil, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, UserPlus, ShieldCheck, User, Palette } from 'lucide-react';
import type { Ministry, SubArea } from '../types';
import type { UserProfile } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChurchSettings {
  id: string;
  church_name: string;
  subtitle: string;
  cnpj: string;
  phone: string;
  address: string;
  city: string;
  website: string;
  email: string;
  logo_url: string;
}

const BASE_URL = 'https://pulse-ministerios.vercel.app';

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
      <Check size={16} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// ─── Tab 1 — Igreja ──────────────────────────────────────────────────────────
function TabIgreja({ onToast }: { onToast: (msg: string) => void }) {
  const [form, setForm] = useState<ChurchSettings>({
    id: 'main',
    church_name: 'Lagoinha Osasco',
    subtitle: 'Lagoinha Osasco',
    cnpj: '',
    phone: '',
    address: '',
    city: '',
    website: '',
    email: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoValid, setLogoValid] = useState(false);

  useEffect(() => {
    supabase
      .from('church_settings')
      .select('*')
      .eq('id', 'main')
      .single()
      .then(({ data }) => {
        if (data) setForm(data as ChurchSettings);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!form.logo_url) { setLogoValid(false); return; }
    const img = new Image();
    img.onload = () => setLogoValid(true);
    img.onerror = () => setLogoValid(false);
    img.src = form.logo_url;
  }, [form.logo_url]);

  const set = (field: keyof ChurchSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('church_settings')
      .upsert({ ...form, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) onToast('Configurações salvas com sucesso!');
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Carregando...</div>;

  const fields: { label: string; key: keyof ChurchSettings; placeholder?: string }[] = [
    { label: 'Nome da Igreja', key: 'church_name', placeholder: 'Lagoinha Osasco' },
    { label: 'Subtítulo / Slogan', key: 'subtitle', placeholder: 'Lagoinha Osasco' },
    { label: 'CNPJ', key: 'cnpj', placeholder: '00.000.000/0000-00' },
    { label: 'Telefone', key: 'phone', placeholder: '(31) 9 0000-0000' },
    { label: 'Endereço', key: 'address', placeholder: 'Rua das Flores, 123' },
    { label: 'Cidade', key: 'city', placeholder: 'Belo Horizonte - MG' },
    { label: 'Website', key: 'website', placeholder: 'https://lagoinha.com.br' },
    { label: 'Email de Contato', key: 'email', placeholder: 'contato@lagoinha.com.br' },
    { label: 'Logo URL', key: 'logo_url', placeholder: 'https://...' },
  ];

  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {fields.map(({ label, key, placeholder }) => (
          <div key={key} className={key === 'address' || key === 'logo_url' ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="text"
              value={(form[key] as string) ?? ''}
              onChange={set(key)}
              placeholder={placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        ))}
      </div>

      {/* Logo preview */}
      {logoValid && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 inline-block">
          <p className="text-xs text-gray-500 mb-2 font-medium">Preview do Logo</p>
          <img src={form.logo_url} alt="Logo" className="h-20 object-contain rounded-lg" />
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  );
}

// ─── Tab 2 — Link de Cadastro ─────────────────────────────────────────────────
function TabLink() {
  const { ministries } = useMinistries();
  const [copied, setCopied] = useState('');
  const [selectedMinistry, setSelectedMinistry] = useState('');

  const baseLink = `${BASE_URL}/cadastro`;
  const ministryLink = selectedMinistry
    ? `${BASE_URL}/cadastro?ministerio=${selectedMinistry}`
    : '';

  const copy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="max-w-xl space-y-8">
      {/* Main link */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <h3 className="font-semibold text-indigo-900 mb-1">Link Geral de Cadastro</h3>
        <p className="text-indigo-600 text-sm mb-3">
          Envie este link para novos voluntários se cadastrarem diretamente.
        </p>
        <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-2 mb-3">
          <span className="text-sm text-gray-700 flex-1 break-all">{baseLink}</span>
        </div>
        <button
          onClick={() => copy(baseLink, 'main')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {copied === 'main' ? <Check size={15} /> : <Copy size={15} />}
          {copied === 'main' ? 'Copiado!' : 'Copiar Link'}
        </button>
      </div>

      {/* QR Code geral */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-gray-600">QR Code — Link Geral</p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseLink)}`}
          alt="QR Code"
          className="rounded-xl shadow-md border border-gray-200"
          width={200}
          height={200}
        />
      </div>

      {/* Ministry-specific link */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Link por Ministério</h3>
        <select
          value={selectedMinistry}
          onChange={e => setSelectedMinistry(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Selecione um ministério...</option>
          {ministries.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {ministryLink && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700 flex-1 break-all">{ministryLink}</span>
            </div>
            <button
              onClick={() => copy(ministryLink, 'ministry')}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {copied === 'ministry' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'ministry' ? 'Copiado!' : 'Copiar Link do Ministério'}
            </button>
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-gray-500 font-medium">QR Code — {ministries.find(m => m.id === selectedMinistry)?.name}</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ministryLink)}`}
                alt="QR Code Ministério"
                className="rounded-xl shadow-md border border-gray-200"
                width={200}
                height={200}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ministry Modal ──────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  '#3b82f6','#8b5cf6','#f59e0b','#10b981','#6366f1','#f97316',
  '#ec4899','#14b8a6','#ef4444','#84cc16','#06b6d4','#a855f7',
];
const ICON_OPTIONS = [
  'Camera','Music','Baby','Zap','Heart','Home',
  'Star','Shield','BookOpen','Globe','Users','Cross',
  'Mic','Film','Radio','Tv','Headphones','Volume2',
];

interface MinistryForm {
  id: string;
  name: string;
  color: string;
  icon: string;
  coordinators: string[];
  subAreas: SubArea[];
}

function emptyForm(): MinistryForm {
  return { id: '', name: '', color: '#3b82f6', icon: 'Star', coordinators: [], subAreas: [] };
}

function MinistryModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: MinistryForm;
  onSave: (f: MinistryForm) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<MinistryForm>(initial);
  const [newCoord, setNewCoord] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newSubCoord, setNewSubCoord] = useState('');
  const isNew = !initial.id;
  const overlayRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof MinistryForm) => (v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const addCoord = () => {
    const t = newCoord.trim();
    if (!t || form.coordinators.includes(t)) return;
    setForm(p => ({ ...p, coordinators: [...p.coordinators, t] }));
    setNewCoord('');
  };

  const removeCoord = (c: string) =>
    setForm(p => ({ ...p, coordinators: p.coordinators.filter(x => x !== c) }));

  const addSub = () => {
    const name = newSub.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setForm(p => ({
      ...p,
      subAreas: [...p.subAreas, { id, name, coordinator: newSubCoord.trim() || '', volunteerCount: 0 }],
    }));
    setNewSub('');
    setNewSubCoord('');
  };

  const removeSub = (id: string) =>
    setForm(p => ({ ...p, subAreas: p.subAreas.filter(s => s.id !== id) }));

  const updateSubCoord = (id: string, coord: string) =>
    setForm(p => ({
      ...p,
      subAreas: p.subAreas.map(s => s.id === id ? { ...s, coordinator: coord } : s),
    }));

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-lg">
            {isNew ? 'Novo Ministério' : `Editar — ${initial.name}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Ministério *</label>
            <input
              value={form.name}
              onChange={e => set('name')(e.target.value)}
              placeholder="ex: Comunicação"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color')(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => set('icon')(ic)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.icon === ic
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: form.color + '20' }}>
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: form.color }} />
            <span className="font-semibold text-gray-800">{form.name || 'Prévia do ministério'}</span>
          </div>

          {/* Coordinators */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Coordenadores</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.coordinators.map(c => (
                <span key={c} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                  {c}
                  <button onClick={() => removeCoord(c)} className="text-gray-400 hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCoord}
                onChange={e => setNewCoord(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCoord()}
                placeholder="Nome do coordenador..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addCoord}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium px-2"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </div>

          {/* Sub-areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Áreas</label>
            <div className="space-y-2 mb-3">
              {form.subAreas.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-gray-800">{s.name}</span>
                  <input
                    value={s.coordinator}
                    onChange={e => updateSubCoord(s.id, e.target.value)}
                    placeholder="Coordenador..."
                    className="w-36 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  <button onClick={() => removeSub(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSub()}
                placeholder="Nova sub-área..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                value={newSubCoord}
                onChange={e => setNewSubCoord(e.target.value)}
                placeholder="Coordenador..."
                className="w-36 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addSub}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium px-1"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Salvando...' : isNew ? 'Criar Ministério' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3 — Ministérios & Coordenadores ────────────────────────────────────
function TabMinisterios({ onToast }: { onToast: (msg: string) => void }) {
  const { ministries, loading, refetch } = useMinistries();
  const [modal, setModal] = useState<{ open: boolean; initial: MinistryForm }>({
    open: false,
    initial: emptyForm(),
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const openNew = () => setModal({ open: true, initial: emptyForm() });
  const openEdit = (m: Ministry) =>
    setModal({
      open: true,
      initial: {
        id: m.id,
        name: m.name,
        color: m.color,
        icon: m.icon,
        coordinators: [...m.coordinators],
        subAreas: m.subAreas.map(s => ({ ...s })),
      },
    });
  const closeModal = () => setModal(p => ({ ...p, open: false }));

  const toggleExpanded = (id: string) =>
    setExpanded(p => ({ ...p, [id]: !p[id] }));

  const saveMinistry = async (form: MinistryForm) => {
    if (!form.name.trim()) return;
    setSaving(true);

    const id = form.id || form.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

    // Upsert ministry
    const { error: mErr } = await supabase.from('ministries').upsert({
      id,
      name: form.name.trim(),
      color: form.color,
      icon: form.icon,
      coordinators: form.coordinators,
    });

    if (mErr) { onToast('Erro ao salvar ministério'); setSaving(false); return; }

    // Replace sub_areas: delete existing then insert new
    await supabase.from('sub_areas').delete().eq('ministry_id', id);
    if (form.subAreas.length > 0) {
      await supabase.from('sub_areas').insert(
        form.subAreas.map(s => ({
          id: `${id}_${s.id}`,
          ministry_id: id,
          name: s.name,
          coordinator: s.coordinator || '',
        }))
      );
    }

    setSaving(false);
    closeModal();
    await refetch();
    onToast(form.id ? 'Ministério atualizado!' : 'Ministério criado com sucesso!');
  };

  const deleteMinistry = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o ministério "${name}"?\n\nIsso não apagará os voluntários já cadastrados.`)) return;
    setDeleting(id);
    await supabase.from('sub_areas').delete().eq('ministry_id', id);
    await supabase.from('ministries').delete().eq('id', id);
    setDeleting(null);
    await refetch();
    onToast('Ministério excluído.');
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Carregando...</div>;

  return (
    <>
      <div className="space-y-4 max-w-2xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500">{ministries.length} ministério{ministries.length !== 1 ? 's' : ''} cadastrado{ministries.length !== 1 ? 's' : ''}</p>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Novo Ministério
          </button>
        </div>

        {/* Ministry cards */}
        {ministries.map(ministry => (
          <div key={ministry.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ministry.color }} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-800">{ministry.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {ministry.subAreas.length} sub-área{ministry.subAreas.length !== 1 ? 's' : ''} · {ministry.coordinators.length} coord.
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleExpanded(ministry.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Expandir"
                >
                  {expanded[ministry.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => openEdit(ministry)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => deleteMinistry(ministry.id, ministry.name)}
                  disabled={deleting === ministry.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expanded[ministry.id] && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                {/* Coordinators */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Coordenadores</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ministry.coordinators.length === 0
                      ? <span className="text-xs text-gray-400 italic">Nenhum coordenador</span>
                      : ministry.coordinators.map(c => (
                        <span key={c} className="bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                          {c}
                        </span>
                      ))
                    }
                  </div>
                </div>

                {/* Sub-areas */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sub-Áreas</p>
                  {ministry.subAreas.length === 0
                    ? <span className="text-xs text-gray-400 italic">Nenhuma sub-área</span>
                    : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {ministry.subAreas.map(s => (
                          <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-medium text-gray-800">{s.name}</p>
                            {s.coordinator && <p className="text-xs text-gray-400">{s.coordinator}</p>}
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>

                <button
                  onClick={() => openEdit(ministry)}
                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-medium transition-colors"
                >
                  <Pencil size={12} /> Editar ministério
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal.open && (
        <MinistryModal
          initial={modal.initial}
          onSave={saveMinistry}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </>
  );
}

// ─── Tab 4 — Usuários ────────────────────────────────────────────────────────
function TabUsuarios({ onToast }: { onToast: (msg: string) => void }) {
  const { ministries } = useMinistries();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'coordinator', ministry_id: '', sub_areas: [] as string[] });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState('');

  const selectedMinistry = ministries.find(m => m.id === form.ministry_id);
  const toggleSubArea = (id: string) =>
    setForm(p => ({ ...p, sub_areas: p.sub_areas.includes(id) ? p.sub_areas.filter(s => s !== id) : [...p.sub_areas, id] }));

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = () => {
    setForm({ name: '', email: '', password: '', role: 'coordinator', ministry_id: '', sub_areas: [] });
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.ministry_id) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    setFormError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      'https://fzbxzcwopgwsojxmckpa.supabase.co/functions/v1/create-coordinator',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          ministry_id: form.ministry_id,
          sub_areas: form.role === 'coordinator' ? form.sub_areas : [],
        }),
      }
    );
    const json = await res.json();
    setSaving(false);
    if (!res.ok || json.error) {
      setFormError(json.error || 'Erro ao criar usuário.');
    } else {
      setModalOpen(false);
      await fetchUsers();
      onToast(`${form.role === 'ministry_leader' ? 'Líder' : 'Coordenador'} "${form.name}" criado com sucesso!`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    setDeleteId(id);
    // Delete from user_profiles (auth user remains but loses app access without profile)
    await supabase.from('user_profiles').delete().eq('id', id);
    setDeleteId(null);
    await fetchUsers();
    onToast('Usuário removido.');
  };

  const getMinistryName = (id: string | null) => {
    if (!id) return '—';
    return ministries.find(m => m.id === id)?.name ?? id;
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Carregando...</div>;

  return (
    <>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus size={15} /> Adicionar Usuário
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Perfil</th>
                <th className="text-left px-5 py-3">Ministério</th>
                <th className="text-left px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                        {u.role === 'admin'
                          ? <ShieldCheck size={14} className="text-indigo-600" />
                          : <User size={14} className="text-purple-600" />
                        }
                      </div>
                      <span className="text-sm font-medium text-gray-800">{u.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{u.email}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.role === 'admin'
                      ? <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>
                      : u.role === 'ministry_leader'
                      ? <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">Líder</span>
                      : <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Coordenador</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{getMinistryName(u.ministry_id)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleteId === u.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Nenhum usuário cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 text-lg">Novo Usuário</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="coordenador@lagoinha.com.br"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha temporária *</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
                <div className="flex gap-2">
                  {[
                    { value: 'coordinator', label: 'Coordenador' },
                    { value: 'ministry_leader', label: 'Líder de Ministério' },
                  ].map(opt => (
                    <label key={opt.value} className="flex-1 flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm transition-colors"
                      style={form.role === opt.value ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' } : { borderColor: '#d1d5db', color: '#374151' }}>
                      <input type="radio" name="role" value={opt.value} checked={form.role === opt.value}
                        onChange={e => setForm(p => ({ ...p, role: e.target.value, sub_areas: [] }))}
                        className="hidden" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ministério *</label>
                <select
                  value={form.ministry_id}
                  onChange={e => setForm(p => ({ ...p, ministry_id: e.target.value, sub_areas: [] }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {ministries.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              {form.role === 'coordinator' && selectedMinistry && selectedMinistry.subAreas.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sub-áreas que irá coordenar</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {selectedMinistry.subAreas.map(sa => (
                      <label key={sa.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="checkbox" checked={form.sub_areas.includes(sa.id)} onChange={() => toggleSubArea(sa.id)} className="accent-indigo-600" />
                        {sa.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Criando...' : form.role === 'ministry_leader' ? 'Criar Líder' : 'Criar Coordenador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab 5 — Aparência ────────────────────────────────────────────────────────
function TabAparencia() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Tema de cores</h3>
        <p className="text-xs text-gray-500 mb-4">Cada usuário pode escolher seu próprio tema. A escolha fica salva no seu navegador.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as ThemeId)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                theme === t.id ? 'border-[var(--accent)] shadow-lg scale-[1.02]' : 'border-transparent hover:border-gray-200'
              }`}
            >
              {/* Sidebar preview */}
              <div
                className="h-16 w-full flex flex-col justify-between p-2"
                style={{ background: `linear-gradient(135deg, ${t.previewFrom}, ${t.previewTo})` }}
              >
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <div className="w-6 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.previewAccent }} />
                  <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: t.previewAccent + '60' }} />
                </div>
                {/* Active nav simulation */}
                <div className="flex gap-1 items-center rounded px-1 py-0.5" style={{ backgroundColor: t.previewAccent + '40' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.previewAccent }} />
                  <div className="w-8 h-1 rounded-full bg-white/60" />
                </div>
              </div>
              {/* Label */}
              <div className="bg-white px-3 py-2">
                <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  {t.name}
                  {t.dark && <span className="text-[10px] bg-gray-900 text-white px-1 rounded">dark</span>}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.description}</p>
              </div>
              {/* Checkmark */}
              {theme === t.id && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: t.previewAccent }}
                >
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
type Tab = 'igreja' | 'link' | 'ministerios' | 'usuarios' | 'aparencia';

const ALL_TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: 'igreja', label: 'Igreja', icon: <Church size={16} /> },
  { id: 'link', label: 'Link de Cadastro', icon: <Link2 size={16} /> },
  { id: 'ministerios', label: 'Ministérios', icon: <Users size={16} /> },
  { id: 'usuarios', label: 'Usuários', icon: <UserPlus size={16} />, adminOnly: true },
  { id: 'aparencia', label: 'Aparência', icon: <Palette size={16} /> },
];

export default function Configuracoes() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('igreja');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => setToast(msg);
  const TABS = ALL_TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Gerencie as informações da sua igreja</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center
              ${activeTab === tab.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'igreja' && <TabIgreja onToast={showToast} />}
        {activeTab === 'link' && <TabLink />}
        {activeTab === 'ministerios' && <TabMinisterios onToast={showToast} />}
        {activeTab === 'usuarios' && isAdmin && <TabUsuarios onToast={showToast} />}
        {activeTab === 'aparencia' && <TabAparencia />}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMinistries } from '../hooks/useMinistries';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { usePageTitle } from '../hooks/usePageTitle';
import type { ThemeId } from '../contexts/ThemeContext';
import {
  Settings, Church, Link2, Users, Copy, Check, Plus, X, Pencil, Trash2, ChevronDown, ChevronUp,
  Eye, EyeOff, UserPlus, ShieldCheck, User, Palette, Key, Bell, BellOff, BellRing,
  Camera, Music, Baby, Zap, Heart, Home, Star, Shield, BookOpen, Globe, Cross, Mic, Film, Radio, Tv, Headphones, Volume2,
  Car, Coffee, Megaphone, Flame, Waves, Gift, Monitor, Flower2, Utensils, Bus, Paintbrush, HandHeart, Scissors, Smile,
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import type { Ministry, SubArea, JourneyStage } from '../types';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
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
  'Car','Coffee','Megaphone','Flame','Waves','Gift',
  'Monitor','Flower2','Utensils','Bus','Paintbrush','HandHeart',
  'Scissors','Smile','Church',
];

const ICON_MAP: Record<string, React.ReactNode> = {
  Camera: <Camera size={18} />, Music: <Music size={18} />, Baby: <Baby size={18} />,
  Zap: <Zap size={18} />, Heart: <Heart size={18} />, Home: <Home size={18} />,
  Star: <Star size={18} />, Shield: <Shield size={18} />, BookOpen: <BookOpen size={18} />,
  Globe: <Globe size={18} />, Users: <Users size={18} />, Cross: <Cross size={18} />,
  Mic: <Mic size={18} />, Film: <Film size={18} />, Radio: <Radio size={18} />,
  Tv: <Tv size={18} />, Headphones: <Headphones size={18} />, Volume2: <Volume2 size={18} />,
  Car: <Car size={18} />, Coffee: <Coffee size={18} />, Megaphone: <Megaphone size={18} />,
  Flame: <Flame size={18} />, Waves: <Waves size={18} />, Gift: <Gift size={18} />,
  Monitor: <Monitor size={18} />, Flower2: <Flower2 size={18} />, Utensils: <Utensils size={18} />,
  Bus: <Bus size={18} />, Paintbrush: <Paintbrush size={18} />, HandHeart: <HandHeart size={18} />,
  Scissors: <Scissors size={18} />, Smile: <Smile size={18} />, Church: <Church size={18} />,
};

interface MinistryForm {
  id: string;
  name: string;
  color: string;
  icon: string;
  coordinators: string[];
  subAreas: SubArea[];
  journeyStages: JourneyStage[]; // empty = usar fluxo completo
}

function emptyForm(): MinistryForm {
  return { id: '', name: '', color: '#3b82f6', icon: 'Star', coordinators: [], subAreas: [], journeyStages: [] };
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
      subAreas: [...p.subAreas, { id, name, coordinator: newSubCoord.trim() || '', coordinatorNames: [], volunteerCount: 0 }],
    }));
    setNewSub('');
    setNewSubCoord('');
  };

  const removeSub = (id: string) =>
    setForm(p => ({ ...p, subAreas: p.subAreas.filter(s => s.id !== id) }));

  const updateSubName = (id: string, name: string) =>
    setForm(p => ({
      ...p,
      subAreas: p.subAreas.map(s => s.id === id ? { ...s, name } : s),
    }));

  const updateSubCoord = (id: string, coord: string) =>
    setForm(p => ({
      ...p,
      subAreas: p.subAreas.map(s => s.id === id ? { ...s, coordinator: coord } : s),
    }));

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col">
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
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => set('icon')(ic)}
                  title={ic}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${
                    form.icon === ic
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {ICON_MAP[ic]}
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

          {/* Journey stages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etapas da Jornada</label>
            <p className="text-xs text-gray-400 mb-3">
              Desmarque as etapas que este ministério não usa. <span className="font-medium text-gray-500">Cadastrado</span> e <span className="font-medium text-gray-500">Estabelecido</span> são obrigatórios.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {STAGE_ORDER.map((stage) => {
                const locked = stage === 'cadastrado' || stage === 'estabelecido';
                const active = form.journeyStages.length === 0
                  ? true // all selected when using default
                  : form.journeyStages.includes(stage);
                const toggleStage = () => {
                  if (locked) return;
                  setForm(p => {
                    const current = p.journeyStages.length === 0 ? STAGE_ORDER : p.journeyStages;
                    const next = current.includes(stage)
                      ? current.filter(s => s !== stage)
                      : [...current, stage].sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b));
                    // if all are selected, store empty (= default)
                    return { ...p, journeyStages: next.length === STAGE_ORDER.length ? [] : next };
                  });
                };
                return (
                  <label key={stage} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    locked ? 'bg-gray-50 border-gray-100 cursor-default' :
                    active ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' :
                    'bg-white border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={toggleStage}
                      disabled={locked}
                      className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                    />
                    <span className={`text-sm ${active ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                      {STAGE_LABELS[stage]}
                    </span>
                    {locked && <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">fixo</span>}
                  </label>
                );
              })}
            </div>
            {form.journeyStages.length > 0 && form.journeyStages.length < STAGE_ORDER.length && (
              <p className="text-xs text-indigo-600 mt-2">
                {form.journeyStages.length} de {STAGE_ORDER.length} etapas ativas
              </p>
            )}
          </div>

          {/* Sub-areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Áreas</label>
            <div className="space-y-2 mb-3">
              {form.subAreas.map(s => (
                <div key={s.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <input
                      value={s.name}
                      onChange={e => updateSubName(s.id, e.target.value)}
                      placeholder="Nome da sub-área..."
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white mb-1"
                    />
                    {s.coordinatorNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.coordinatorNames.map(n => (
                          <span key={n} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{n}</span>
                        ))}
                        <span className="text-xs text-gray-400 italic self-center ml-1">via conta de usuário</span>
                      </div>
                    ) : (
                      <input
                        value={s.coordinator}
                        onChange={e => updateSubCoord(s.id, e.target.value)}
                        placeholder="Nome do coordenador..."
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                      />
                    )}
                  </div>
                  <button onClick={() => removeSub(s.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
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
        journeyStages: m.journeyStages ? [...m.journeyStages] : [],
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
      journey_stages: form.journeyStages.length > 0 ? form.journeyStages : null,
    });

    if (mErr) { onToast('Erro ao salvar ministério'); setSaving(false); return; }

    // Detect sub-area renames before deleting so we can cascade to volunteers
    const prefix = id + '_';
    const stripPfx = (s: string) => { let r = s; while (r.startsWith(prefix)) r = r.slice(prefix.length); return r; };
    const originalMinistry = ministries.find(m => m.id === id);
    const renames: { oldName: string; newName: string }[] = [];
    if (originalMinistry) {
      for (const newSub of form.subAreas) {
        if (!newSub.name.trim()) continue;
        const newBase = stripPfx(newSub.id);
        const oldSub = originalMinistry.subAreas.find(os => stripPfx(os.id) === newBase);
        if (oldSub && oldSub.name !== newSub.name.trim()) {
          renames.push({ oldName: oldSub.name, newName: newSub.name.trim() });
        }
      }
    }

    // Replace sub_areas: delete existing then insert new
    await supabase.from('sub_areas').delete().eq('ministry_id', id);
    if (form.subAreas.length > 0) {
      await supabase.from('sub_areas').insert(
        form.subAreas.filter(s => s.name.trim()).map(s => {
          // Strip repeated ministry prefix (fixes double/triple-prefix bug on re-save)
          let baseId = s.id || s.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          while (baseId.startsWith(prefix)) baseId = baseId.slice(prefix.length);
          return {
            id: `${id}_${baseId}`,
            ministry_id: id,
            name: s.name.trim(),
            coordinator: s.coordinator || '',
          };
        })
      );
    }

    // Cascade renames to volunteers (sub_area field stores display name)
    for (const { oldName, newName } of renames) {
      await supabase
        .from('volunteers')
        .update({ sub_area: newName })
        .eq('ministry_id', id)
        .eq('sub_area', oldName);
    }

    await refetch();
    setSaving(false);
    closeModal();
    const renamed = renames.length > 0 ? ` (${renames.length} sub-área${renames.length > 1 ? 's' : ''} renomeada${renames.length > 1 ? 's' : ''})` : '';
    onToast(form.id ? `Ministério atualizado!${renamed}` : 'Ministério criado com sucesso!');
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
                  {ministry.subAreas.length} sub-área{ministry.subAreas.length !== 1 ? 's' : ''} · {new Set(ministry.subAreas.flatMap(sa => sa.coordinatorNames)).size} coord.
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
                {/* Sub-areas with coordinators */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sub-Áreas</p>
                  {ministry.subAreas.length === 0
                    ? <span className="text-xs text-gray-400 italic">Nenhuma sub-área</span>
                    : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {ministry.subAreas.map(s => (
                          <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-medium text-gray-800">{s.name}</p>
                            {s.coordinatorNames.length > 0
                              ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {s.coordinatorNames.map(n => (
                                    <span key={n} className="bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{n}</span>
                                  ))}
                                </div>
                              )
                              : <p className="text-xs text-gray-400 italic mt-0.5">Sem coordenador</p>
                            }
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
  const { ministries, refetch: refetchMinistries } = useMinistries();
  const { isSuperAdmin, profile: myProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'coordinator' as string, ministry_id: '', sub_areas: [] as string[] });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [resetPwdShow, setResetPwdShow] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  const selectedMinistry = ministries.find(m => m.id === form.ministry_id);
  const toggleSubArea = (id: string) =>
    setForm(p => ({ ...p, sub_areas: p.sub_areas.includes(id) ? p.sub_areas.filter(s => s !== id) : [...p.sub_areas, id] }));

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
    setLoading(false);
  };

  useEffect(() => {
    // Ensure ministries are fresh when this tab mounts
    refetchMinistries();
    fetchUsers();

    const channel = supabase
      .channel('user-profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, fetchUsers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ministries' }, refetchMinistries)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_areas' }, refetchMinistries)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const openModal = () => {
    setEditTarget(null);
    setForm({ name: '', email: '', password: '', role: 'coordinator', ministry_id: '', sub_areas: [] });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (u: UserProfile) => {
    setEditTarget(u);

    // Normalize stored sub_area IDs to the canonical IDs currently in the DB.
    // Legacy records may carry double-prefixed IDs (e.g. "com_com_foto") that
    // won't match the current "com_foto" keys → checkboxes appeared unchecked.
    const userMinistry = ministries.find(m => m.id === (u.ministry_id ?? ''));
    const prefix = (u.ministry_id ?? '') + '_';
    const stripPrefix = (id: string) => {
      let s = id;
      while (s.startsWith(prefix)) s = s.slice(prefix.length);
      return s;
    };
    const normalizedSubAreas = [...new Set(
      (u.sub_areas ?? []).map(storedId => {
        // Exact match first
        if (userMinistry?.subAreas.find(sa => sa.id === storedId)) return storedId;
        // Fuzzy match stripping repeated prefix from both sides
        const storedBase = stripPrefix(storedId);
        const matched = userMinistry?.subAreas.find(sa => stripPrefix(sa.id) === storedBase);
        return matched ? matched.id : storedId; // use canonical or keep as-is
      })
    )];

    setForm({ name: u.name, email: u.email, password: '', role: u.role, ministry_id: u.ministry_id ?? '', sub_areas: normalizedSubAreas });
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!isSuperAdmin && form.role !== 'coordinator') {
      setFormError('Administradores só podem criar coordenadores.');
      return;
    }
    if (form.role !== 'admin' && form.role !== 'super_admin' && !form.ministry_id) {
      setFormError('Selecione o ministério.');
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
          ministry_id: form.ministry_id || null,
          sub_areas: form.role === 'coordinator' ? form.sub_areas : [],
        }),
      }
    );
    const json = await res.json();
    setSaving(false);
    if (!res.ok || json.error) {
      setFormError(json.error || 'Erro ao criar usuário.');
    } else {
      // Cascade: assign coordinator name to volunteers in their sub-areas
      const newName = form.name.trim();
      const ministryId = form.ministry_id;
      if (ministryId && form.role === 'coordinator' && form.sub_areas.length > 0) {
        const ministry = ministries.find(m => m.id === ministryId);
        const prefix = ministryId + '_';
        const stripPfx = (s: string) => { let r = s; while (r.startsWith(prefix)) r = r.slice(prefix.length); return r; };
        const subAreaNames = form.sub_areas
          .map(id => {
            const exact = ministry?.subAreas.find(sa => sa.id === id);
            if (exact) return exact.name;
            const base = stripPfx(id);
            return ministry?.subAreas.find(sa => stripPfx(sa.id) === base)?.name ?? null;
          })
          .filter(Boolean) as string[];
        for (const subAreaName of subAreaNames) {
          await supabase.from('volunteers')
            .update({ coordinator: newName })
            .eq('ministry_id', ministryId)
            .eq('sub_area', subAreaName);
        }
      }
      setModalOpen(false);
      await Promise.all([fetchUsers(), refetchMinistries()]);
      onToast(`${form.role === 'admin' ? 'Admin' : form.role === 'ministry_leader' ? 'Líder' : 'Coordenador'} "${form.name}" criado com sucesso!`);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!form.name.trim()) { setFormError('Nome obrigatório.'); return; }
    setSaving(true);
    setFormError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      'https://fzbxzcwopgwsojxmckpa.supabase.co/functions/v1/create-coordinator',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          editUserId: editTarget.id,
          name: form.name.trim(),
          role: form.role,
          ministry_id: form.ministry_id || null,
          sub_areas: form.sub_areas,
        }),
      }
    );
    const json = await res.json();
    setSaving(false);
    if (!res.ok || json.error) { setFormError(json.error || 'Erro ao atualizar usuário.'); return; }

    // ── Cascade coordinator changes to volunteer records ─────────────────────
    const newName = form.name.trim();
    const ministryId = form.ministry_id || editTarget.ministry_id;
    if (ministryId) {
      const ministry = ministries.find(m => m.id === ministryId);
      const prefix = ministryId + '_';
      const stripPfx = (s: string) => { let r = s; while (r.startsWith(prefix)) r = r.slice(prefix.length); return r; };

      // 1. Rename: update volunteers still carrying the old coordinator name
      if (newName !== editTarget.name && editTarget.name) {
        await supabase.from('volunteers')
          .update({ coordinator: newName })
          .eq('ministry_id', ministryId)
          .eq('coordinator', editTarget.name);
      }

      // 2. Sub-area assignment: for every sub-area this coordinator NOW manages,
      //    set their name on all volunteers in that sub-area so the display is current.
      const newSubAreaNames = form.sub_areas
        .map(id => {
          const exact = ministry?.subAreas.find(sa => sa.id === id);
          if (exact) return exact.name;
          const base = stripPfx(id);
          return ministry?.subAreas.find(sa => stripPfx(sa.id) === base)?.name ?? null;
        })
        .filter(Boolean) as string[];

      for (const subAreaName of newSubAreaNames) {
        await supabase.from('volunteers')
          .update({ coordinator: newName })
          .eq('ministry_id', ministryId)
          .eq('sub_area', subAreaName);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    setModalOpen(false);
    await Promise.all([fetchUsers(), refetchMinistries()]);
    onToast('Usuário atualizado.');
  };

  const canEdit = (target: UserProfile) => {
    if (target.role === 'super_admin' && target.id !== myProfile?.id) return false;
    if (isSuperAdmin) return true;
    return target.role === 'coordinator';
  };

  const canDelete = (target: UserProfile) => {
    if (target.id === myProfile?.id) return false;
    if (target.role === 'super_admin') return false;
    if (isSuperAdmin) return true;
    return target.role === 'coordinator';
  };

  const handleDelete = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target || !canDelete(target)) return;
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    setDeleteId(id);
    await supabase.from('user_profiles').delete().eq('id', id);
    setDeleteId(null);
    await fetchUsers();
    onToast('Usuário removido.');
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetPwd.length < 6) return;
    setResetSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      'https://fzbxzcwopgwsojxmckpa.supabase.co/functions/v1/reset-user-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId: resetTarget.id, password: resetPwd }),
      }
    );
    const json = await res.json();
    setResetSaving(false);
    if (!res.ok || json.error) {
      onToast('Erro ao redefinir senha: ' + (json.error || res.status));
    } else {
      setResetTarget(null);
      setResetPwd('');
      onToast(`Senha de "${resetTarget.name}" redefinida.`);
    }
  };

  const getMinistryName = (id: string | null) => {
    if (!id) return '—';
    return ministries.find(m => m.id === id)?.name ?? id;
  };

  const getSubAreaNames = (ministryId: string | null, subAreaIds: string[]) => {
    if (!ministryId || !subAreaIds?.length) return [];
    const ministry = ministries.find(m => m.id === ministryId);
    if (!ministry) return [];
    const prefix = ministryId + '_';
    const stripPfx = (s: string) => { let r = s; while (r.startsWith(prefix)) r = r.slice(prefix.length); return r; };
    const names = subAreaIds.map(id => {
      // Exact match
      const exact = ministry.subAreas.find(sa => sa.id === id);
      if (exact) return exact.name;
      // Strip repeated ministry prefix to get base slug (handles double/triple-prefix bug)
      const base = stripPfx(id);
      const byBase = ministry.subAreas.find(sa => stripPfx(sa.id) === base);
      if (byBase) return byBase.name;
      // Humanize last segment as final fallback
      return base.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    });
    // Deduplicate: different IDs may resolve to the same sub-area name (double-prefix legacy)
    return [...new Set(names)];
  };

  const roleLabel = (role: string) => role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role === 'ministry_leader' ? 'Líder' : 'Coordenador';

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
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Perfil</th>
                <th className="text-left px-5 py-3">Ministério</th>
                <th className="text-left px-5 py-3">Sub-áreas</th>
                <th className="text-left px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const isTargetSuperAdmin = u.role === 'super_admin';
                return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isTargetSuperAdmin ? 'bg-violet-100' : u.role === 'admin' ? 'bg-indigo-100' : 'bg-purple-100'}`}>
                        {isTargetSuperAdmin
                          ? <ShieldCheck size={14} className="text-violet-600" />
                          : u.role === 'admin'
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
                    {isTargetSuperAdmin
                      ? <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-1 rounded-full"><ShieldCheck size={11} /> Super Admin</span>
                      : u.role === 'admin'
                      ? <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>
                      : u.role === 'ministry_leader'
                      ? <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">Líder</span>
                      : <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Coordenador</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600">{getMinistryName(u.ministry_id)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {(() => {
                      const names = getSubAreaNames(u.ministry_id, u.sub_areas ?? []);
                      if (!names.length) return <span className="text-xs text-gray-300">—</span>;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {names.map(n => (
                            <span key={n} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">{n}</span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit(u) && (
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {isSuperAdmin && u.id !== myProfile?.id && u.role !== 'super_admin' && (
                        <button
                          onClick={() => { setResetTarget(u); setResetPwd(''); setResetPwdShow(false); }}
                          className="p-1.5 text-gray-300 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors"
                          title="Redefinir senha"
                        >
                          <Key size={15} />
                        </button>
                      )}
                      {canDelete(u) && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deleteId === u.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Remover"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">Nenhum usuário cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 text-lg">{editTarget ? `Editar — ${editTarget.name}` : 'Novo Usuário'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {!editTarget && (
                <>
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
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {/* Role selector: only super_admin can change roles, and only for non-super_admin targets */}
              {isSuperAdmin && (!editTarget || editTarget.role !== 'super_admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'coordinator', label: 'Coordenador' },
                      { value: 'ministry_leader', label: 'Líder' },
                      { value: 'admin', label: 'Administrador' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm transition-colors"
                        style={form.role === opt.value ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' } : { borderColor: '#d1d5db', color: '#374151' }}>
                        <input type="radio" name="role" value={opt.value} checked={form.role === opt.value}
                          onChange={e => setForm(p => ({ ...p, role: e.target.value, ministry_id: e.target.value === 'admin' ? '' : p.ministry_id, sub_areas: [] }))}
                          className="hidden" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {form.role !== 'admin' && form.role !== 'super_admin' && (
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
              )}
              {form.role === 'coordinator' && selectedMinistry && selectedMinistry.subAreas.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sub-áreas</label>
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
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={editTarget ? handleEdit : handleCreate}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Salvando...' : editTarget ? 'Salvar alterações' : `Criar ${roleLabel(form.role)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setResetTarget(null); }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 text-lg">Redefinir Senha</h2>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Nova senha para <span className="font-semibold">{resetTarget.name}</span>
              </p>
              <div className="relative">
                <input
                  type={resetPwdShow ? 'text' : 'password'}
                  value={resetPwd}
                  onChange={e => setResetPwd(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button type="button" onClick={() => setResetPwdShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {resetPwdShow ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setResetTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancelar</button>
              <button
                onClick={handleResetPassword}
                disabled={resetPwd.length < 6 || resetSaving}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {resetSaving ? 'Salvando...' : 'Redefinir senha'}
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
// ─── Tab Automações ──────────────────────────────────────────────────────────
function TabAutomacoes({ ministries, onToast }: { ministries: import('../types').Ministry[]; onToast: (m: string) => void }) {
  const [autoSemRetorno, setAutoSemRetorno] = useState(
    () => localStorage.getItem('autoSemRetornoDays') || '0'
  );
  const [goals, setGoals] = useState<Record<string, string>>(() => {
    try {
      const g = JSON.parse(localStorage.getItem('ministryGoals') || '{}');
      return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, String(v)]));
    } catch { return {}; }
  });
  const [capacities, setCapacities] = useState<Record<string, string>>(() => {
    try {
      const c = JSON.parse(localStorage.getItem('subAreaCapacities') || '{}');
      return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v)]));
    } catch { return {}; }
  });

  function saveAuto() {
    localStorage.setItem('autoSemRetornoDays', autoSemRetorno);
    const numGoals: Record<string, number> = {};
    Object.entries(goals).forEach(([k, v]) => { const n = parseInt(v); if (n > 0) numGoals[k] = n; });
    localStorage.setItem('ministryGoals', JSON.stringify(numGoals));
    const numCaps: Record<string, number> = {};
    Object.entries(capacities).forEach(([k, v]) => { const n = parseInt(v); if (n > 0) numCaps[k] = n; });
    localStorage.setItem('subAreaCapacities', JSON.stringify(numCaps));
    onToast('Configurações de automação salvas!');
  }

  return (
    <div className="space-y-6">
      {/* Auto Sem Retorno */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Auto "Sem Retorno"</h3>
        <p className="text-xs text-gray-500 mb-4">Voluntários sem contato há mais que X dias são automaticamente marcados como Sem Retorno ao carregar o sistema. Use 0 para desativar.</p>
        <div className="flex items-center gap-3">
          <input
            type="number" min="0" max="365"
            value={autoSemRetorno}
            onChange={e => setAutoSemRetorno(e.target.value)}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-sm text-gray-500">dias sem contato</span>
          {parseInt(autoSemRetorno) > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Ativo</span>
          )}
        </div>
      </div>

      {/* Ministry goals */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Metas de Estabelecidos</h3>
        <p className="text-xs text-gray-500 mb-4">Defina uma meta de voluntários estabelecidos para cada ministério. Aparece no Dashboard.</p>
        <div className="space-y-3">
          {ministries.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 w-48 truncate">{m.name}</span>
              <input
                type="number" min="0" placeholder="0 = sem meta"
                value={goals[m.id] || ''}
                onChange={e => setGoals(p => ({ ...p, [m.id]: e.target.value }))}
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-xs text-gray-400">voluntários</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-area capacity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Capacidade por Sub-Área</h3>
        <p className="text-xs text-gray-500 mb-4">Limite de voluntários por sub-área. A barra no painel fica vermelha ao atingir o limite. Use 0 para ilimitado.</p>
        <div className="space-y-3">
          {ministries.flatMap(m => m.subAreas.map(sa => (
            <div key={sa.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-28 truncate text-xs">{m.name}</span>
              <span className="text-sm text-gray-700 w-36 truncate">{sa.name}</span>
              <input
                type="number" min="0" placeholder="0 = ilimitado"
                value={capacities[sa.name] || ''}
                onChange={e => setCapacities(p => ({ ...p, [sa.name]: e.target.value }))}
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )))}
        </div>
      </div>

      <button
        onClick={saveAuto}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        Salvar automações
      </button>
    </div>
  );
}

// ─── Tab Acessos ─────────────────────────────────────────────────────────────
interface LoginEntry {
  id: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  logged_in_at: string;
}

function TabAcessos() {
  const [logs, setLogs] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .rpc('get_login_log', { p_limit: 200 })
      .then(({ data, error }) => {
        if (error) console.warn('[login_log read]', error.message);
        if (data) setLogs(data as LoginEntry[]);
        setLoading(false);
      });
  }, []);

  const roleLabel = (role: string | null) => {
    if (!role) return '—';
    return role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role === 'ministry_leader' ? 'Líder' : 'Coordenador';
  };

  const roleBadge = (role: string | null) => {
    if (role === 'super_admin') return 'bg-violet-100 text-violet-700';
    if (role === 'admin') return 'bg-indigo-100 text-indigo-700';
    if (role === 'ministry_leader') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return !q || (l.user_name ?? '').toLowerCase().includes(q) || (l.user_email ?? '').toLowerCase().includes(q);
  });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{logs.length} acesso{logs.length !== 1 ? 's' : ''} registrado{logs.length !== 1 ? 's' : ''}</p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Usuário</th>
                <th className="text-left px-5 py-3">E-mail</th>
                <th className="text-left px-5 py-3">Perfil</th>
                <th className="text-left px-5 py-3">Data e Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-gray-800">{log.user_name || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-500">{log.user_email || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge(log.user_role)}`}>
                      {roleLabel(log.user_role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-gray-600 tabular-nums">{formatDateTime(log.logged_in_at)}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    {search ? 'Nenhum resultado encontrado.' : 'Nenhum acesso registrado ainda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Notificações ─────────────────────────────────────────────────────────
function TabNotificacoes() {
  const { profile } = useAuth();
  const { state, subscribe, unsubscribe } = usePushNotifications(profile?.id);

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            state === 'subscribed' ? 'bg-indigo-100' : 'bg-gray-100'
          }`}>
            {state === 'subscribed'
              ? <BellRing size={22} className="text-indigo-600" />
              : <Bell size={22} className="text-gray-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-0.5">Notificações Push</h3>
            <p className="text-sm text-gray-500 mb-4">
              Receba alertas sobre voluntários aguardando acompanhamento e outros eventos importantes.
            </p>

            {state === 'unsupported' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Seu navegador não suporta notificações push.
              </div>
            )}

            {state === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
                Notificações bloqueadas. Acesse as configurações do navegador para reativar.
              </div>
            )}

            {state === 'loading' && (
              <div className="text-sm text-gray-400">Verificando...</div>
            )}

            {(state === 'subscribed' || state === 'unsubscribed') && (
              <div className="flex items-center gap-3">
                <button
                  onClick={state === 'subscribed' ? unsubscribe : subscribe}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    state === 'subscribed'
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {state === 'subscribed' ? <BellOff size={15} /> : <Bell size={15} />}
                  {state === 'subscribed' ? 'Desativar notificações' : 'Ativar notificações'}
                </button>
                {state === 'subscribed' && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Ativas neste dispositivo
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Quando você será notificado</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <Check size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
            Voluntários aguardando contato há 7+ dias
          </li>
          <li className="flex items-start gap-2">
            <Check size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
            Novos cadastros no seu ministério
          </li>
        </ul>
        <p className="text-xs text-gray-400 mt-3">
          As notificações são enviadas uma vez por dia, apenas se houver itens pendentes.
        </p>
      </div>
    </div>
  );
}

type Tab = 'igreja' | 'link' | 'ministerios' | 'usuarios' | 'aparencia' | 'automacoes' | 'notificacoes' | 'acessos';

const ALL_TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean; superAdminOnly?: boolean }[] = [
  { id: 'igreja', label: 'Igreja', icon: <Church size={16} /> },
  { id: 'link', label: 'Link de Cadastro', icon: <Link2 size={16} /> },
  { id: 'ministerios', label: 'Ministérios', icon: <Users size={16} /> },
  { id: 'usuarios', label: 'Usuários', icon: <UserPlus size={16} />, adminOnly: true },
  { id: 'aparencia', label: 'Aparência', icon: <Palette size={16} /> },
  { id: 'automacoes', label: 'Automações', icon: <Zap size={16} />, adminOnly: true },
  { id: 'notificacoes', label: 'Notificações', icon: <Bell size={16} /> },
  { id: 'acessos', label: 'Acessos', icon: <ShieldCheck size={16} />, superAdminOnly: true },
];

export default function Configuracoes() {
  usePageTitle('Configurações')
  const { profile, isAdmin, isSuperAdmin } = useAuth();
  const { ministries } = useMinistries();
  const [activeTab, setActiveTab] = useState<Tab>('igreja');
  const [toast, setToast] = useState('');

  // Derivar diretamente do profile para garantir consistência
  const effectiveSuperAdmin = isSuperAdmin || profile?.role === 'super_admin';

  const showToast = (msg: string) => setToast(msg);
  const TABS = ALL_TABS.filter(t =>
    (!t.adminOnly || isAdmin) && (!t.superAdminOnly || effectiveSuperAdmin)
  );

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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0
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
        {activeTab === 'automacoes' && isAdmin && <TabAutomacoes ministries={ministries} onToast={showToast} />}
        {activeTab === 'notificacoes' && <TabNotificacoes />}
        {activeTab === 'acessos' && effectiveSuperAdmin && <TabAcessos />}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

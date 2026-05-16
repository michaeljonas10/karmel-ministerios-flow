import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ministries } from '../data/ministries';
import { Settings, Church, Link2, Users, Copy, Check, Plus, X } from 'lucide-react';

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

interface MinistryCoordinators {
  ministry_id: string;
  coordinators: string[];
}

const BASE_URL = 'https://karmel-ministerios-flow.vercel.app';

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
    church_name: 'Igreja Karmel',
    subtitle: 'Lagoinha BH',
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
    { label: 'Nome da Igreja', key: 'church_name', placeholder: 'Igreja Karmel' },
    { label: 'Subtítulo / Slogan', key: 'subtitle', placeholder: 'Lagoinha BH' },
    { label: 'CNPJ', key: 'cnpj', placeholder: '00.000.000/0000-00' },
    { label: 'Telefone', key: 'phone', placeholder: '(31) 9 0000-0000' },
    { label: 'Endereço', key: 'address', placeholder: 'Rua das Flores, 123' },
    { label: 'Cidade', key: 'city', placeholder: 'Belo Horizonte - MG' },
    { label: 'Website', key: 'website', placeholder: 'https://karmel.com.br' },
    { label: 'Email de Contato', key: 'email', placeholder: 'contato@karmel.com.br' },
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

// ─── Tab 3 — Ministérios & Coordenadores ────────────────────────────────────
function TabMinisterios({ onToast }: { onToast: (msg: string) => void }) {
  const [coordsMap, setCoordsMap] = useState<Record<string, string[]>>({});
  const [editingNew, setEditingNew] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Initialize from static data
    const init: Record<string, string[]> = {};
    ministries.forEach(m => { init[m.id] = [...m.coordinators]; });

    supabase.from('ministry_coordinators').select('*').then(({ data }) => {
      if (data) {
        (data as MinistryCoordinators[]).forEach(row => {
          init[row.ministry_id] = row.coordinators;
        });
      }
      setCoordsMap(init);
      setLoaded(true);
    });
  }, []);

  const removeCoord = (ministryId: string, name: string) => {
    setCoordsMap(prev => ({
      ...prev,
      [ministryId]: prev[ministryId].filter(c => c !== name),
    }));
  };

  const addCoord = (ministryId: string) => {
    const name = (editingNew[ministryId] || '').trim();
    if (!name) return;
    setCoordsMap(prev => ({
      ...prev,
      [ministryId]: [...(prev[ministryId] || []), name],
    }));
    setEditingNew(prev => ({ ...prev, [ministryId]: '' }));
  };

  const saveMinistry = async (ministryId: string) => {
    setSaving(ministryId);
    const { error } = await supabase
      .from('ministry_coordinators')
      .upsert({ ministry_id: ministryId, coordinators: coordsMap[ministryId] || [] });
    setSaving(null);
    if (!error) onToast('Coordenadores salvos!');
  };

  if (!loaded) return <div className="p-8 text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      {ministries.map(ministry => (
        <div key={ministry.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: ministry.color }}
            />
            <h3 className="font-semibold text-gray-800">{ministry.name}</h3>
          </div>

          {/* Coordinator chips */}
          <div className="flex flex-wrap gap-2">
            {(coordsMap[ministry.id] || []).map(coord => (
              <span
                key={coord}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
              >
                {coord}
                <button
                  onClick={() => removeCoord(ministry.id, coord)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>

          {/* Add coordinator */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingNew[ministry.id] || ''}
              onChange={e => setEditingNew(prev => ({ ...prev, [ministry.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addCoord(ministry.id)}
              placeholder="Adicionar coordenador..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => addCoord(ministry.id)}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              <Plus size={15} /> Adicionar
            </button>
          </div>

          <button
            onClick={() => saveMinistry(ministry.id)}
            disabled={saving === ministry.id}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
          >
            {saving === ministry.id ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
type Tab = 'igreja' | 'link' | 'ministerios';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'igreja', label: 'Igreja', icon: <Church size={16} /> },
  { id: 'link', label: 'Link de Cadastro', icon: <Link2 size={16} /> },
  { id: 'ministerios', label: 'Ministérios & Coordenadores', icon: <Users size={16} /> },
];

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<Tab>('igreja');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => setToast(msg);

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
            onClick={() => setActiveTab(tab.id)}
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
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

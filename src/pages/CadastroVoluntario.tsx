import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useMinistries } from '../contexts/MinistriesContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { ChevronRight, ChevronLeft, Check, Monitor } from 'lucide-react';
import { PLATFORM_GROUPS } from '../types';

// ─── Phone mask ──────────────────────────────────────────────────────────────
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return value;
}

// ─── Church header (loads from Supabase) ─────────────────────────────────────
interface ChurchInfo { church_name: string; subtitle: string; logo_url: string }

function ChurchHeader() {
  const [info, setInfo] = useState<ChurchInfo>({
    church_name: 'Pulse',
    subtitle: 'Ministérios',
    logo_url: '',
  });

  useEffect(() => {
    supabase.from('church_settings').select('church_name,subtitle,logo_url').eq('id', 'main').single()
      .then(({ data }) => { if (data) setInfo(data as ChurchInfo); });
  }, []);

  return (
    <div className="flex flex-col items-center mb-8">
      {info.logo_url ? (
        <img src={info.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-2xl mb-3 shadow" />
      ) : (
        <img src="/pulse-logo.svg" alt="Pulse" className="w-16 h-16 rounded-2xl mb-3 shadow" />
      )}
      <h1 className="text-white font-bold text-2xl">{info.church_name}</h1>
      <p className="text-indigo-200 text-sm">{info.subtitle}</p>
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────
function StepIndicator({ current, total, onGoTo }: { current: number; total: number; onGoTo?: (step: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => i + 1 < current && onGoTo?.(i + 1)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${i + 1 < current ? 'bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700' :
                i + 1 === current ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 cursor-default' :
                'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {i + 1 < current ? <Check size={14} /> : i + 1}
          </button>
          {i < total - 1 && (
            <div className={`w-8 h-0.5 ${i + 1 < current ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm text-gray-500 font-medium">Passo {current} de {total}</span>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      {/* Animated checkmark */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white animate-check-draw" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro realizado com sucesso!</h2>
      <p className="text-gray-600 text-sm mb-4">
        Nossa equipe de voluntários entrará em contato em breve pelo WhatsApp.
      </p>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-6 py-4">
        <p className="text-indigo-800 font-medium">Obrigado, {name}!</p>
        <p className="text-indigo-600 text-sm mt-1">Que Deus abençoe sua jornada conosco. 🙏</p>
      </div>
    </div>
  );
}

// ─── Field components ─────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const selectCls = `${inputCls} bg-white`;

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormData {
  name: string;
  phone: string;
  birthday: string;
  email: string;
  how_found: string;
  ministry_id: string;
  sub_area: string;       // primária (1ª selecionada)
  sub_areas: string[];    // todas as selecionadas
  attends_church: string;
  has_experience: string;
  participates_gc: string;
  platforms: string[];
  notes: string;
  coordinator?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CadastroVoluntario() {
  usePageTitle('Cadastro de Voluntário')
  const { ministries, refetch: refetchMinistries } = useMinistries();

  // Ensure ministry/sub-area list is fresh when the form loads
  useEffect(() => { refetchMinistries(); }, []);
  const [searchParams] = useSearchParams();
  const preMinistry = searchParams.get('ministerio') || '';
  const preCoordinator = searchParams.get('coordenador') || '';

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    birthday: '',
    email: '',
    how_found: '',
    ministry_id: preMinistry,
    sub_area: '',
    sub_areas: [],
    attends_church: '',
    has_experience: '',
    participates_gc: '',
    platforms: [],
    notes: '',
    coordinator: preCoordinator,
  });

  const togglePlatform = (p: string) =>
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));

  const toggleSubArea = (saName: string) =>
    setForm(prev => {
      const already = prev.sub_areas.includes(saName);
      const next = already
        ? prev.sub_areas.filter(s => s !== saName)
        : [...prev.sub_areas, saName];
      return {
        ...prev,
        sub_areas: next,
        sub_area: next[0] ?? '', // primária = primeira selecionada
      };
    });

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const selectedMinistry = ministries.find(m => m.id === form.ministry_id);

  // Mostrar step de plataformas apenas para o ministério Follow / Comunicação
  const isFollowMinistry = selectedMinistry
    ? /follow|comunicaç|comunicac|mídia|midia/i.test(selectedMinistry.name) ||
      /follow|comunicac|midia/i.test(selectedMinistry.id)
    : false;
  const totalSteps = isFollowMinistry ? 3 : 2;

  // Reset sub_area when ministry changes
  useEffect(() => {
    setForm(prev => ({ ...prev, sub_area: '', sub_areas: [], platforms: [] }));
    // Se mudou para ministério sem step 3 e estava no step 3, volta para step 2
    if (step === 3) setStep(2);
  }, [form.ministry_id]);

  // Step validations
  const step1Valid = !!(form.name.trim() && form.phone.replace(/\D/g, '').length >= 10 && form.birthday && form.email.trim() && form.how_found);
  const step2Valid = form.ministry_id && form.sub_areas.length > 0 && form.attends_church && form.has_experience;
  // Step 3 (platforms) is always optional — can advance with 0 selected

  const submitForm = async () => {
    setSubmitting(true);
    setError('');

    // Duplicate detection by phone (uses SECURITY DEFINER RPC — no direct SELECT needed)
    const cleanPhone = form.phone.replace(/\D/g, '');
    const { data: phoneCheck } = await supabase.rpc('public_check_phone', {
      p_phone_suffix: cleanPhone.slice(-8),
    });
    if (phoneCheck?.exists) {
      setError(`Já existe um cadastro com este número de WhatsApp (${phoneCheck.name}). Entre em contato com a equipe.`);
      setSubmitting(false);
      return;
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const subAreaObj = form.sub_area ? selectedMinistry?.subAreas.find(s => s.name === form.sub_area) : undefined;
    // Only assign coordinator if volunteer has a defined sub-area
    const subAreaCoord = form.sub_area
      ? (subAreaObj?.coordinatorNames?.[0] || subAreaObj?.coordinator || '')
      : '';

    const platformsNote = form.platforms.length > 0
      ? `Plataformas: ${form.platforms.join(', ')}`
      : '';

    const volunteerRow = {
      id,
      name: form.name.trim(),
      phone: form.phone,
      email: form.email || null,
      registered_at: now,
      ministry_id: form.ministry_id,
      sub_area: form.sub_area,
      sub_areas: form.sub_areas,
      coordinator: subAreaCoord,
      current_stage: 'cadastrado',
      birthday: form.birthday || null,
      how_found: form.how_found || null,
      participates_gc: form.participates_gc === 'Sim' ? true : form.participates_gc === 'Não' ? false : null,
      notes: [
        form.notes,
        `Frequenta: ${form.attends_church}`,
        `Experiência: ${form.has_experience}`,
        form.coordinator ? `Coordenador indicado: ${form.coordinator}` : '',
        platformsNote,
      ].filter(Boolean).join('\n'),
      last_contact_date: now,
    };

    const { error: vErr } = await supabase.from('volunteers').insert(volunteerRow);
    if (vErr) {
      setError('Erro ao salvar cadastro. Por favor, tente novamente.');
      setSubmitting(false);
      return;
    }

    await supabase.from('stage_history').insert({
      volunteer_id: id,
      stage: 'cadastrado',
      date: now,
    });

    // Try to store platforms in dedicated column (requires migration to be applied)
    if (form.platforms.length > 0) {
      await supabase.from('volunteers').update({ platforms: form.platforms }).eq('id', id);
      // Silently ignore errors if column doesn't exist yet
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <style>{`
        @keyframes scale-in { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes check-draw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
        .animate-scale-in { animation: scale-in 0.4s ease-out; }
        .animate-check-draw { stroke-dasharray: 30; animation: check-draw 0.4s ease-out 0.3s both; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-700 to-purple-800 flex flex-col px-4 py-8">
        {/* Church header */}
        <ChurchHeader />

        {/* Hero text */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-white mb-2">Quero ser Voluntário!</h2>
          <p className="text-indigo-200 text-sm max-w-sm mx-auto">
            Preencha o formulário abaixo e nossa equipe entrará em contato.
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl">
          <div className="p-6 sm:p-8 pb-4">
            {submitted ? (
              <SuccessScreen name={form.name.split(' ')[0]} />
            ) : (
              <>
                <StepIndicator current={step} total={totalSteps} onGoTo={s => setStep(s)} />

                {/* ── Step 1 ── */}
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Pessoais</h3>

                    <Field label="Nome completo" required>
                      <input
                        type="text"
                        value={form.name}
                        onChange={set('name')}
                        placeholder="Seu nome completo"
                        className={inputCls}
                        autoFocus
                      />
                    </Field>

                    <Field label="WhatsApp" required>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                        placeholder="(31) 9 0000-0000"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Data de Aniversário" required>
                      <input
                        type="date"
                        value={form.birthday}
                        onChange={set('birthday')}
                        className={inputCls}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    </Field>

                    <Field label="Email" required>
                      <input
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="seu@email.com"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Como você chegou até nós?" required>
                      <select value={form.how_found} onChange={set('how_found')} className={selectCls}>
                        <option value="">Selecione...</option>
                        <option value="Integra">Integra</option>
                        <option value="Culto Visão">Culto Visão</option>
                        <option value="App da Igreja">App da Igreja</option>
                        <option value="Indicação de Membro">Indicação de Membro</option>
                        <option value="Já sou voluntário">Já sou voluntário</option>
                      </select>
                    </Field>
                  </div>
                )}

                {/* ── Step 2 ── */}
                {step === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Área de Interesse</h3>

                    <Field label="Ministério de interesse" required>
                      <select value={form.ministry_id} onChange={set('ministry_id')} className={selectCls}>
                        <option value="">Selecione um ministério...</option>
                        {ministries.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Sub-área(s) de interesse" required>
                      {!form.ministry_id ? (
                        <p className="text-sm text-gray-400 italic">Selecione um ministério primeiro.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {selectedMinistry?.subAreas.map(sa => {
                              const selected = form.sub_areas.includes(sa.name);
                              return (
                                <button
                                  key={sa.id}
                                  type="button"
                                  onClick={() => toggleSubArea(sa.name)}
                                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all select-none
                                    ${selected
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                      : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
                                    }`}
                                >
                                  {selected && <span className="mr-1">✓</span>}
                                  {sa.name}
                                </button>
                              );
                            })}
                          </div>
                          {form.sub_areas.length > 1 && (
                            <p className="text-xs text-indigo-600 mt-1.5">
                              Primária: <strong>{form.sub_area}</strong> · Também: {form.sub_areas.slice(1).join(', ')}
                            </p>
                          )}
                        </>
                      )}
                    </Field>

                    <Field label="Já frequenta a Igreja?" required>
                      <div className="flex gap-3">
                        {['Sim', 'Não', 'Às vezes'].map(opt => (
                          <label key={opt} className="flex-1 flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="attends_church"
                              value={opt}
                              checked={form.attends_church === opt}
                              onChange={set('attends_church')}
                              className="accent-indigo-600"
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </Field>

                    <Field label="Participa de GC (Grupo de Células)?">
                      <div className="flex gap-3">
                        {['Sim', 'Não'].map(opt => (
                          <label key={opt} className="flex-1 flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="participates_gc"
                              value={opt}
                              checked={form.participates_gc === opt}
                              onChange={set('participates_gc')}
                              className="accent-indigo-600"
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </Field>

                    <Field label="Tem experiência na área?" required>
                      <div className="flex gap-3">
                        {['Sim', 'Não'].map(opt => (
                          <label key={opt} className="flex-1 flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="has_experience"
                              value={opt}
                              checked={form.has_experience === opt}
                              onChange={set('has_experience')}
                              className="accent-indigo-600"
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </Field>

                    <Field label="Observações / Motivação">
                      <textarea
                        value={form.notes}
                        onChange={set('notes')}
                        rows={3}
                        placeholder="Conte-nos um pouco sobre você ou por que deseja ser voluntário... (opcional)"
                        className={`${inputCls} resize-none`}
                      />
                    </Field>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3 ── */}
                {step === 3 && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Monitor size={20} className="text-indigo-600" />
                        Conhecimentos Técnicos
                      </h3>
                      <p className="text-sm text-gray-500">
                        Marque as ferramentas e plataformas que você domina (opcional).
                      </p>
                    </div>

                    {PLATFORM_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {group.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map(item => {
                            const selected = form.platforms.includes(item);
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => togglePlatform(item)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all select-none
                                  ${selected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
                                  }`}
                              >
                                {selected && <span className="mr-1">✓</span>}
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {form.platforms.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 text-sm text-indigo-700">
                        <span className="font-medium">{form.platforms.length} selecionado{form.platforms.length !== 1 ? 's' : ''}:</span>{' '}
                        {form.platforms.join(', ')}
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Sticky nav footer ── */}
          {!submitted && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-b-2xl px-6 py-4">
              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {step1Valid ? (
                    <>Continuar <ChevronRight size={16} /></>
                  ) : (
                    'Preencha nome e WhatsApp para continuar'
                  )}
                </button>
              )}
              {step === 2 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 px-4 py-3.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    <ChevronLeft size={16} /> Voltar
                  </button>
                  {isFollowMinistry ? (
                    <button
                      onClick={() => setStep(3)}
                      disabled={!step2Valid}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Continuar <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={submitForm}
                      disabled={!step2Valid || submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {submitting ? 'Enviando...' : <>Confirmar Cadastro <Check size={16} /></>}
                    </button>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 px-4 py-3.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    <ChevronLeft size={16} /> Voltar
                  </button>
                  <button
                    onClick={submitForm}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    {submitting ? 'Enviando...' : <>Confirmar Cadastro <Check size={16} /></>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-indigo-300 text-xs mt-8">
          Lagoinha Osasco — Pulse Ministérios
        </p>
      </div>
    </>
  );
}

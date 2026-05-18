import { useState, useRef } from 'react'
import {
  HelpCircle, ChevronDown, ChevronUp, Plus, X,
  Paperclip, Send, CheckCircle, Clock, AlertCircle, Loader
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string
  title: string
  description: string
  screenshot_url: string | null
  status: 'open' | 'in_progress' | 'resolved'
  admin_notes: string | null
  created_at: string
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Como cadastrar um novo voluntário?',
    a: 'No Dashboard, clique em "Adicionar Voluntário" ou compartilhe o link público /cadastro com o voluntário para que ele preencha o próprio formulário.',
  },
  {
    q: 'Como avançar a etapa de um voluntário?',
    a: 'Abra o perfil do voluntário (clique no nome em qualquer listagem) e use o botão "Avançar Etapa". Também é possível avançar diretamente na Central de Follow-up.',
  },
  {
    q: 'O que é a Central de Follow-up?',
    a: 'É a tela que lista voluntários que não receberam contato há 7 dias ou mais. Use o botão WhatsApp para abrir a conversa e marcar automaticamente o contato como realizado.',
  },
  {
    q: 'Como alterar o número de WhatsApp de um voluntário?',
    a: 'Abra o perfil do voluntário, passe o mouse sobre o campo Telefone e clique no ícone de lápis que aparece. Edite e pressione Enter ou clique em Salvar.',
  },
  {
    q: 'Como importar voluntários em massa?',
    a: 'No Dashboard, clique em "Importar CSV". Baixe o modelo, preencha com os dados e faça upload. Os voluntários são criados na etapa "Cadastrado".',
  },
  {
    q: 'Como criar um coordenador ou líder de ministério?',
    a: 'Em Configurações → Usuários, clique em "Novo Usuário". Escolha a função (Coordenador ou Líder de Ministério), selecione o ministério e, para coordenadores, as sub-áreas responsáveis.',
  },
  {
    q: 'O relatório de métricas inclui todos os voluntários?',
    a: 'Depende do seu perfil: Admin vê todos os ministérios, Líder vê apenas o seu, Coordenador vê apenas suas sub-áreas. Use o filtro de período para recortes temporais.',
  },
  {
    q: 'Como exportar o relatório em PDF?',
    a: 'Na página Métricas, selecione o período desejado e clique em "Exportar PDF" no canto superior direito. O arquivo é gerado com todos os gráficos e a tabela por ministério.',
  },
  {
    q: 'Como alterar o tema de cores do sistema?',
    a: 'Em Configurações → Aparência, escolha um dos temas disponíveis. A preferência é salva individualmente para cada usuário.',
  },
  {
    q: 'Esqueci minha senha, o que fazer?',
    a: 'Na tela de login, clique em "Esqueci minha senha". Informe seu e-mail e você receberá um link de redefinição em até 5 minutos (verifique também o spam).',
  },
]

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Ticket['status'] }) {
  const map = {
    open:        { label: 'Aberto',      cls: 'bg-blue-100 text-blue-700',   icon: <Clock size={11} /> },
    in_progress: { label: 'Em análise',  cls: 'bg-amber-100 text-amber-700', icon: <AlertCircle size={11} /> },
    resolved:    { label: 'Resolvido',   cls: 'bg-green-100 text-green-700', icon: <CheckCircle size={11} /> },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  )
}

// ─── New ticket modal ─────────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Ticket) => void }) {
  const { user, profile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) { setError('Imagem muito grande (máx. 5 MB)'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  const submit = async () => {
    if (!title.trim() || !description.trim()) { setError('Preencha o título e a descrição.'); return }
    if (!user) return
    setSubmitting(true); setError('')

    let screenshotUrl: string | null = null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('ticket-screenshots').upload(path, file)
      if (upErr) { setError('Erro ao enviar imagem. Tente novamente.'); setSubmitting(false); return }
      const { data: urlData } = supabase.storage.from('ticket-screenshots').getPublicUrl(path)
      screenshotUrl = urlData.publicUrl
    }

    const { data, error: insertErr } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      user_name: profile?.name || profile?.email,
      user_email: profile?.email,
      title: title.trim(),
      description: description.trim(),
      screenshot_url: screenshotUrl,
      status: 'open',
    }).select().single()

    setSubmitting(false)
    if (insertErr || !data) { setError('Erro ao enviar ticket. Tente novamente.'); return }
    onCreated(data as Ticket)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Send size={18} className="text-indigo-500" /> Abrir Ticket de Suporte
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Descreva brevemente o problema"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-red-500">*</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="Descreva o problema em detalhes: o que aconteceu, o que estava tentando fazer, qual erro apareceu..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Print da tela (opcional)</label>
            {preview ? (
              <div className="relative group">
                <img src={preview} alt="Preview" className="w-full rounded-xl border border-gray-200 max-h-48 object-cover" />
                <button
                  onClick={() => { setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <Paperclip size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Arraste uma imagem ou <span className="text-indigo-600 font-medium">clique para selecionar</span></p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP · máx. 5 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim() || !description.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {submitting ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? 'Enviando...' : 'Enviar Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Ajuda() {
  usePageTitle('Ajuda & Suporte')
  const { user, profile } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoaded, setTicketsLoaded] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const loadTickets = async () => {
    if (ticketsLoaded || !user) return
    setLoadingTickets(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTickets((data as Ticket[]) ?? [])
    setLoadingTickets(false)
    setTicketsLoaded(true)
  }

  const handleCreated = (t: Ticket) => {
    setShowModal(false)
    setTickets(prev => [t, ...prev])
    setTicketsLoaded(true)
    setSuccessMsg('Ticket enviado com sucesso! Nossa equipe entrará em contato em breve.')
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle size={24} style={{ color: 'var(--accent)' }} />
            Ajuda & Suporte
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tire suas dúvidas ou abra um ticket para a equipe técnica</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Plus size={16} /> Abrir Ticket
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">{successMsg}</p>
        </div>
      )}

      {/* FAQ */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Perguntas Frequentes</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="text-sm font-medium text-gray-800 pr-4">{item.q}</span>
                {openFaq === i ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* My tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Meus Tickets</h2>
          {!ticketsLoaded && (
            <button
              onClick={loadTickets}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {loadingTickets ? 'Carregando...' : 'Ver meus tickets'}
            </button>
          )}
        </div>

        {ticketsLoaded && tickets.length === 0 && (
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <HelpCircle size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Você ainda não abriu nenhum ticket.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Abrir meu primeiro ticket
            </button>
          </div>
        )}

        {ticketsLoaded && tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(t.created_at)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{t.description}</p>
                {t.screenshot_url && (
                  <a href={t.screenshot_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                    <img src={t.screenshot_url} alt="Screenshot" className="rounded-lg border border-gray-200 max-h-24 object-cover" />
                  </a>
                )}
                {t.admin_notes && (
                  <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Resposta da equipe:</p>
                    <p className="text-sm text-indigo-800">{t.admin_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-1">Precisa de mais ajuda?</h3>
        <p className="text-sm text-gray-600">
          Abra um ticket acima ou entre em contato com o administrador do sistema.
          Respondemos em até 24 horas úteis.
        </p>
        {profile?.role !== 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Send size={14} /> Enviar mensagem
          </button>
        )}
      </div>

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  )
}

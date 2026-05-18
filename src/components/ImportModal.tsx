import { useState, useRef, useCallback } from 'react'
import { X, Upload, FileText, AlertTriangle, Check, Loader2, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useMinistries } from '../hooks/useMinistries'

interface ParsedRow {
  name: string
  phone: string
  email: string
  ministry_id: string
  sub_area: string
  notes: string
  _valid: boolean
  _error?: string
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].split(',').map(h => h.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_'))

  const col = (row: string[], names: string[]) => {
    for (const n of names) {
      const idx = header.indexOf(n)
      if (idx !== -1) return (row[idx] ?? '').trim()
    }
    return ''
  }

  return lines.slice(1).map(line => {
    const row = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
    const name = col(row, ['nome', 'name', 'nome_completo'])
    const phone = col(row, ['whatsapp', 'telefone', 'phone', 'celular', 'fone'])
    const email = col(row, ['email', 'e-mail', 'e_mail'])
    const ministry_id = col(row, ['ministerio', 'ministry', 'ministry_id', 'ministerio_id'])
    const sub_area = col(row, ['subarea', 'sub_area', 'area', 'funcao', 'funcao'])
    const notes = col(row, ['observacoes', 'notas', 'notes', 'obs'])

    const valid = Boolean(name && phone)
    return {
      name, phone, email, ministry_id, sub_area, notes,
      _valid: valid,
      _error: !name ? 'Nome obrigatório' : !phone ? 'Telefone obrigatório' : undefined,
    }
  }).filter(r => r.name || r.phone)
}

const CSV_TEMPLATE = `nome,whatsapp,email,ministerio,subarea,observacoes
João da Silva,(11) 99999-1234,joao@email.com,louvor,guitarra,Tem experiência
Maria Santos,(11) 98888-5678,,conexoes,recepcao,
`

interface Props {
  onClose: () => void
  onImported: () => void
}

export default function ImportModal({ onClose, onImported }: Props) {
  const { ministries } = useMinistries()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState(0)

  const processFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      processFile(file)
    }
  }, [])

  const validRows = rows.filter(r => r._valid)
  const invalidRows = rows.filter(r => !r._valid)

  const resolveMinistryId = (raw: string): string => {
    if (!raw) return ''
    const lower = raw.toLowerCase()
    const found = ministries.find(m =>
      m.id === raw ||
      m.name.toLowerCase().includes(lower) ||
      lower.includes(m.name.toLowerCase())
    )
    return found?.id ?? raw
  }

  const handleImport = async () => {
    setImporting(true)
    const now = new Date().toISOString()
    let ok = 0
    let fail = 0

    for (const row of validRows) {
      const id = 'v' + Date.now() + Math.random().toString(36).slice(2, 6)
      const ministryId = resolveMinistryId(row.ministry_id)
      const { error } = await supabase.from('volunteers').insert({
        id,
        name: row.name,
        phone: row.phone,
        email: row.email || null,
        ministry_id: ministryId || null,
        sub_area: row.sub_area || '',
        coordinator: '',
        current_stage: 'cadastrado',
        notes: row.notes || null,
        registered_at: now,
        last_contact_date: now,
      })
      if (!error) {
        await supabase.from('stage_history').insert({ volunteer_id: id, stage: 'cadastrado', date: now })
        ok++
      } else {
        fail++
      }
    }

    setImported(ok)
    setErrors(fail)
    setImporting(false)
    setStep('done')
    onImported()
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_importacao.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Upload size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Importar Contatos</h2>
              <p className="text-xs text-gray-400">CSV ou planilha exportada</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragging ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText size={24} className="text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Arraste um arquivo CSV ou clique para selecionar</p>
                  <p className="text-xs text-gray-400 mt-1">Arquivos .csv — máx. 5MB</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
              </div>

              {/* Column guide */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Colunas reconhecidas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { col: 'nome *', desc: 'Nome completo' },
                    { col: 'whatsapp *', desc: 'Telefone/celular' },
                    { col: 'email', desc: 'E-mail (opcional)' },
                    { col: 'ministerio', desc: 'ID ou nome do ministério' },
                    { col: 'subarea', desc: 'Sub-área / função' },
                    { col: 'observacoes', desc: 'Notas (opcional)' },
                  ].map(({ col, desc }) => (
                    <div key={col} className="text-xs">
                      <code className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 font-mono">{col}</code>
                      <span className="text-gray-400 ml-1">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                <Download size={15} /> Baixar modelo de planilha
              </button>
            </div>
          )}

          {/* STEP: preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Arquivo: <span className="font-semibold">{fileName}</span>
                </p>
                <button
                  onClick={() => { setStep('upload'); setRows([]) }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-2xl font-bold text-green-600">{validRows.length}</p>
                  <p className="text-xs text-green-700 font-medium">prontos para importar</p>
                </div>
                <div className={`border rounded-xl px-4 py-3 ${invalidRows.length ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-2xl font-bold ${invalidRows.length ? 'text-red-500' : 'text-gray-400'}`}>{invalidRows.length}</p>
                  <p className={`text-xs font-medium ${invalidRows.length ? 'text-red-600' : 'text-gray-400'}`}>com erro (serão ignorados)</p>
                </div>
              </div>

              {/* Preview table */}
              {validRows.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Pré-visualização ({Math.min(validRows.length, 5)} de {validRows.length})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Nome</th>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Telefone</th>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Ministério</th>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Sub-área</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2 font-medium text-gray-800">{r.name}</td>
                            <td className="px-4 py-2 text-gray-600 font-mono">{r.phone}</td>
                            <td className="px-4 py-2 text-gray-500">{r.ministry_id || '—'}</td>
                            <td className="px-4 py-2 text-gray-500">{r.sub_area || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invalid rows */}
              {invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-xs font-semibold text-red-700">Linhas com erro (não serão importadas)</p>
                  </div>
                  <ul className="space-y-1">
                    {invalidRows.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-xs text-red-600">
                        {r.name || r.phone || '(linha vazia)'} — {r._error}
                      </li>
                    ))}
                    {invalidRows.length > 3 && (
                      <li className="text-xs text-red-400">...e mais {invalidRows.length - 3}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check size={36} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Importação concluída!</h3>
                <p className="text-gray-500 text-sm mt-1">
                  <span className="font-semibold text-green-600">{imported}</span> voluntários importados com sucesso.
                  {errors > 0 && <> · <span className="font-semibold text-red-500">{errors}</span> com erro.</>}
                </p>
              </div>
              <p className="text-xs text-gray-400">Todos foram cadastrados no estágio "Cadastrado".</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {step === 'done' ? (
            <button
              onClick={onClose}
              className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {importing ? (
                    <><Loader2 size={15} className="animate-spin" /> Importando...</>
                  ) : (
                    <>Importar {validRows.length} contatos</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

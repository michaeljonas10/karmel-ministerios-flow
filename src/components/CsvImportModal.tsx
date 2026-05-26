import { useState, useRef, useCallback } from 'react'
import {
  X, Upload, FileText, CheckCircle, AlertTriangle,
  ChevronRight, ChevronLeft, Download, Loader2, Info,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useMinistries } from '../contexts/MinistriesContext'
import { STAGE_LABELS, HOW_FOUND_OPTIONS } from '../types'
import type { JourneyStage } from '../types'
import { useAuth } from '../contexts/AuthContext'

// ─── Normalisation helpers ────────────────────────────────────────────────────

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
function slug(s: string) {
  return stripAccents(s.trim().toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Extract 10-11 digit BR phone from any string format */
function normalizePhone(raw: string): { value: string; changed: boolean; error?: string } {
  const original = raw.trim()
  if (!original) return { value: '', changed: false, error: 'Telefone vazio' }
  let digits = original.replace(/\D/g, '')
  // Remove country code +55 or 0055
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length > 11) digits = digits.slice(1)
  if (digits.length === 11) {
    const fmt = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    return { value: fmt, changed: fmt !== original }
  }
  if (digits.length === 10) {
    const fmt = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return { value: fmt, changed: fmt !== original }
  }
  return { value: original, changed: false, error: `Telefone inválido (${digits.length} dígitos)` }
}

/** Parse date from DD/MM/YYYY, YYYY-MM-DD, D/M/YY, etc → YYYY-MM-DD */
function normalizeDate(raw: string): { value: string; changed: boolean } {
  const s = raw.trim()
  if (!s) return { value: '', changed: false }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { value: s, changed: false }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? (parseInt(y) > 30 ? '19' + y : '20' + y) : y
    const val = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return { value: val, changed: val !== s }
  }
  return { value: s, changed: false }
}

/** Normalize boolean: sim/não/yes/no/1/0 */
function normalizeBool(raw: string): { value: boolean | null; label: string } {
  const v = slug(raw)
  if (['sim', 'yes', '1', 'true', 's', 'y', 'x', 'participa'].includes(v)) return { value: true, label: 'Sim' }
  if (['nao', 'no', '0', 'false', 'n', 'nao participa'].includes(v)) return { value: false, label: 'Não' }
  return { value: null, label: '' }
}

/** Fuzzy match stage name to JourneyStage */
const STAGE_ALIASES: Record<string, JourneyStage> = {
  'cadastrado': 'cadastrado', 'cadastro': 'cadastrado',
  'grupo de acolhimento': 'grupo_acolhimento', 'acolhimento': 'grupo_acolhimento', 'grupo acolhimento': 'grupo_acolhimento',
  'pesquisa de area': 'pesquisa_area', 'pesquisa area': 'pesquisa_area', 'pesquisa': 'pesquisa_area',
  'direcionado para area': 'direcionado_area', 'direcionado area': 'direcionado_area', 'direcionado': 'direcionado_area',
  'contato ao coordenador': 'contato_coordenador', 'contato coordenador': 'contato_coordenador',
  'coordenador contatou': 'coordenador_contatou',
  'grupo da area': 'grupo_area', 'grupo area': 'grupo_area',
  'treinamento': 'treinamento',
  'primeira escala': 'primeira_escala', 'escala': 'primeira_escala',
  'estabelecido': 'estabelecido', 'ativo': 'estabelecido',
  'mudou de ministerio': 'mudou_area', 'mudou area': 'mudou_area', 'mudou ministerio': 'mudou_area',
  'sem retorno': 'nao_retornou', 'nao retornou': 'nao_retornou', 'inativo': 'nao_retornou',
}
function normalizeStage(raw: string): JourneyStage {
  const k = slug(raw)
  return STAGE_ALIASES[k] ?? 'cadastrado'
}

/** Fuzzy match how_found to platform options */
function normalizeHowFound(raw: string): string {
  const k = slug(raw)
  for (const opt of HOW_FOUND_OPTIONS) {
    if (slug(opt) === k || slug(opt).includes(k) || k.includes(slug(opt))) return opt
  }
  return raw.trim() // keep original if no match
}

// ─── Column mapping ────────────────────────────────────────────────────────────

type FieldKey = 'name' | 'phone' | 'email' | 'birthday' | 'participates_gc' |
  'how_found' | 'notes' | 'current_stage' | 'sub_area' | 'coordinator' | 'ministry'

const FIELD_META: Record<FieldKey, { label: string; required?: boolean; aliases: string[] }> = {
  name:           { label: 'Nome',              required: true,  aliases: ['nome', 'name', 'nome completo', 'full name', 'voluntario', 'voluntaria'] },
  phone:          { label: 'Telefone/WhatsApp', required: true,  aliases: ['telefone', 'phone', 'whatsapp', 'celular', 'tel', 'numero', 'fone', 'contato'] },
  email:          { label: 'E-mail',            aliases: ['email', 'e mail', 'e-mail', 'correio'] },
  birthday:       { label: 'Aniversário',       aliases: ['aniversario', 'nascimento', 'data nascimento', 'data de nascimento', 'birthday', 'dt nasc'] },
  participates_gc:{ label: 'Participa de GC',   aliases: ['gc', 'grupo celular', 'participa gc', 'grupo', 'celula', 'participa de gc', 'celula familiar'] },
  how_found:      { label: 'Como chegou até nós', aliases: ['como chegou', 'origem', 'indicacao', 'indicacao de membro', 'how found', 'fonte', 'como nos encontrou', 'como conheceu'] },
  notes:          { label: 'Observações',       aliases: ['observacoes', 'obs', 'notes', 'notas', 'anotacoes', 'comentarios', 'observacao'] },
  current_stage:  { label: 'Etapa',             aliases: ['etapa', 'stage', 'fase', 'status', 'jornada', 'etapa atual', 'situacao'] },
  sub_area:       { label: 'Sub-área',          aliases: ['sub area', 'subarea', 'sub-area', 'area', 'setor', 'equipe', 'departamento'] },
  coordinator:    { label: 'Coordenador',       aliases: ['coordenador', 'coordinator', 'responsavel', 'lider'] },
  ministry:       { label: 'Ministério',        aliases: ['ministerio', 'ministry', 'ministerio area', 'grupo ministerial'] },
}

function autoDetectMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapping: Partial<Record<FieldKey, string>> = {}
  const usedHeaders = new Set<string>()
  for (const [field, meta] of Object.entries(FIELD_META) as [FieldKey, typeof FIELD_META[FieldKey]][]) {
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      const hSlug = slug(header)
      if (meta.aliases.some(a => a === hSlug || hSlug.includes(a) || a.includes(hSlug))) {
        mapping[field] = header
        usedHeaders.add(header)
        break
      }
    }
  }
  return mapping
}

// ─── CSV parser (handles quoted fields) ───────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Detect delimiter
  const firstLine = text.split('\n')[0]
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','

  const lines = text.trim().split(/\r?\n/)
  const headers = parseRow(lines[0], delimiter)
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => {
      const vals = parseRow(l, delimiter)
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]))
    })
  return { headers, rows }
}

function parseRow(line: string, delim: string): string[] {
  const result: string[] = []
  let field = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { field += '"'; i++ }
      else inQuote = !inQuote
    } else if (c === delim && !inQuote) {
      result.push(field); field = ''
    } else {
      field += c
    }
  }
  result.push(field)
  return result
}

// ─── Processed row ────────────────────────────────────────────────────────────

interface ProcessedRow {
  raw: Record<string, string>
  name: string
  phone: string; phoneChanged: boolean; phoneError?: string
  email: string
  birthday: string; birthdayChanged: boolean
  participates_gc: boolean | null; gcLabel: string
  how_found: string
  notes: string
  current_stage: JourneyStage; stageChanged: boolean
  sub_area: string
  coordinator: string
  ministry: string
  issues: string[]
  skip: boolean
  isDuplicate?: boolean
}

function processRow(
  raw: Record<string, string>,
  mapping: Partial<Record<FieldKey, string>>,
): ProcessedRow {
  const get = (f: FieldKey) => (mapping[f] ? (raw[mapping[f]!] ?? '') : '').trim()

  const rawPhone = get('phone')
  const phoneResult = normalizePhone(rawPhone)

  const rawBirthday = get('birthday')
  const birthdayResult = normalizeDate(rawBirthday)

  const rawGc = get('participates_gc')
  const gcResult = normalizeBool(rawGc)

  const rawStage = get('current_stage')
  const stage = rawStage ? normalizeStage(rawStage) : 'cadastrado'
  const stageChanged = rawStage !== '' && normalizeStage(rawStage) !== (rawStage as JourneyStage)

  const issues: string[] = []
  const name = get('name')
  if (!name) issues.push('Nome obrigatório')
  if (phoneResult.error) issues.push(phoneResult.error)

  return {
    raw,
    name,
    phone: phoneResult.value, phoneChanged: phoneResult.changed, phoneError: phoneResult.error,
    email: get('email'),
    birthday: birthdayResult.value, birthdayChanged: birthdayResult.changed,
    participates_gc: gcResult.value, gcLabel: gcResult.label,
    how_found: get('how_found') ? normalizeHowFound(get('how_found')) : '',
    notes: get('notes'),
    current_stage: stage, stageChanged,
    sub_area: get('sub_area'),
    coordinator: get('coordinator'),
    ministry: get('ministry'),
    issues,
    skip: false,
  }
}

// ─── Template CSV download ────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = ['Nome', 'Telefone', 'Email', 'Aniversário (DD/MM/AAAA)', 'Participa de GC (Sim/Não)',
    'Como chegou até nós', 'Observações', 'Etapa', 'Sub-área', 'Coordenador']
  const example = ['Maria Silva', '(11) 99999-8888', 'maria@email.com', '15/03/1995', 'Sim',
    'Indicação de Membro', 'Chegou pelo culto de visão', 'Cadastrado', 'Som', 'Gabriel']
  const csv = [headers, example].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'modelo-importacao.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  defaultMinistryId?: string // if set, skip ministry selection
  onImported?: (count: number) => void
}

type Step = 'upload' | 'map' | 'preview' | 'done'

export default function CsvImportModal({ onClose, defaultMinistryId, onImported }: Props) {
  const { profile, isAdmin } = useAuth()
  const { ministries } = useMinistries()

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({})
  const [rows, setRows] = useState<ProcessedRow[]>([])
  const [selectedMinistry, setSelectedMinistry] = useState(defaultMinistryId ?? '')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── File parsing ──
  const handleFile = useCallback((f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCsv(text)
      setHeaders(h)
      setRawRows(r)
      const detected = autoDetectMapping(h)
      setMapping(detected)
      setStep('map')
    }
    reader.readAsText(f, 'UTF-8')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
  }, [handleFile])

  // ── Duplicate check ──
  const checkDuplicates = async (processed: ProcessedRow[]) => {
    const phones = processed.map(r => r.phone.replace(/\D/g, '').slice(-8)).filter(Boolean)
    if (phones.length === 0) return processed
    const { data } = await supabase
      .from('volunteers')
      .select('phone')
      .filter('archived_at', 'is', null)
    const existingPhones = new Set((data ?? []).map((v: { phone: string }) => v.phone.replace(/\D/g, '').slice(-8)))
    return processed.map(r => ({
      ...r,
      isDuplicate: existingPhones.has(r.phone.replace(/\D/g, '').slice(-8)) && r.phone !== '',
    }))
  }

  const goToPreview = async () => {
    const processed = rawRows.map(r => processRow(r, mapping))
    const withDups = await checkDuplicates(processed)
    setRows(withDups)
    setStep('preview')
  }

  const toggleSkip = (i: number) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, skip: !r.skip } : r))

  // ── Import ──
  const runImport = async () => {
    if (!selectedMinistry) return
    setImporting(true)
    const toImport = rows.filter(r => !r.skip && !r.isDuplicate && r.name && !r.phoneError)
    let ok = 0
    const errors: string[] = []
    const now = new Date().toISOString()
    const batchSize = 50

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize)
      const volunteers = batch.map(r => ({
        id: crypto.randomUUID(),
        name: r.name,
        phone: r.phone,
        email: r.email || null,
        birthday: r.birthday || null,
        participates_gc: r.participates_gc,
        how_found: r.how_found || null,
        notes: r.notes || null,
        current_stage: r.current_stage,
        sub_area: r.sub_area || '',
        coordinator: r.coordinator || '',
        ministry_id: selectedMinistry,
        registered_at: now,
        last_contact_date: now,
        contact_attempts: 0,
      }))
      const { error } = await supabase.from('volunteers').insert(volunteers)
      if (error) {
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        // Insert stage history
        const history = volunteers.map(v => ({
          volunteer_id: v.id,
          stage: v.current_stage,
          date: now,
          changed_by: profile?.name ?? 'Importação CSV',
          note: 'Importado via CSV',
        }))
        await supabase.from('stage_history').insert(history)
        ok += batch.length
      }
    }

    setImportResult({ ok, skipped: rows.filter(r => r.skip || r.isDuplicate || !r.name || !!r.phoneError).length, errors })
    setImporting(false)
    setStep('done')
    onImported?.(ok)
  }

  const validRows = rows.filter(r => !r.skip && !r.isDuplicate && r.name && !r.phoneError)
  const issueRows = rows.filter(r => r.issues.length > 0 || r.isDuplicate)
  const skippedRows = rows.filter(r => r.skip)

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Importar Voluntários via CSV</h2>
            <div className="flex gap-2 mt-1.5">
              {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-indigo-600' : ['upload','map','preview','done'].indexOf(step) > i ? 'bg-green-400' : 'bg-gray-200'}`} />
                  {i < 3 && <div className="w-4 h-px bg-gray-200" />}
                </div>
              ))}
              <span className="text-xs text-gray-400 ml-1">
                {step === 'upload' ? '1. Arquivo' : step === 'map' ? '2. Colunas' : step === 'preview' ? '3. Revisão' : '4. Resultado'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Download size={13} /> Modelo CSV
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div className="p-6 space-y-4">
              {/* Ministry selector (admin only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ministério de destino *</label>
                  <select value={selectedMinistry} onChange={e => setSelectedMinistry(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="">Selecione um ministério...</option>
                    {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}>
                <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-indigo-500' : 'text-gray-300'}`} />
                <p className="text-sm font-medium text-gray-700">Arraste um arquivo CSV ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">Separador vírgula ou ponto-e-vírgula · UTF-8 recomendado</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Campos suportados</p>
                  <p>Nome, Telefone, E-mail, Aniversário, GC, Como chegou até nós, Observações, Etapa, Sub-área, Coordenador</p>
                  <p>Os cabeçalhos são detectados automaticamente — baixe o modelo para ver o formato esperado.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Column mapping ── */}
          {step === 'map' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{file?.name}</p>
                  <p className="text-xs text-gray-500">{rawRows.length} linhas detectadas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(FIELD_META) as [FieldKey, typeof FIELD_META[FieldKey]][]).map(([field, meta]) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      {meta.label} {meta.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                      <option value="">— não importar —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    {mapping[field] && rawRows[0]?.[mapping[field]!] && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">Ex: {rawRows[0][mapping[field]!]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Prévia (primeiras 3 linhas)</p>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map(h => (
                          <th key={h} className={`px-3 py-2 text-left font-medium whitespace-nowrap ${Object.values(mapping).includes(h) ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {h}
                            {Object.values(mapping).includes(h) && (
                              <span className="ml-1 text-indigo-400">
                                ({Object.keys(mapping).find(k => mapping[k as FieldKey] === h) && FIELD_META[Object.keys(mapping).find(k => mapping[k as FieldKey] === h) as FieldKey]?.label})
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rawRows.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {headers.map(h => (
                            <td key={h} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-32 truncate">
                              {row[h] || <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview & normalisation ── */}
          {step === 'preview' && (
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                  <p className="text-xs text-green-600">Prontos para importar</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{issueRows.length}</p>
                  <p className="text-xs text-orange-500">Com avisos</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{skippedRows.length}</p>
                  <p className="text-xs text-gray-400">Ignorados</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Valor normalizado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Aviso</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Duplicado</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-gray-400 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left w-8">
                        <input type="checkbox" className="rounded"
                          onChange={e => setRows(prev => prev.map(r => ({ ...r, skip: e.target.checked })))}
                          title="Marcar todos para ignorar" />
                      </th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Telefone</th>
                      <th className="px-3 py-2 text-left">E-mail</th>
                      <th className="px-3 py-2 text-left">Aniversário</th>
                      <th className="px-3 py-2 text-left">GC</th>
                      <th className="px-3 py-2 text-left">Como chegou</th>
                      <th className="px-3 py-2 text-left">Etapa</th>
                      <th className="px-3 py-2 text-left">Sub-área</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => {
                      const rowClass = row.skip ? 'opacity-40 bg-gray-50' : row.isDuplicate ? 'bg-red-50' : row.issues.length > 0 ? 'bg-orange-50/40' : ''
                      return (
                        <tr key={i} className={`transition-colors ${rowClass}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={row.skip} onChange={() => toggleSkip(i)} className="rounded" />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                            {row.name || <span className="text-red-500 font-semibold">VAZIO</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.phoneError
                              ? <span className="text-red-500">{row.phone || '—'}</span>
                              : row.phoneChanged
                              ? <span className="text-blue-600 font-medium" title={`Original: ${row.raw[mapping.phone ?? ''] ?? ''}`}>{row.phone}</span>
                              : <span className="text-gray-600">{row.phone}</span>
                            }
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-28 truncate">{row.email || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.birthdayChanged
                              ? <span className="text-blue-600 font-medium">{row.birthday}</span>
                              : <span className="text-gray-500">{row.birthday || '—'}</span>
                            }
                          </td>
                          <td className="px-3 py-2">{row.gcLabel || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2 max-w-24 truncate text-gray-500">{row.how_found || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.stageChanged
                              ? <span className="text-blue-600 font-medium">{STAGE_LABELS[row.current_stage]}</span>
                              : <span className="text-gray-500">{STAGE_LABELS[row.current_stage]}</span>
                            }
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-24 truncate">{row.sub_area || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.skip
                              ? <span className="text-gray-400">Ignorado</span>
                              : row.isDuplicate
                              ? <span className="text-red-600 font-semibold flex items-center gap-1"><AlertTriangle size={11} /> Duplicado</span>
                              : row.issues.length > 0
                              ? <span className="text-orange-600 flex items-center gap-1"><AlertTriangle size={11} /> {row.issues[0]}</span>
                              : <span className="text-green-600 flex items-center gap-1"><CheckCircle size={11} /> OK</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 'done' && importResult && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{importResult.ok} voluntários importados</p>
                {importResult.skipped > 0 && (
                  <p className="text-sm text-gray-500 mt-1">{importResult.skipped} ignorados (duplicados, inválidos ou marcados manualmente)</p>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left">
                  <p className="text-sm font-semibold text-red-700 mb-1">Erros:</p>
                  {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
              <button onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step !== 'done' && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              onClick={() => setStep(step === 'preview' ? 'map' : step === 'map' ? 'upload' : 'upload')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
              disabled={step === 'upload'}
            >
              <ChevronLeft size={15} /> Voltar
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              {step === 'map' && <><FileText size={13} /> {rawRows.length} linhas · {headers.length} colunas</>}
              {step === 'preview' && <><CheckCircle size={13} className="text-green-500" /> {validRows.length} de {rows.length} prontos</>}
            </div>

            {step === 'upload' && (
              <button
                onClick={() => file && setStep('map')}
                disabled={!file || (isAdmin && !selectedMinistry)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
              >
                {!file ? 'Selecione um arquivo' : !selectedMinistry && isAdmin ? 'Selecione o ministério' : 'Continuar'} <ChevronRight size={15} />
              </button>
            )}
            {step === 'map' && (
              <button
                onClick={goToPreview}
                disabled={!mapping.name || !mapping.phone}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
              >
                {!mapping.name || !mapping.phone ? 'Mapeie Nome e Telefone' : 'Visualizar dados'} <ChevronRight size={15} />
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={runImport}
                disabled={importing || validRows.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
              >
                {importing
                  ? <><Loader2 size={15} className="animate-spin" /> Importando...</>
                  : <><CheckCircle size={15} /> Importar {validRows.length} voluntários</>
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

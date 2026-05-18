import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'

type PageState = 'verifying' | 'ready' | 'success' | 'invalid'

function StrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  const labels = ['Fraca', 'Razoável', 'Boa', 'Forte']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${['text-red-500','text-orange-500','text-yellow-600','text-green-600'][score - 1] ?? 'text-gray-400'}`}>
        {score > 0 ? labels[score - 1] : ''}
      </p>
    </div>
  )
}

export default function RedefinirSenha() {
  usePageTitle('Redefinir Senha')
  const navigate = useNavigate()
  const [pageState, setPageState] = useState<PageState>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when user arrives from the reset link.
    // The token is in the URL hash — the JS client handles it automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setPageState('ready')
      } else if (event === 'SIGNED_IN' && session) {
        // Already has a recovery session from a previous tab / auto-session
        setPageState('ready')
      }
    })

    // Also check immediately for an existing session with recovery token in URL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState('ready')
      } else {
        // Give onAuthStateChange a moment to fire with the hash token
        const timer = setTimeout(() => {
          setPageState(prev => prev === 'verifying' ? 'invalid' : prev)
        }, 2500)
        return () => clearTimeout(timer)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const passwordsMatch = password === confirm
  const passwordValid = password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordValid) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (!passwordsMatch) { setError('As senhas não coincidem.'); return }

    setError('')
    setSubmitting(true)

    const { error: err } = await supabase.auth.updateUser({ password })

    setSubmitting(false)

    if (err) {
      setError(err.message.includes('same password')
        ? 'A nova senha não pode ser igual à senha atual.'
        : 'Não foi possível redefinir a senha. O link pode ter expirado.')
    } else {
      await supabase.auth.signOut()
      setPageState('success')
    }
  }

  // ── Verifying ──
  if (pageState === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4">
          <Loader size={32} className="text-indigo-500 animate-spin" />
          <p className="text-gray-500 text-sm">Validando link de redefinição...</p>
        </div>
      </div>
    )
  }

  // ── Invalid / expired link ──
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center mb-8">
          <img src="/pulse-logo.svg" alt="Pulse" className="w-16 h-16 rounded-2xl mb-4 shadow-xl" />
          <h1 className="text-white font-bold text-2xl">Pulse</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido ou expirado</h2>
          <p className="text-sm text-gray-500 mb-8">
            Este link de redefinição não é mais válido. Os links expiram em 1 hora após o envio.
          </p>
          <Link
            to="/esqueci-senha"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm text-center"
          >
            Solicitar novo link
          </Link>
          <Link to="/login" className="block mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  // ── Success ──
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center mb-8">
          <img src="/pulse-logo.svg" alt="Pulse" className="w-16 h-16 rounded-2xl mb-4 shadow-xl" />
          <h1 className="text-white font-bold text-2xl">Pulse</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
          <p className="text-sm text-gray-500 mb-8">
            Sua senha foi alterada com sucesso. Faça login com a nova senha.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  // ── Ready: new password form ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center mb-8">
        <img src="/pulse-logo.svg" alt="Pulse" className="w-16 h-16 rounded-2xl mb-4 shadow-xl" />
        <h1 className="text-white font-bold text-2xl">Pulse</h1>
        <p className="text-indigo-200 text-sm mt-1">Ministérios · Lagoinha Osasco</p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <KeyRound size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nova senha</h2>
            <p className="text-sm text-gray-500">Escolha uma senha segura</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <StrengthBar password={password} />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }}
                placeholder="Repita a nova senha"
                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  confirm && !passwordsMatch ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirm && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
            )}
            {confirm && passwordsMatch && password && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle size={11} /> Senhas coincidem
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !passwordValid || !passwordsMatch}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader size={15} className="animate-spin" /> Salvando...</> : 'Redefinir senha'}
          </button>
        </form>

        {/* Password requirements */}
        <div className="mt-5 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs font-semibold text-gray-600 mb-2">Requisitos da senha:</p>
          {[
            { ok: password.length >= 8, text: 'Mínimo de 8 caracteres' },
            { ok: /[A-Z]/.test(password), text: 'Pelo menos uma letra maiúscula' },
            { ok: /[0-9]/.test(password), text: 'Pelo menos um número' },
            { ok: /[^A-Za-z0-9]/.test(password), text: 'Pelo menos um caractere especial' },
          ].map(req => (
            <div key={req.text} className="flex items-center gap-2 mt-1">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${req.ok && password ? 'bg-green-500' : 'bg-gray-300'}`}>
                {req.ok && password && <CheckCircle size={9} className="text-white" />}
              </div>
              <span className={`text-xs ${req.ok && password ? 'text-green-700' : 'text-gray-400'}`}>{req.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

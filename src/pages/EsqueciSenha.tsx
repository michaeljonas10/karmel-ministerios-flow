import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'

export default function EsqueciSenha() {
  usePageTitle('Recuperar Senha')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    setSubmitting(false)

    if (err) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <img src="/pulse-logo.svg" alt="Pulse" className="w-16 h-16 rounded-2xl mb-4 shadow-xl" />
        <h1 className="text-white font-bold text-2xl">Pulse</h1>
        <p className="text-indigo-200 text-sm mt-1">Ministérios · Lagoinha Osasco</p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {sent ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-5">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-mail enviado!</h2>
            <p className="text-sm text-gray-500 mb-2">
              Enviamos um link de redefinição para
            </p>
            <p className="font-semibold text-indigo-600 text-sm mb-6">{email}</p>
            <p className="text-xs text-gray-400 mb-8">
              Verifique sua caixa de entrada e spam. O link expira em 1 hora.
            </p>
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Mail size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Esqueci minha senha</h2>
                <p className="text-sm text-gray-500">Enviaremos um link para seu e-mail</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {submitting ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={15} />
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

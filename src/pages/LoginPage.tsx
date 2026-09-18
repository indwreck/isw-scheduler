import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    const result =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, fullName.trim())
    setBusy(false)
    if (result === 'CONFIRM_EMAIL') {
      setInfo(
        'Account created. Check your email for a confirmation link, then come back and sign in.',
      )
      setMode('signin')
    } else if (result === 'NOT_INVITED') {
      setError(
        'This email address has not been invited. Accounts are created by invitation only — ask an ISW admin to invite you, then sign up with the exact address they used.',
      )
    } else if (result) {
      setError(result)
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <img
            src={`${import.meta.env.BASE_URL}logo-full.png`}
            alt="Industrial Salvage & Wrecking Co. Inc."
          />
          <div className="login-sub">Scheduler</div>
        </div>

        {!isSupabaseConfigured && (
          <div className="notice">Not connected to a database yet.</div>
        )}

        <h1 className="page-title" style={{ fontSize: 20 }}>
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        {mode === 'signup' && (
          <p className="section-help">
            By invitation only. Use the email address your admin invited.
          </p>
        )}

        {mode === 'signup' && (
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="alert-error">{error}</div>}
        {info && <div className="alert-info">{info}</div>}

        <button className="btn btn-primary btn-block" disabled={busy} type="submit">
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          className="btn btn-link btn-block"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setInfo(null)
          }}
        >
          {mode === 'signin'
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}

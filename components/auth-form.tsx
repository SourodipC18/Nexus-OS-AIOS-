'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError('')
    const result = mode === 'sign-in'
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ email, password, name: name || 'NEXUS user' })
    if (result.error) setError('We could not authenticate with those details.')
    else { router.push('/'); router.refresh() }
    setPending(false)
  }

  return <form onSubmit={submit} className="auth-form">
    {mode === 'sign-up' && <input aria-label="Name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />}
    <input aria-label="Email" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
    <input aria-label="Password" type="password" required minLength={8} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
    {error && <p className="form-error">{error}</p>}
    <button disabled={pending}>{pending ? 'Connecting…' : mode === 'sign-in' ? 'Enter NEXUS' : 'Create workspace'}</button>
    <button type="button" className="text-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>{mode === 'sign-in' ? 'Create an account' : 'Already have an account? Sign in'}</button>
  </form>
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError('')
    const result = mode === 'sign-in'
      ? await authClient.signIn.username({ username, password })
      : await authClient.signUp.username({ username, password, name: username })
    if (result.error) setError(result.error.message || 'We could not authenticate with those details.')
    else { router.push('/'); router.refresh() }
    setPending(false)
  }

  return <form onSubmit={submit} className="auth-form" aria-busy={pending}>
    <input aria-label="User ID" required maxLength={64} pattern="[A-Za-z0-9]+" placeholder="User ID" value={username} onChange={e => setUsername(e.target.value)} />
    <input aria-label="Password" type="password" required maxLength={128} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
    {error && <p className="form-error">{error}</p>}
    <button disabled={pending}>{pending ? 'Connecting…' : mode === 'sign-in' ? 'Enter NEXUS' : 'Create workspace'}</button>
    <button type="button" className="text-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>{mode === 'sign-in' ? 'Create an account' : 'Already have an account? Sign in'}</button>
  </form>
}

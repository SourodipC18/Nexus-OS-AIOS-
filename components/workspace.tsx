'use client'

import { useState } from 'react'
import { AuthForm } from './auth-form'
import { authClient } from '@/lib/auth-client'

const nav = ['Overview', 'Assistant', 'Projects', 'Tasks', 'Agents', 'Memory', 'Activity']
const agents = [['OR', 'Orchestrator', 'Ready'], ['RE', 'Research Agent', 'Ready'], ['PL', 'Planner Agent', 'Standby'], ['BU', 'Builder Agent', 'Standby']]

export function Workspace({ user }: { user: { name: string; email: string } | null }) {
  const [active, setActive] = useState('Overview')
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const firstName = user?.name?.split(' ')[0] || 'there'

  async function signOut() { await authClient.signOut(); window.location.reload() }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const prompt = command.trim()
    if (!prompt || loading) return
    setLoading(true)
    setResponse('')
    setError('')

    try {
      const result = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      if (!result.ok) {
        const data = await result.json().catch(() => null)
        throw new Error(data?.error || 'The assistant could not process that request.')
      }
      if (!result.body) throw new Error('The assistant returned an empty response.')
      const reader = result.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        setResponse((current) => current + decoder.decode(value, { stream: true }))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The assistant could not process that request.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <main className="login-page"><div className="login-brand"><span className="brand-mark">N</span><span>NEXUS <small>AI OS</small></span></div><div className="login-card"><p className="eyebrow">PERSONAL INTELLIGENCE SYSTEM</p><h1>Your command center<br /><em>for meaningful work.</em></h1><p className="login-copy">Coordinate projects, agents, and ideas from one focused workspace.</p><AuthForm /></div><p className="login-footer">Secure workspace · Neon persistence · Human approval by default</p></main>

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">N</span><span>NEXUS <small>AI OS</small></span></div><div className="workspace-switcher"><span className="workspace-dot" /> Personal workspace <span>⌄</span></div><nav>{nav.map((item, i) => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}><span className="nav-icon">{['⌂','✦','□','✓','◈','◇','◌'][i]}</span>{item}{item === 'Tasks' && <b>4</b>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item"><span className="nav-icon">⚙</span>Settings</button><button className="profile" onClick={signOut}><span className="avatar">{firstName[0]}</span><span><strong>{user.name}</strong><small>{user.email}</small></span><span>⋯</span></button></div></aside>
    <section className="content"><header className="topbar"><div><span className="breadcrumb">Workspace / </span><strong>{active}</strong></div><div className="top-actions"><button className="search">⌕ <span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button">◐</button><span className="status"><i /> All systems ready</span></div></header><div className="content-inner"><div className="welcome"><div><p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</p><h1>Good morning, {firstName}.</h1><p className="muted">Your workspace is quiet. What would you like to move forward?</p></div><div className="date-chip">◷ <span>Today<br /><strong>Focus mode</strong></span></div></div><form className="command-card" onSubmit={submit}><div className="command-top"><span className="spark">✦</span><input value={command} onChange={e => { setCommand(e.target.value); setResponse(''); setError('') }} placeholder="What would you like NEXUS to accomplish today?" /><button type="submit">Run command <span>↗</span></button></div><div className="suggestions"><span>Try asking</span><button type="button" onClick={() => setCommand('Plan my week around the highest-impact work')}>Plan my week</button><button type="button" onClick={() => setCommand('Review my active projects')}>Review projects</button><button type="button" onClick={() => setCommand('Research a new topic')}>Research a topic</button></div>{loading && <p className="command-result">NEXUS is thinking…</p>}{error && <p className="command-result error">{error}</p>}{response && <div className="assistant-response"><span className="eyebrow">NEXUS RESPONSE</span><p>{response}</p></div>}</form><div className="section-heading"><div><p className="eyebrow">AT A GLANCE</p><h2>Your operating picture</h2></div><button className="link-button">View activity ↗</button></div><div className="metrics"><Metric label="Active projects" value="0" note="Start your first project"/><Metric label="Open tasks" value="0" note="Nothing waiting"/><Metric label="Agent runs" value="0" note="Ready when you are"/><Metric label="Approvals" value="0" note="All clear"/></div><div className="lower-grid"><div className="panel"><div className="panel-head"><div><p className="eyebrow">WORKSPACE</p><h3>Recent projects</h3></div><button className="link-button">View all</button></div><div className="empty"><span className="empty-icon">＋</span><strong>Your project space is ready.</strong><p>Turn a goal into a clear plan with NEXUS.</p><button className="primary-small" onClick={() => setCommand('Create a project plan for ')}>Create a project</button></div></div><div className="panel"><div className="panel-head"><div><p className="eyebrow">AGENT NETWORK</p><h3>System status</h3></div><span className="live">LIVE</span></div><div className="agent-list">{agents.map(([initials, name, status]) => <div className="agent-row" key={name}><span className="agent-avatar">{initials}</span><span><strong>{name}</strong><small>{status}</small></span><i className="agent-dot" /></div>)}</div></div></div></div></section>
  </main>
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }

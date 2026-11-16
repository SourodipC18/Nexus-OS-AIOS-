'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Conversation = { id: string; title: string; updated_at: string }
type Message = { id: string; role: 'user' | 'assistant'; content: string }

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  return data?.error || fallback
}

export function Assistant({ initialPrompt = '' }: { initialPrompt?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadConversation = useCallback(async (id: string) => {
    setError('')
    const response = await fetch(`/api/conversations/${id}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(await responseError(response, 'Could not load this conversation.'))
    const data = await response.json()
    setConversationId(data.conversation.id)
    setMessages(data.conversation.messages.map((message: Message) => ({ ...message, id: message.id })))
  }, [])

  const refreshConversations = useCallback(async () => {
    const response = await fetch('/api/conversations', { cache: 'no-store' })
    if (!response.ok) throw new Error(await responseError(response, 'Could not load conversations.'))
    const data = await response.json()
    setConversations(data.conversations)
    return data.conversations as Conversation[]
  }, [])

  useEffect(() => {
    let cancelled = false
    async function initialize() {
      try {
        const list = await refreshConversations()
        if (!cancelled && list.length) await loadConversation(list[0].id)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load your conversations.')
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }
    void initialize()
    return () => { cancelled = true }
  }, [loadConversation, refreshConversations])

  useEffect(() => {
    if (initialPrompt) setDraft(initialPrompt)
  }, [initialPrompt])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: sending ? 'smooth' : 'auto', block: 'end' })
  }, [messages, sending])

  async function createConversation() {
    setError('')
    const response = await fetch('/api/conversations', { method: 'POST' })
    if (!response.ok) throw new Error(await responseError(response, 'Could not start a conversation.'))
    const data = await response.json()
    const conversation = data.conversation as Conversation
    setConversations((current) => [conversation, ...current])
    setConversationId(conversation.id)
    setMessages([])
    setDraft('')
    inputRef.current?.focus()
    return conversation.id as string
  }

  async function startNewConversation() {
    if (sending) return
    try {
      await createConversation()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not start a conversation.')
    }
  }

  async function selectConversation(id: string) {
    if (sending || id === conversationId) return
    try {
      await loadConversation(id)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.')
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return

    setSending(true)
    setError('')
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content }
    const assistantId = crypto.randomUUID()
    setDraft('')

    try {
      const id = conversationId || await createConversation()
      setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', content: '' }])
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, message: content }),
      })
      if (!response.ok) throw new Error(await responseError(response, 'The assistant could not process that request.'))
      if (!response.body) throw new Error('The assistant returned an empty response.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let received = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        received += decoder.decode(value, { stream: true })
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: received } : message))
      }
      received += decoder.decode()
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: received } : message))
      if (!received.trim()) throw new Error('The assistant returned an empty response. Please try again.')
      await refreshConversations()
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message.id !== assistantId))
      setError(sendError instanceof Error ? sendError.message : 'The assistant could not process that request.')
      void refreshConversations().catch(() => undefined)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function saveTitle(id: string) {
    const title = titleDraft.trim()
    if (!title) return setRenamingId(null)
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) throw new Error(await responseError(response, 'Could not rename this conversation.'))
      const data = await response.json()
      setConversations((current) => current.map((item) => item.id === id ? { ...item, title: data.conversation.title } : item))
      setRenamingId(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not rename this conversation.')
    }
  }

  async function deleteConversation(id: string) {
    if (!window.confirm('Delete this conversation and its messages? This cannot be undone.')) return
    try {
      const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await responseError(response, 'Could not delete this conversation.'))
      const remaining = conversations.filter((item) => item.id !== id)
      setConversations(remaining)
      if (conversationId === id) {
        setConversationId(null)
        setMessages([])
        if (remaining[0]) await loadConversation(remaining[0].id)
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this conversation.')
    }
  }

  return (
    <div className="assistant-page">
      <div className="assistant-heading">
        <div><p className="eyebrow">NEXUS ASSISTANT</p><h1>Your thinking partner.</h1><p className="muted">Conversations are saved to your workspace.</p></div>
        <button className="primary-small" onClick={startNewConversation} disabled={sending}>＋ New conversation</button>
      </div>

      <div className="assistant-layout">
        <aside className="conversation-sidebar" aria-label="Conversations">
          <div className="conversation-sidebar-head"><span>RECENT</span><span>{conversations.length}</span></div>
          {loadingList ? <p className="conversation-note">Loading conversations…</p> : conversations.length === 0 ? <p className="conversation-note">Your saved conversations will appear here.</p> : (
            <div className="conversation-list">
              {conversations.map((item) => (
                <div className={item.id === conversationId ? 'conversation-item selected' : 'conversation-item'} key={item.id}>
                  {renamingId === item.id ? (
                    <input autoFocus value={titleDraft} maxLength={80} aria-label="Conversation title" onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void saveTitle(item.id); if (event.key === 'Escape') setRenamingId(null) }} />
                  ) : <button className="conversation-select" onClick={() => void selectConversation(item.id)} title={item.title}>{item.title}</button>}
                  <div className="conversation-actions">
                    <button aria-label={`Rename ${item.title}`} title="Rename" disabled={sending} onClick={() => { setRenamingId(item.id); setTitleDraft(item.title) }}>✎</button>
                    <button aria-label={`Delete ${item.title}`} title="Delete" disabled={sending} onClick={() => void deleteConversation(item.id)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="chat-panel" aria-label="Assistant conversation">
          <div className="chat-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <span className="chat-empty-mark">✦</span>
                <p className="eyebrow">A CLEARER WAY FORWARD</p>
                <h2>What are you working through?</h2>
                <p>Ask NEXUS to help think, plan, or make sense of an idea.</p>
                <div className="chat-prompts">
                  {['Help me plan my week', 'Break down a goal into steps', 'Help me think through a decision'].map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)}>{prompt} <span>↗</span></button>)}
                </div>
              </div>
            ) : messages.map((message) => (
              <article className={`chat-message ${message.role}`} key={message.id}>
                <span className="message-label">{message.role === 'user' ? 'YOU' : 'NEXUS'}</span>
                <p>{message.content || (sending && message.role === 'assistant' ? 'Thinking…' : '')}</p>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>
          {error && <div className="assistant-error" role="alert">{error}</div>}
          <form className="chat-composer" onSubmit={submit}>
            <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="Message NEXUS…" maxLength={12_000} rows={2} disabled={sending} aria-label="Message NEXUS" />
            <div className="composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Thinking…' : 'Send'} <span>↗</span></button></div>
          </form>
        </section>
      </div>
    </div>
  )
}

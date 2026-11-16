import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
const requestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(12_000),
})

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>
  let conversationSaved = false
  try {
    session = await auth.api.getSession({ headers: await headers() })
  } catch (error) {
    console.error('[nexus] Chat authentication lookup failed.', error)
    return Response.json({ error: 'NEXUS could not reach its account database. Check DATABASE_URL and try again.' }, { status: 503 })
  }
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: 'Gemini is not configured. Add GEMINI_API_KEY in the project environment.' }, { status: 503 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Send a conversation ID and a message under 12,000 characters.' }, { status: 400 })
  }
  const { conversationId, message } = parsed.data

  try {
    const client = await db.connect()
    let history: { role: 'user' | 'assistant'; content: string }[]
    try {
      await client.query('BEGIN')
      const conversation = await client.query(
        `UPDATE nexus_conversations
         SET title = CASE WHEN title = 'New conversation' THEN left($3, 80) ELSE title END,
             updated_at = now()
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [conversationId, session.user.id, message],
      )
      if (!conversation.rowCount) {
        await client.query('ROLLBACK')
        return Response.json({ error: 'Conversation not found.' }, { status: 404 })
      }
      await client.query(
        'INSERT INTO nexus_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'user', message],
      )
      const messages = await client.query(
        `SELECT role, content FROM nexus_messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC, id DESC LIMIT 40`,
        [conversationId],
      )
      history = messages.rows.reverse().map((row) => ({ role: row.role, content: row.content }))
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    conversationSaved = true

    const result = streamText({
      model: google('gemini-3.6-flash'),
      system: 'You are NEXUS, a concise chief-of-staff AI. Help users plan and execute work. Be transparent about what is proposed versus completed. Never claim tools ran unless they did.',
      messages: history,
      onFinish: async ({ text }) => {
        if (!text.trim()) return
        try {
          await db.query(
            'INSERT INTO nexus_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
            [conversationId, 'assistant', text],
          )
          await db.query('UPDATE nexus_conversations SET updated_at = now() WHERE id = $1 AND user_id = $2', [conversationId, session.user.id])
        } catch (error) {
          console.error('[nexus] Assistant response could not be saved.', error)
        }
      },
      onError: ({ error }) => console.error('[nexus] Gemini chat stream failed.', error),
    })
    return result.toTextStreamResponse()
  } catch (error) {
    if (!conversationSaved) {
      console.error('[nexus] Conversation could not be saved.', error)
      return Response.json({ error: 'Conversation storage is unavailable. Check DATABASE_URL and run pnpm db:migrate.' }, { status: 503 })
    }
    console.error('[nexus] Gemini chat request failed.', error)
    const message = error instanceof Error && /quota|rate.?limit|429/i.test(error.message)
      ? 'Gemini free-tier quota or rate limit reached. Please try again later.'
      : 'Gemini could not process that request. Please try again.'
    return Response.json({ error: message }, { status: 502 })
  }
}

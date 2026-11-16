import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await db.query(
      `SELECT id, title, created_at, updated_at
       FROM nexus_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 100`,
      [session.user.id],
    )
    return Response.json({ conversations: result.rows })
  } catch (error) {
    console.error('[nexus] Conversation list request failed.', error)
    return Response.json({ error: 'NEXUS could not load conversations. Check the database configuration and try again.' }, { status: 503 })
  }
}

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await db.query(
      `INSERT INTO nexus_conversations (user_id) VALUES ($1)
       RETURNING id, title, created_at, updated_at`,
      [session.user.id],
    )
    return Response.json({ conversation: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('[nexus] Conversation creation failed.', error)
    return Response.json({ error: 'NEXUS could not create a conversation. Check the database configuration and try again.' }, { status: 503 })
  }
}

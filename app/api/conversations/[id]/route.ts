import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { headers } from 'next/headers'

const idSchema = z.string().uuid()
const titleSchema = z.object({ title: z.string().trim().min(1).max(80) })

type RouteContext = { params: Promise<{ id: string }> }

async function getOwner(requestId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!idSchema.safeParse(requestId).success) return { response: Response.json({ error: 'Conversation not found.' }, { status: 404 }) }
  return { userId: session.user.id }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  try {
    const owner = await getOwner(id)
    if ('response' in owner) return owner.response

    const result = await db.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              COALESCE(json_agg(json_build_object(
                'id', m.id, 'role', m.role, 'content', m.content, 'created_at', m.created_at
              ) ORDER BY m.created_at, m.id) FILTER (WHERE m.id IS NOT NULL), '[]') AS messages
       FROM nexus_conversations c
       LEFT JOIN nexus_messages m ON m.conversation_id = c.id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id`,
      [id, owner.userId],
    )
    if (!result.rowCount) return Response.json({ error: 'Conversation not found.' }, { status: 404 })
    return Response.json({ conversation: result.rows[0] })
  } catch (error) {
    console.error('[nexus] Conversation load failed.', error)
    return Response.json({ error: 'NEXUS could not load this conversation. Check the database configuration and try again.' }, { status: 503 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  try {
    const owner = await getOwner(id)
    if ('response' in owner) return owner.response
    const parsed = titleSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return Response.json({ error: 'Enter a conversation title of up to 80 characters.' }, { status: 400 })

    const result = await db.query(
      `UPDATE nexus_conversations SET title = $3, updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, created_at, updated_at`,
      [id, owner.userId, parsed.data.title],
    )
    if (!result.rowCount) return Response.json({ error: 'Conversation not found.' }, { status: 404 })
    return Response.json({ conversation: result.rows[0] })
  } catch (error) {
    console.error('[nexus] Conversation rename failed.', error)
    return Response.json({ error: 'NEXUS could not rename this conversation. Try again.' }, { status: 503 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params
  try {
    const owner = await getOwner(id)
    if ('response' in owner) return owner.response
    const result = await db.query('DELETE FROM nexus_conversations WHERE id = $1 AND user_id = $2', [id, owner.userId])
    if (!result.rowCount) return Response.json({ error: 'Conversation not found.' }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[nexus] Conversation deletion failed.', error)
    return Response.json({ error: 'NEXUS could not delete this conversation. Try again.' }, { status: 503 })
  }
}

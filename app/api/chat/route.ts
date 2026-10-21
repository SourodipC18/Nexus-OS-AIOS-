import { streamText } from 'ai'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { messages } = await request.json()
  const result = streamText({
    model: 'openai/o4-mini',
    system: 'You are NEXUS, a concise chief-of-staff AI. Help users plan and execute work. Be transparent about what is proposed versus completed. Never claim tools ran unless they did.',
    messages,
  })
  return result.toUIMessageStreamResponse()
}

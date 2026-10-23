import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: 'Gemini is not configured. Add GEMINI_API_KEY in the project environment.' },
      { status: 503 },
    )
  }

  try {
    const { messages } = await request.json()
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: 'You are NEXUS, a concise chief-of-staff AI. Help users plan and execute work. Be transparent about what is proposed versus completed. Never claim tools ran unless they did.',
      messages,
    })
    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[v0] Gemini chat request failed:', error)
    const message = error instanceof Error && /quota|rate.?limit|429/i.test(error.message)
      ? 'Gemini free-tier quota or rate limit reached. Please try again later.'
      : 'Gemini could not process that request. Please try again.'
    return Response.json({ error: message }, { status: 502 })
  }
}

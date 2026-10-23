import { auth } from '@/lib/auth'

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const username = typeof body?.username === 'string' ? normalizeUsername(body.username) : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    return Response.json({ message: 'Enter a user ID and password.' }, { status: 400 })
  }

  const upstream = await auth.handler(
    new Request(new URL('/api/auth/sign-up/email', request.url), {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        email: `${username}@users.nexus.invalid`,
        password,
        name: username,
        username,
      }),
    }),
  )

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  })
}

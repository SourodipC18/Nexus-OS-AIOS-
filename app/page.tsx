import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Workspace } from '@/components/workspace'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  return <Workspace user={session?.user ? { name: session.user.name, email: session.user.email } : null} />
}

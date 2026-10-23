import { betterAuth } from 'better-auth'
import { username } from 'better-auth/plugins'
import { Pool } from 'pg'

const origin = (value?: string) => value ? (value.startsWith('http') ? value : `https://${value}`) : undefined
const developmentOrigins = [
  'http://localhost:3000',
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
].filter(Boolean) as string[]
const productionOrigins = [
  origin(process.env.VERCEL_URL),
  origin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
  plugins: [username({
    minUsernameLength: 1,
    maxUsernameLength: 64,
    usernameValidator: (value) => /^[A-Za-z0-9]+$/.test(value),
    usernameNormalization: (value) => value.toLowerCase(),
    displayUsername: false,
  })],
  baseURL: process.env.BETTER_AUTH_URL || origin(process.env.VERCEL_PROJECT_PRODUCTION_URL) || origin(process.env.VERCEL_URL) || process.env.V0_RUNTIME_URL,
  trustedOrigins: process.env.NODE_ENV === 'development' ? developmentOrigins : productionOrigins,
  ...(process.env.NODE_ENV === 'development' ? {
    advanced: {
      defaultCookieAttributes: { sameSite: 'none' as const, secure: true },
    },
  } : {}),
})

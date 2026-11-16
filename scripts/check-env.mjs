const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL']
const missing = required.filter((key) => !process.env[key]?.trim())
const problems = []

if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
  problems.push('BETTER_AUTH_SECRET must contain at least 32 characters.')
}

if (process.env.BETTER_AUTH_URL) {
  try {
    new URL(process.env.BETTER_AUTH_URL)
  } catch {
    problems.push('BETTER_AUTH_URL must be a valid absolute URL, such as http://localhost:3000.')
  }
}

if (missing.length || problems.length) {
  console.error('NEXUS environment configuration is incomplete.')
  if (missing.length) console.error(`Missing: ${missing.join(', ')}`)
  for (const problem of problems) console.error(`Invalid: ${problem}`)
  console.error('Copy .env.example to .env.local, fill in the required values, then run pnpm check:env again.')
  process.exit(1)
}

console.log('Required NEXUS environment variables are configured.')
if (!process.env.GEMINI_API_KEY) {
  console.log('GEMINI_API_KEY is not set; chat will return a setup message until it is configured.')
}

import { Pool } from 'pg'

const globalForNexus = globalThis as typeof globalThis & { nexusPool?: Pool }

export const db = globalForNexus.nexusPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

if (process.env.NODE_ENV !== 'production') globalForNexus.nexusPool = db

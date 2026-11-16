# NEXUS AI OS

A Next.js workspace for coordinating projects, agents, and ideas. The current app includes username/password authentication and an authenticated, streaming Gemini chat endpoint. Project, task, memory, and agent dashboard data are not implemented yet.

## Requirements

- Node.js 20.9 or newer
- pnpm 12 (the repository pins its package manager version in `package.json`)
- PostgreSQL 14 or newer, locally or through a managed provider
- A Gemini API key to use assistant chat

## Local setup

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create a PostgreSQL database named `nexus` (or choose another name), then copy `.env.example` to `.env.local`.

3. Set the required values in `.env.local`:

   - `DATABASE_URL`: PostgreSQL connection string, for example `postgresql://postgres:password@localhost:5432/nexus`.
   - `BETTER_AUTH_SECRET`: unique secret of at least 32 characters. Generate one with `openssl rand -base64 32`.
   - `BETTER_AUTH_URL`: the app's base URL (`http://localhost:3000` for local development).
   - `GEMINI_API_KEY`: optional for startup, required for chat. Without it, chat returns a configuration message.

   Keep `.env.local` private and never commit it. For deployment, set these variables in the hosting provider's environment settings. Use a unique auth secret and the public HTTPS origin for each deployment environment.

4. Check the required environment variables:

   ```sh
   pnpm check:env
   ```

5. Create or update the Better Auth tables (including the username plugin schema) and NEXUS conversation tables in the configured database:

   ```sh
   pnpm db:migrate
   ```

   Run this after changing Better Auth plugins or database schema configuration, and when adding app migrations. It connects to the database in `DATABASE_URL` and may create or alter tables.

6. Start the development server:

   ```sh
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Available commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server |
| `pnpm check:env` | Check required runtime configuration and URL/secret shape |
| `pnpm db:migrate` | Apply Better Auth's schema and pending NEXUS SQL migrations to PostgreSQL |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve a production build |

## Troubleshooting

- **Database connection or account creation errors:** confirm PostgreSQL is running, `DATABASE_URL` is correct, and the database user can create and update tables. Run `pnpm db:migrate` again after correcting the connection.
- **Authentication redirects or rejected origins:** ensure `BETTER_AUTH_URL` matches the origin you are using, including scheme and port. For Vercel, set the production URL in the project environment variables.
- **Assistant configuration message:** set `GEMINI_API_KEY` and restart the app. The key is read on the server and must not be exposed through a `NEXT_PUBLIC_` variable.
- **Unexpected page error:** check the server terminal or deployment logs for the underlying error, then use the page's retry button after fixing the cause.

## Current scope

The workspace shell, account flow, and Gemini assistant are present. Assistant conversations are saved per user and can be reopened, renamed, or deleted. The dashboard's sample agent states and zero-valued metrics are placeholders; projects, tasks, activity, search, settings, and agent execution still need implementation.

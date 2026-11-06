# ABAPilot

AI assistant for SAP ABAP support consultants. Paste a ticket (and optionally the related code / short dump) and get:

- Summary, classification, complexity and effort estimate
- Technical analysis and clarifying questions
- Affected objects
- ABAP code changes wrapped in **your team's change-tag format**
- Test cases (positive / negative / regression)
- Risks and a ready-to-paste change log

## Stack
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS · Vercel AI SDK · Anthropic Claude ·
Supabase Auth (magic link) · Postgres via Drizzle ORM

## Features
- Email magic-link login; `/app`, `/history` and `/settings` require sign-in (`src/proxy.ts`)
- Every analysis is saved to your history (with token usage), viewable and deletable
- Team conventions are stored per account and applied server-side to every analysis
- Optional bring-your-own Anthropic key (kept only in the browser)

## Run locally
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run db:migrate           # create tables in your database
npm run dev
```
Open http://localhost:3000/app, sign in, and click **Load example**.

## Database
- Schema: `src/db/schema.ts`. After changing it, run `npm run db:generate` and commit the new file in `drizzle/`.
- Migrations run automatically before every Vercel build (`npm run build` → `scripts/migrate.mjs`);
  they're skipped when `DATABASE_URL` isn't set.
- Tables have Row Level Security enabled with no policies, so they're not reachable through the
  Supabase Data API. The app only accesses them from the server, always filtered by the signed-in user.

## Supabase Auth setup
In Supabase → **Authentication → URL Configuration**:
- **Site URL:** your production URL, e.g. `https://abapilot-ten.vercel.app`
- **Redirect URLs:** add `https://abapilot-ten.vercel.app/**` (and `http://localhost:3000/**` for local dev)

## Deploy to Vercel
1. Import this GitHub repo at vercel.com/new
2. Add the environment variables from `.env.example`
3. Deploy. Each PR gets its own preview URL.

## Roadmap
- [x] Supabase Auth + Postgres (Drizzle): accounts, ticket history, per-account conventions
- [ ] Shared team workspaces (conventions and history shared across a team)
- [ ] Stripe subscriptions and usage limits for the Free plan
- [ ] Export to Word / technical spec template
- [ ] Follow-up chat on an analysis ("change the approach to a BAdI")
- [ ] Self-hosted / on-prem option for clients with strict data rules

## Privacy
Tickets, code and results are sent to the Anthropic API for analysis and saved to the user's history in
the app's database (users can delete them).
Remind users to strip client names and personal data before pasting.

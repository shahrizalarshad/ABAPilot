# ABAPilot

AI assistant for SAP ABAP support consultants. Paste a ticket (and optionally the related code / short dump) and get:

- Summary, classification, complexity and effort estimate
- Technical analysis and clarifying questions
- Affected objects
- ABAP code changes wrapped in **your team's change-tag format**
- Test cases (positive / negative / regression)
- Risks and a ready-to-paste change log

## Stack
Next.js (App Router) · TypeScript · Tailwind CSS · Vercel AI SDK · Anthropic Claude

## Run locally
```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm install
npm run dev
```
Open http://localhost:3000/app and click **Load example**.

## Deploy to Vercel
1. Import this GitHub repo at vercel.com/new
2. Add the `ANTHROPIC_API_KEY` environment variable
3. Deploy. Each PR gets its own preview URL.

## Roadmap
- [ ] Supabase Auth + Postgres (Drizzle): accounts, ticket history, shared team conventions
- [ ] Stripe subscriptions and usage limits for the Free plan
- [ ] Export to Word / technical spec template
- [ ] Follow-up chat on an analysis ("change the approach to a BAdI")
- [ ] Self-hosted / on-prem option for clients with strict data rules

## Privacy
Tickets and code are sent to the Anthropic API only for the request and are not stored by the app.
Remind users to strip client names and personal data before pasting.

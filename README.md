# Vantiq

Personal finance tracking and market intelligence, in one place.

Vantiq tracks what you spend and earn, and pairs it with a plain-language
read on what moved in the markets today. It shows information and tools —
not investment advice.

## Features

- Expense and income tracking with categories
- Live-feel market ticker
- Auth-protected dashboard (Supabase Auth)
- Row-level security so each user only ever sees their own data

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth)
- Vercel (hosting)

## Local setup

1. Clone the repo
2. `npm install`
3. Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Run the SQL in `supabase/schema.sql` in your Supabase project's SQL Editor
5. `npm run dev`

## Disclaimer

Vantiq provides information and tracking tools only. Nothing on this
platform is investment advice or a recommendation to buy or sell any
security. Consult a SEBI-registered adviser before making investment
decisions.

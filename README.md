# Gym Tracker

Mobile-first workout logging web app for the gym. Built with Next.js App Router, TypeScript, Supabase (Postgres + Auth), and deployed to Vercel.

## Tech Stack

- **Frontend**: Next.js 15, App Router, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Recharts
- **Backend**: Supabase (Postgres, Auth, RLS)
- **Deployment**: Vercel

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a Supabase project at [supabase.com](https://supabase.com) and get your project URL and anon key.

3. Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Run the database migration: Open Supabase Dashboard → SQL Editor, then run the contents of `supabase/full-migration.sql`. See `MIGRATION_INSTRUCTIONS.md` for details.

5. Start the dev server:

```bash
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Never commit `.env.local` or expose your service role key.

## Troubleshooting

**"Cannot find module './10.js'" or similar chunk error after login**  
This happens when the dev server uses stale build artifacts. Run:

```bash
npm run clean
npm run dev
```

**Email confirmation not formatted**  
Copy the template from `supabase/templates/confirmation.html` into Supabase Dashboard → Authentication → Email Templates → Confirm signup. See `supabase/templates/README.md`.

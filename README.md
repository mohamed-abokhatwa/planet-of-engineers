# Planet of Engineers · كوكب المهندسين

**The world is engineers… and a few other people.**
*الدنيا عبارة عن مهندسين وشوية ناس تانيين*

A free iOS, iPad and Android app for engineers everywhere, in English and Arabic.

| | |
|---|---|
| 🧰 **Toolbox** | 9 offline calculators (concrete & materials, rebar weight, power & current, voltage drop & cable size, pipe pressure drop, pump power, slope, areas) and a 12-category unit converter including feddan, dunam, TR and kgf/cm². Verified against reference values in `npm test`. |
| 🆘 **Site SOS** | Ask with a photo, answer, vote, accept the best answer. Reputation levels from Trainee to Legend. Report and block on every post. |
| 🧭 **Salary Compass** | Anonymous monthly salaries by country, discipline and experience. Ranges appear only when 5+ engineers have shared. |
| ⚡ **Daily Challenge** | 32 exam-style questions (FE/PE level) with explanations, streaks, weekly leaderboard. |
| 🌍 **The Planet** | Engineers by country and discipline, your engineer ID card to share, and a coffee-break corner. |

## Run it (demo mode, no setup)

```bash
npm install
```

```bash
npx expo start
```

Without database keys the app runs on sample data stored on the device. Store builds refuse to run without keys (they show "Setup incomplete"), so demo data can never ship.

## Go live

1. Create a free Supabase project and enable **Anonymous sign-ins** (Authentication → Sign In / Providers).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_challenge_keys.sql`, then `0003_cron.sql`.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS environment variables, then build with EAS.

No server functions are needed: every rule (text filters, rate limits, reputation, anonymity) runs inside the database. Full steps: [PUBLISHING.md](PUBLISHING.md).

## Moderation

```sql
select * from moderation_queue;                                   -- reported posts
update questions set hidden = true where id = '…';                -- remove a question
update answers set hidden = true where id = '…';                  -- remove an answer
delete from auth.users where id = (select author_id from questions where id = '…');  -- ban the author
```

## Project layout

```
src/app/            screens (Expo Router): onboarding, 5 tabs, tool, converter, question, ask, salary-share, leaderboard, card
src/tools/          calc.ts (pure engineering maths) + defs.ts (tool inputs/results, bilingual)
src/data/           api.ts (interface), demoApi.ts (offline), supabaseApi.ts (live), challenges.ts, seed.ts
src/lib/            i18n, store, moderation, countries, format
src/components/     blueprint UI kit, cards, pickers, sheets
supabase/           schema with row-level security, challenge answer key, cleanup job
tests/run.ts        150 checks: calculators, filters, challenge bank, DB key sync
docs/               public support / privacy / terms pages (GitHub Pages)
```

## Checks

```bash
npm test
```

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```

After editing the Daily Challenge questions, regenerate the database key: `npx tsx scripts/gen-challenge-keys.ts`.

# Planet of Engineers · كوكب المهندسين

**The world is engineers… and a few other people.**
*الدنيا عبارة عن مهندسين وشوية ناس تانيين*

A free iOS, iPad and Android app for engineers everywhere, in English and Arabic.

| | |
|---|---|
| 🧰 **Toolbox** | Fully offline. **47 calculators** in 7 groups: structural (beam moment/shear/deflection, Euler buckling, section properties, rebar spacing), civil (concrete, rebar, blocks, tiles, plaster, paint, excavation, steel weight, tanks, stairs), electrical (power, voltage drop, Ohm's law, resistors, PF correction, motor current, transformer & fault level, lighting, UPS, solar, energy cost), mechanical & HVAC (pipe drop, pump, cooling load, ducts, pipe sizing, heat, pulleys, bolt torque, hydrostatic, fill time, thermal expansion), process (dilution, ideal gas), surveying (distance & bearing, height by angle, DMS) and general maths. Plus a **scientific calculator** (safe parser, DEG/RAD, history), a **17-category unit converter** and **reference tables** (rebar, IPE, concrete grades, bolts, Sch 40 pipes, AWG, densities). Search in English or Arabic, ☆ favourites, last inputs remembered, copy/share results. Verified in `npm test`. |
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
src/app/            screens (Expo Router): onboarding, 5 tabs, tool, converter, calculator, reference, question, ask, salary-share, leaderboard, card
src/tools/          calc.ts + calc-more.ts (pure engineering maths), expr.ts (calculator parser),
                    tables.ts (reference data), defs.ts + defs-more.ts (tool inputs/results, bilingual)
src/data/           api.ts (interface), demoApi.ts (offline), supabaseApi.ts (live), challenges.ts, seed.ts
src/lib/            i18n, store, moderation, countries, format
src/components/     blueprint UI kit, cards, pickers, sheets
supabase/           schema with row-level security, challenge answer key, cleanup job
tests/run.ts        1,403 checks: every tool and option, handbook values, calculator, tables, filters, challenge bank, DB key sync
tests/crosscheck/   independent Python re-implementation of every tool (npm run crosscheck); see VERIFICATION.md
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

# Planet of Engineers · كوكب المهندسين

**The world is engineers… and a few other people.**
*الدنيا عبارة عن مهندسين وشوية ناس تانيين*

A free iOS, iPad and Android app for engineers everywhere, in English and Arabic, with dark and light themes (or follow the phone).

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
2. In the SQL editor, run the files in `supabase/migrations/` in order: `0001_init.sql`, `0002_challenge_keys.sql`, `0003_cron.sql`, `0004_campus.sql` (roles, moderation, universities, mentors, board), `0005_universities.sql` (9,733 universities).
3. Make yourself the owner (once): `select public.set_owner('YourUsername');`
4. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS environment variables, then build with EAS.

No server functions are needed: every rule (text filters, rate limits, reputation, anonymity) runs inside the database. Full steps: [PUBLISHING.md](PUBLISHING.md).

## Moderation

In the app: **Me → Moderation** (shown to staff only).

| Role | Can do |
|---|---|
| **Owner** (you) | Everything below, plus make or remove moderators and university moderators |
| **Moderator** | Review reports everywhere; hide, restore, pin or delete posts; approve training posts and new universities; warn, suspend or ban users (not other moderators or the owner) |
| **University moderator** | The same, but only inside one university's community; warn members, or suspend them for up to 7 days |

Roles live in a table users cannot write; every action is checked on the server and written to the activity log
(Moderation → Log). Suspended or banned users cannot post, and the app shows them the reason.

Make yourself the owner once, in the Supabase SQL editor: `select public.set_owner('YourUsername');`

## Project layout

```
src/app/            screens (Expo Router): onboarding, 5 tabs, tool, converter, calculator, reference, question, ask, salary-share, leaderboard, card,
                    campus, university, community/[id], mentors, opportunities, opportunity-new, practice, feed, moderation
src/tools/          calc.ts + calc-more.ts (pure engineering maths), expr.ts (calculator parser),
                    tables.ts (reference data), defs.ts + defs-more.ts (tool inputs/results, bilingual)
src/data/           api.ts (interface), demoApi.ts (offline), supabaseApi.ts (live), challenges.ts, seed.ts
src/lib/            i18n, store, moderation, countries, format
src/components/     blueprint UI kit, cards, pickers, sheets
supabase/           schema with row-level security, challenge answer key, cleanup job
tests/run.ts        1,403 checks: every tool and option, handbook values, calculator, tables, filters, challenge bank, DB key sync
tests/campus.test.ts  1,163 checks: practice questions (every numeric answer recomputed), university list, board link rules
tests/db/           63 database tests on a local Postgres (roles, moderation scope, sanctions, communities, board): npm run test:db
data/universities/  open university list (Hipo, MIT licence) used to build 0005_universities.sql
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

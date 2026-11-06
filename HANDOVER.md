# Planet of Engineers: handover

Everything a new conversation (or developer) needs to continue Planet of Engineers. No secrets are in this file.

## 1. What it is

**Planet of Engineers / كوكب المهندسين**: a free mobile app (Android and iOS, Expo / React Native) that is a home for
engineers and engineering students: offline calculators, Q&A between engineers ("Site SOS"), anonymous salary data, a
daily challenge, and (version 1.1) **Campus** for students and **in-app moderation**. English and Arabic (right-to-left),
dark and light themes. Slogan: "The world is engineers… and a few other people."

- Repository: `github.com/mohamed-abokhatwa/planet-of-engineers` (public; `main`)
- Package / bundle ID: **com.abokhatwa.planetofengineers**
- Expo project: `@abokhatwa/planet-of-engineers` (Expo account **abokhatwa**)
- Database: Supabase project **planet-of-engineers**, ref `iflatdqhvnxedipcxuab` (eu-west-1, free plan)
- Public pages (GitHub Pages from `docs/`): https://abokhatwa.com/planet-of-engineers/ (privacy, terms, support)
- Support e-mail: mohamed.abokhatwa@hotmail.com
- Commit identity: `git -c user.email=mohamed.abokhatwa@hotmail.com -c user.name="Mohamed"`
- Current version: **1.1.0** (Android build 3, `.aab` sent to the owner on 4 Nov 2026)

## 2. Features

**Toolbox (offline):** 47 calculators (structural, civil quantities, electrical, mechanical/HVAC, process, surveying),
scientific calculator, 17-category unit converter, reference tables; search, favourites, remembered inputs, copy/share.
Every formula is checked against handbook values and an independent Python implementation (`tests/crosscheck/`).

**Site SOS:** ask with a photo, answer, vote, accept; reputation and levels; report and block on every post; three
reports hide a post; text filters block contact details, links, scams and abuse (on the phone and in the database).

**Salary Compass:** anonymous salaries by country, discipline and experience; shown only with ≥ 5 entries.

**Daily Challenge:** one question a day for everyone (UTC), streaks, weekly leaderboard.

**Campus (1.1):**
- University communities: **9,733 universities in 198 countries** (open Hipo list, MIT licence, medical/non-engineering
  colleges filtered out); search by name or e-mail domain; request a missing university (moderators approve);
  community feed with pinned posts; small communities also show their country's student questions.
- **Exam practice:** 90 questions in 10 subjects (maths, statics, circuits, strength, fluids, thermodynamics, concrete,
  soil, engineering economics, ethics & safety), English and Arabic, answers spread evenly over A–D; best scores on the
  phone. Every numeric answer is recomputed in the tests.
- **Mentors:** engineers with 3+ years can list themselves with a short note; students ask them directly ("Asked to you").
- **Training and jobs board:** summer training, internships, graduate programmes, jobs; https application links only
  (no short or chat links); posts from members under 50 reputation wait for moderator approval; report/block.
- Graduation-project questions; student, my-university and university-ranking leaderboards.

**Moderation (1.1), Me → Moderation (staff only):**
- Roles: **owner** (all, plus grants/revokes roles), **moderator** (everywhere), **university moderator** (one
  community only; warn, or suspend members ≤ 7 days, no bans). Nobody can act on the owner; moderators can't act on
  moderators.
- Queue (reports, pending board posts, university requests), hide / restore / pin / delete, warn / suspend / ban / lift,
  team list, activity log. Users see their warnings and suspensions; suspended users can't post.
- Roles live in table `staff` that users cannot write; every action is checked in the database.

**Account:** anonymous sign-in (no e-mail/phone); Me → Delete my account & data removes everything immediately.

## 3. Backend (Supabase, no server functions)

- Migrations (`supabase/migrations/`), all applied to the live project:
  `0001_init` (schema, row-level security, photo bucket), `0002_challenge_keys`, `0003_cron` (daily cleanup),
  `0004_campus` (roles, sanctions, audit log, universities, communities, mentors, board, leaderboards, moderation),
  `0005_universities` (seed, applied 4 Nov 2026).
- All writes go through `security definer` functions that validate input; old app versions keep working (old function
  signatures kept). The new app falls back to the old calls if the database ever lacks a new function.
- **Owner not set yet.** When the owner has created the profile **abokhatwa** in the app, run in the SQL editor:
  `select public.set_owner('abokhatwa');` (it refuses if the username does not exist). Do not pre-assign it.
- Apply future migrations with `python3 scripts/apply-migrations.py <files>` (needs `SUPABASE_ACCESS_TOKEN` and
  `PROJECT_REF` in the environment) or the GitHub workflow **Database update**.

## 4. Builds and stores

- EAS build: `npx eas-cli@latest build --platform android --profile production` (needs `EXPO_TOKEN`; versionCode
  increases automatically, `appVersionSource: remote`). EAS env vars hold `EXPO_PUBLIC_SUPABASE_URL` and the anon key;
  store builds refuse to run without them (`EXPO_PUBLIC_REQUIRE_BACKEND=1`).
- GitHub workflows (manual): **Android release** (tests + EAS build, .aab as artifact; needs secret `EXPO_TOKEN`),
  **iOS release** (EAS build + TestFlight; needs `EXPO_TOKEN` and Apple API-key secrets), **Database update**
  (needs `SUPABASE_ACCESS_TOKEN`), keep-alive ping (keeps the free database awake).
- Store text, Data safety answers, age rating, review notes, "What's new 1.1": `store/LISTING.md`; screenshots in
  `store/screenshots/`.
- Google Play: new personal accounts need a **closed test with 12 testers for 14 days** before production.

## 5. Tests

| Command | Checks |
|---|---|
| `npm test` | 1,403 tool/filter/challenge checks + 1,163 campus checks (practice answers recomputed, university list, link rules) |
| `npm run test:db` | 63 database tests on a local Postgres set up like Supabase (roles, moderation scope, sanctions, communities, board) |
| `npm run crosscheck` | every calculator against an independent Python implementation |
| `npx tsc --noEmit`, `npx expo lint` | types and lint |

Browser test of Campus and moderation in English and Arabic: 15/15 passed (demo mode, web export).

## 6. Layout

```
src/app/         screens (Expo Router): onboarding, tabs (Planet, Tools, SOS, Salary, Me), question, ask, tool, converter,
                 calculator, reference, salary-share, leaderboard, card, campus, university, community/[id], mentors,
                 opportunities, opportunity-new, practice, feed, moderation
src/data/        api.ts (interface), supabaseApi.ts (live), demoApi.ts (offline demo), practice.ts, challenges.ts, seeds
src/lib/         i18n.ts + i18n-campus.ts (en/ar), store, moderation filters, countries, format
src/tools/       calculators and tables
supabase/        migrations
tests/           run.ts, campus.test.ts, db/ (local Postgres harness), crosscheck/
data/universities/  university list source + licence; scripts/gen-universities.ts builds 0005
```

## 7. Open items

- Google Play: internal test → closed test (12 testers, 14 days) → production (see the steps in the overview file).
- Set the owner (`set_owner('abokhatwa')`) after the owner's profile exists.
- iOS: Apple Developer account and secrets, then the iOS release workflow.
- Optional: Sentry DSN for crash reports (`EXPO_PUBLIC_SENTRY_DSN`).

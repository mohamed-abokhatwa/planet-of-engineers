# Publishing Planet of Engineers

Same path as Bil-Ghayb, with one difference: **no server functions to deploy**. Everything runs inside the database.

Your existing accounts cover this app too: Apple ($99/year) and Google Play ($25 once) allow unlimited apps, and Expo is the same account.

## 1. Public pages (2 minutes)

1. Make this repository public: GitHub → Settings → General → Danger Zone → Change visibility.
2. Settings → Pages → Deploy from a branch → `main` / `/docs` → Save. Leave "Custom domain" empty.
3. Check: https://abokhatwa.com/planet-of-engineers/ , `/privacy.html` , `/terms.html`

## 2. Database (10 minutes, free)

The Supabase free plan includes **2 projects**. Bil-Ghayb uses one; this is the second.

1. Supabase → New project `planet-of-engineers` (Free plan).
2. Authentication → Sign In / Providers → **Allow anonymous sign-ins** → Save.
3. SQL Editor → run, in order:
   - `supabase/migrations/0001_init.sql` (tables, security, photo storage)
   - `supabase/migrations/0002_challenge_keys.sql` (Daily Challenge answers)
   - `supabase/migrations/0003_cron.sql` (daily cleanup)
   - `supabase/migrations/0004_campus.sql` (roles and moderation, universities and communities, mentors, training board)
   - `supabase/migrations/0005_universities.sql` (9,733 universities; about 0.9 MB, run it on its own)
   - then, once, `select public.set_owner('YourUsername');` to make yourself the owner (use the username you chose in the app)
4. Copy the **Project URL** and **Publishable / anon** key (safe to share).

## 3. Build

```bash
npx eas-cli@latest init
```

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_URL --environment production --environment preview --visibility plaintext
```

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_KEY --environment production --environment preview --visibility plaintext
```

```bash
npx eas-cli@latest build --platform android --profile production
```

```bash
npx eas-cli@latest build --platform ios --profile production
```

## 4. Store review notes

- **User-generated content (Apple 1.2):** terms agreement in onboarding (zero tolerance), automatic filters, report and block on every post, auto-hide at 3 reports, `moderation_queue` reviewed daily, support email in the app.
- **Account deletion (Apple 5.1.1(v)):** Me → Delete my account & data.
- **Photos:** only from the photo library, only when the user attaches one. Permission text explains this.
- **Engineering disclaimer:** shown on every calculator and in the Terms.
- **Age rating:** 12+ (user-generated content).
- **Login:** none needed (anonymous account created automatically).

## 5. Daily moderation (5 minutes)

Open the app → **Me → Moderation → Queue**: reported posts, training posts waiting for approval and requests for
missing universities. Team and Log show who can moderate and everything they did. The SQL view
`moderation_queue` still works in the Supabase SQL editor.

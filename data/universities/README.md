# Universities

`world_universities_and_domains.json` is the open *University Domains and Names* list by Hipo
(https://github.com/Hipo/university-domains-list), MIT licence (see `LICENSE.txt`).

`scripts/gen-universities.ts` filters out institutions that clearly teach no engineering (medical, nursing,
dental, pharmacy, music, art, theology, police and similar colleges), removes duplicates and writes
`supabase/migrations/0005_universities.sql`. Missing universities can be requested in the app and approved by a
moderator.

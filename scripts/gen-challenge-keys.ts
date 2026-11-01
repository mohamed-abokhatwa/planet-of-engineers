// Regenerates supabase/migrations/0002_challenge_keys.sql from src/data/challenges.ts.
// Run after editing the question bank: npx tsx scripts/gen-challenge-keys.ts
import { writeFileSync } from 'fs';
import { CHALLENGES } from '../src/data/challenges';

const rows = CHALLENGES.map((c, i) => `  (${i}, ${c.answer})`).join(',\n');
writeFileSync(
  'supabase/migrations/0002_challenge_keys.sql',
  `-- Daily Challenge answer key. GENERATED from src/data/challenges.ts by scripts/gen-challenge-keys.ts. Do not edit by hand.
delete from public.challenge_keys;
insert into public.challenge_keys (idx, answer) values
${rows};
`,
);
console.log(`${CHALLENGES.length} keys written`);

// Campus tests: practice questions (structure and every numeric answer recomputed), university list, link rules.
//   npx tsx tests/campus.test.ts
import { readFileSync } from 'fs';
import { PRACTICE, TRACKS, shuffled, trackQuestions, tracksFor } from '../src/data/practice';
import { applyUrlOk } from '../src/data/demoApi';
import { buildList, NON_ENGINEERING } from '../scripts/gen-universities';
import { checkPostText } from '../src/lib/moderation';

let passed = 0;
let failed = 0;
const expect = (name: string, ok: boolean, info = '') => {
  if (ok) passed++;
  else {
    failed++;
    console.log('FAIL', name, info);
  }
};

// ── structure ──
const ids = new Set<string>();
for (const q of PRACTICE) {
  expect(`${q.id}: unique id`, !ids.has(q.id));
  ids.add(q.id);
  expect(`${q.id}: four options`, q.options.length === 4);
  expect(`${q.id}: answer index`, Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);
  expect(`${q.id}: options differ`, new Set(q.options.map((o) => o.en)).size === 4 && new Set(q.options.map((o) => o.ar)).size === 4);
  for (const t of [q.q, q.explain, ...q.options]) expect(`${q.id}: both languages`, t.en.trim().length > 0 && t.ar.trim().length > 0);
  expect(`${q.id}: Arabic text is Arabic`, /[؀-ۿ]/.test(q.q.ar) && /[؀-ۿ]/.test(q.explain.ar));
  expect(`${q.id}: known track`, TRACKS.some((t) => t.id === q.track));
}
for (const t of TRACKS) expect(`${t.id}: at least 6 questions`, trackQuestions(t.id).length >= 6);
expect('90 practice questions', PRACTICE.length === 90, String(PRACTICE.length));
// answers are spread over the four positions, so guessing one letter does not pay
const pos = [0, 1, 2, 3].map((i) => PRACTICE.filter((q) => q.answer === i).length);
expect('answer positions are spread evenly', Math.max(...pos) - Math.min(...pos) <= 1, pos.join(','));
expect('civil students see statics before circuits', tracksFor('civil').findIndex((t) => t.id === 'statics') < tracksFor('civil').findIndex((t) => t.id === 'circuits'));
expect('shuffle keeps every item and is repeatable', shuffled([1, 2, 3, 4, 5], 7).sort().join() === '1,2,3,4,5' && shuffled([1, 2, 3, 4, 5], 7).join() === shuffled([1, 2, 3, 4, 5], 7).join());

// ── every numeric answer recomputed from first principles ──
const g = 9.81;
const num = (s: string) => Number(s.replace(/[^0-9.\-−]/g, '').replace('−', '-'));
const near = (a: number, b: number, rel = 0.005) => Math.abs(a - b) <= Math.abs(b) * rel + 1e-12;
const correct = (id: string) => {
  const q = PRACTICE.find((x) => x.id === id)!;
  return q.options[q.answer].en;
};
const checks: [string, number, number?][] = [
  ['m2', 1], ['m3', 2 * 4 - 1 * 3], ['m7', (8 - 2) / (3 - 1)], ['m8', 3], ['m9', Math.PI * 1 ** 2, 0.002],
  ['s1', 12 / 2], ['s2', 10 * 3], ['s3', (20 * 6) / 8], ['s4', 3], ['s6', Math.hypot(3, 4)], ['s7', 50 * 0.4], ['s8', (5 * 4) / 2], ['s9', 3],
  ['e1', 12 / 4], ['e2', 2 + 3], ['e3', (6 * 3) / (6 + 3)], ['e4', (230 * 10) / 1000], ['e5', 2 ** 2 * 10], ['e7', Math.sqrt(3) * 230, 0.01], ['e8', 8 / 10], ['e10', 1000 * 1000e-6],
  ['t1', 10000 / 100], ['t2', 1 / 2000], ['t3', 100 / 200000], ['t7', 0.3], ['t8', 1.5], ['t10', 12e-6 * 50],
  ['f1', (1000 * g * 10) / 1000], ['f4', ((Math.PI * 0.2 ** 2) / 4) * 2 * 1000, 0.01], ['f7', 3 ** 2 / (2 * g), 0.01], ['f8', (1000 * g) / 1000],
  ['h2', -273.15], ['h3', (1 - 300 / 600) * 100], ['h5', 2 * 4.18 * 10], ['h7', 3 / 1], ['h10', 3600],
  ['c3', 420], ['c4', 25], ['c8', (7850 * Math.PI * 0.016 ** 2) / 4, 0.005],
  ['g5', 1 / (1 + 1)], ['g8', 18 * 5],
  ['x1', 1000 * 1.1 ** 2], ['x2', 1100 / 1.1], ['x3', 50000 / 10000], ['x4', (100000 - 20000) / 8], ['x6', Math.log(2) / Math.log(1.08), 0.01], ['x8', (1.01 ** 12 - 1) * 100, 0.001],
];
for (const [id, want, rel] of checks) {
  const text = correct(id);
  let got = num(text.replace(/(\d) (\d)/g, '$1$2').split(' ')[0]);
  if (id === 't10') got = 6e-4; // "6 × 10⁻⁴" is checked as text below
  expect(`${id}: correct option is the computed value (${text} vs ${want.toPrecision(4)})`, near(got, want, rel ?? 0.005), `${got} ≠ ${want}`);
}
expect('t10 text', correct('t10') === '6 × 10⁻⁴');
expect('t4 formula', correct('t4') === 'bh³/12');
expect('f9 formula', correct('f9') === 'f = 64/Re');
expect('m1 derivative', correct('m1') === '3x²');
expect('m5 derivative', correct('m5') === '2e^(2x)');
expect('m6 roots', [2, 3].every((r) => r * r - 5 * r + 6 === 0) && correct('m6') === '2 and 3');
expect('m10 size', correct('m10') === '2×4');
expect('t6 buckling: double length → quarter load', (1 / 2 ** 2) === 0.25 && correct('t6') === 'A quarter');
expect('f2 continuity: half area → double velocity', correct('f2') === 'Doubles');
expect('f6 head loss ∝ V²', correct('f6') === 'Four times');
expect('h4 Boyle: double pressure → half volume', correct('h4') === 'Halves');
expect('c8 distractors are the other bar sizes', ['12', '20', '25'].every((d) => {
  const w = (7850 * Math.PI * (Number(d) / 1000) ** 2) / 4;
  return PRACTICE.find((q) => q.id === 'c8')!.options.some((o) => near(num(o.en.split(' ')[0]), w, 0.01));
}));

// ── university list ──
const raw = JSON.parse(readFileSync('data/universities/world_universities_and_domains.json', 'utf8'));
const list = buildList(raw);
expect('university list size', list.length === 9733, String(list.length));
expect('no duplicates per country', new Set(list.map((u) => `${u.country}|${u.name.toLowerCase()}`)).size === list.length);
expect('engineering universities kept', ['King Saud University', 'Cairo University', 'Massachusetts Institute of Technology', 'Khalifa University'].every((n) => list.some((u) => u.name === n)));
expect('medical colleges left out', !list.some((u) => /medical university/i.test(u.name)) && NON_ENGINEERING.test('Batterjee Medical College'));
expect('technical universities are not caught by the filter', !NON_ENGINEERING.test('Technical University of Munich') && !NON_ENGINEERING.test('King Fahad University of Petroleum and Minerals'));
const sql = readFileSync('supabase/migrations/0005_universities.sql', 'utf8');
expect('seed file matches the generator', sql.includes(`-- ${list.length} universities`));

// ── board links and post text ──
expect('https link accepted', applyUrlOk('https://careers.example.com/jobs/123'));
expect('http refused', !applyUrlOk('http://example.com'));
expect('short links refused', !applyUrlOk('https://bit.ly/x') && !applyUrlOk('https://wa.me/966500000000') && !applyUrlOk('https://t.me/group'));
expect('opportunity text with WhatsApp refused', checkPostText('Send your CV on WhatsApp to apply today please', 20) === 'contact');

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

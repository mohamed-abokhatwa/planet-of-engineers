// Sample content for demo mode only. Never used in store builds.
import type { Answer, Author, Discipline, Question, YearsBand } from '../lib/types';

const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
const a = (handle: string, discipline: Discipline, country: string, reputation: number): Author => ({ handle, discipline, country, reputation });

export const AUTHORS = {
  khaled: a('khaled.structures', 'structural', 'SA', 2140),
  mona: a('eng_mona', 'electrical', 'EG', 830),
  omar: a('omar_mep', 'mechanical', 'AE', 410),
  sara: a('sara.civil', 'civil', 'JO', 1260),
  yusuf: a('yusuf_site', 'civil', 'EG', 95),
  dev: a('aisha.dev', 'software', 'MY', 560),
  hassan: a('hassan_pe', 'petroleum', 'KW', 1720),
};

type Seed = Omit<Question, 'myVote' | 'isMine'>;
const q = (id: string, author: Author, discipline: Discipline, title: string, body: string, score: number, answerCount: number, hours: number, accepted: string | null = null): Seed => ({
  id, author, discipline, title, body, imageUrl: null, score, answerCount, acceptedAnswerId: accepted, createdAt: ago(hours),
});

export const SEED_QUESTIONS: Seed[] = [
  q('q1', AUTHORS.yusuf, 'civil', 'Hairline cracks in a slab 3 days after casting. Normal?',
    'Ground-floor slab, 200 mm, C30. Very fine random cracks appeared on the surface on day 3, mostly near the edges. It was 41 °C and windy during the pour and curing started late (about 6 hours). Is this plastic shrinkage, and do I need to do anything?', 14, 2, 3, 'a1'),
  q('q2', AUTHORS.mona, 'electrical', 'MCB keeps tripping only when the AC and water heater run together',
    'Residential DB, 32 A MCB type C feeding a 2.5 mm² circuit with a 1.5 TR split AC and a 2 kW water heater. Trips after 10–15 minutes when both run. Is the cable undersized or is this normal overload?', 9, 1, 7),
  q('q3', AUTHORS.omar, 'mechanical', 'Chilled water pipe velocity: 1.5 or 2.5 m/s for a 100 m main?',
    'Sizing a CHW main for 180 m³/h. Design guide says up to 3 m/s for large pipes but I’m worried about noise and pump head. What do you use in practice?', 6, 0, 12),
  q('q4', AUTHORS.sara, 'civil', 'سؤال: أقل غطاء خرساني للقواعد الملامسة للتربة؟',
    'في قواعد منفصلة ملامسة للتربة مباشرة بدون خرسانة نظافة، ما هو أقل غطاء خرساني مسموح به حسب الكود؟ وهل يختلف لو فيه خرسانة عادية تحت القاعدة؟', 11, 1, 20),
  q('q5', AUTHORS.dev, 'software', 'Offline-first sync for a site inspection app: what conflicts strategy?',
    'Inspectors work without signal for hours, then sync. Two inspectors can edit the same checklist. Last-write-wins loses data. CRDTs feel heavy. What have you used in the field?', 4, 0, 30),
  q('q6', AUTHORS.hassan, 'petroleum', 'H2S monitoring: 10 ppm alarm or lower for new crews?',
    'Our site sets low alarm at 10 ppm and high at 15 ppm. A new HSE lead wants 5 ppm low alarm. Is there any downside apart from more alarms?', 7, 0, 44),
  q('q7', AUTHORS.yusuf, 'civil', 'كيف أحسب كمية الحديد في سقف فلات سلاب ١٢×١٥ م؟',
    'محتاج طريقة سريعة لتقدير وزن الحديد لسقف فلات سلاب سمك ٢٥ سم قبل ما يوصل التصميم النهائي، عشان أعمل طلبية مبدئية.', 5, 0, 52),
];

export const SEED_ANSWERS: Omit<Answer, 'myVote' | 'isMine'>[] = [
  {
    id: 'a1', questionId: 'q1', author: AUTHORS.khaled, score: 18, accepted: true, createdAt: ago(2),
    body: 'Classic plastic shrinkage: hot, windy, late curing. Random pattern and shallow depth confirm it. Structurally they’re usually harmless, but seal them so they don’t let moisture and chlorides in: low-viscosity epoxy or a penetrating sealer for widths above ~0.2 mm. Next time: evaporation retarder or fog spraying right after finishing, windbreaks, and start curing within 30–60 minutes.',
  },
  {
    id: 'a2', questionId: 'q1', author: AUTHORS.sara, score: 6, accepted: false, createdAt: ago(1.5),
    body: 'Agree with Khaled. Check that cracks aren’t widening over the next week. Mark the ends with a pencil and date. If they grow, it’s something else (settlement or restraint) and needs a proper look.',
  },
  {
    id: 'a3', questionId: 'q2', author: AUTHORS.mona, score: 3, accepted: false, createdAt: ago(5),
    body: 'Quick numbers: 1.5 TR AC draws ~8–9 A running, water heater 2000/230 ≈ 8.7 A. Total ~18 A, well under 32 A. A 32 A breaker on 2.5 mm² is actually too big for the cable in most codes (usually 20 A). Check for a loose termination heating the breaker, and get the circuit split.',
  },
  {
    id: 'a4', questionId: 'q4', author: AUTHORS.khaled, score: 9, accepted: false, createdAt: ago(18),
    body: 'معظم الأكواد (مثل ACI 318) تشترط 75 مم للخرسانة المصبوبة مباشرة على التربة والمعرضة لها بشكل دائم. لو فيه خرسانة نظافة فالغطاء المطلوب أقل (حوالي 50 مم حسب الكود). راجع الكود المعتمد عندك لأن القيم بتختلف حسب درجة التعرض.',
  },
];

// Demo salary generator: plausible monthly gross ranges by country (local currency).
const BASE: Record<string, [number, number, number, number, number]> = {
  SA: [7500, 11000, 16000, 22000, 30000],
  EG: [15000, 27000, 45000, 70000, 110000],
  AE: [9000, 13500, 20000, 28000, 38000],
  KW: [700, 1000, 1450, 1900, 2600],
  QA: [9500, 14000, 20500, 28000, 37000],
  JO: [550, 800, 1150, 1600, 2300],
  GB: [2600, 3300, 4200, 5100, 6200],
  US: [6200, 7600, 9300, 11000, 13500],
};
const MULT: Partial<Record<Discipline, number>> = { software: 1.18, petroleum: 1.32, architecture: 0.9, chemical: 1.08, electrical: 1.03, industrial: 0.97 };
const BANDS: YearsBand[] = ['0-2', '3-5', '6-10', '11-15', '16+'];

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return (s % 10000) / 10000;
  };
}

export function demoSalaries(country: string, discipline: Discipline) {
  const base = BASE[country];
  if (!base) return [] as { band: YearsBand; amount: number }[];
  const out: { band: YearsBand; amount: number }[] = [];
  const r = rand(country.charCodeAt(0) * 131 + country.charCodeAt(1) * 7 + discipline.length * 97);
  BANDS.forEach((band, i) => {
    const n = 4 + Math.floor(r() * 9); // some bands fall below the 5-entry threshold on purpose
    for (let k = 0; k < n; k++) out.push({ band, amount: Math.round(base[i] * (MULT[discipline] ?? 1) * (0.78 + r() * 0.5)) });
  });
  return out;
}

export const DEMO_PLANET = {
  countries: [
    ['EG', 4120], ['SA', 3380], ['AE', 1510], ['JO', 840], ['PK', 760], ['IN', 690], ['KW', 410], ['QA', 380], ['MA', 350], ['TR', 300], ['GB', 270], ['US', 240],
  ] as [string, number][],
  disciplines: [
    ['civil', 5400], ['mechanical', 2600], ['electrical', 2450], ['architecture', 1300], ['software', 1100], ['chemical', 640], ['structural', 900], ['petroleum', 520], ['industrial', 480], ['general', 310],
  ] as [Discipline, number][],
};

export const DEMO_LEADERS: { handle: string; discipline: Discipline; country: string; points: number }[] = [
  { handle: 'khaled.structures', discipline: 'structural', country: 'SA', points: 7 },
  { handle: 'eng_mona', discipline: 'electrical', country: 'EG', points: 7 },
  { handle: 'hassan_pe', discipline: 'petroleum', country: 'KW', points: 6 },
  { handle: 'sara.civil', discipline: 'civil', country: 'JO', points: 6 },
  { handle: 'omar_mep', discipline: 'mechanical', country: 'AE', points: 5 },
  { handle: 'aisha.dev', discipline: 'software', country: 'MY', points: 4 },
  { handle: 'yusuf_site', discipline: 'civil', country: 'EG', points: 3 },
];

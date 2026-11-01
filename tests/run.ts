// Run with: npm test
// Engineering calculators are checked against known reference values.
import {
  cableSizeForDrop,
  concreteMaterials,
  convert,
  currentFromPower,
  frictionFactor,
  pipePressureDrop,
  powerFromCurrent,
  pumpPower,
  rebarKgPerM,
  rebarQuantity,
  slope,
  voltageDrop,
  area,
} from '../src/tools/calc';
import { checkPostText, isValidHandle } from '../src/lib/moderation';
import { CHALLENGES } from '../src/data/challenges';
import { initials } from '../src/lib/handle';
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;
function near(name: string, got: number, want: number, relTol = 0.01) {
  const ok = Number.isFinite(got) && Math.abs(got - want) <= Math.abs(want) * relTol + 1e-9;
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}: got ${got}, want ≈ ${want}`);
  }
}
function expect(name: string, ok: boolean) {
  if (ok) passed++;
  else {
    failed++;
    console.log('FAIL', name);
  }
}

// Units
near('1 psi in kPa', convert(1, 'pressure', 'psi', 'kPa'), 6.894757, 1e-6);
near('1 MPa in psi', convert(1, 'pressure', 'MPa', 'psi'), 145.0377, 1e-5);
near('100 °F in °C', convert(100, 'temperature', 'F', 'C'), 37.7778, 1e-5);
near('0 °C in K', convert(0, 'temperature', 'C', 'K'), 273.15, 1e-9);
near('1 feddan in m²', convert(1, 'area', 'feddan', 'm2'), 4200.83, 1e-6);
near('1 TR in kW', convert(1, 'power', 'TR', 'kW'), 3.51685, 1e-5);
near('1 ton-force in kN', convert(1, 'force', 'tf', 'kN'), 9.80665, 1e-9);
near('1 kip in kN', convert(1, 'force', 'kip', 'kN'), 4.44822, 1e-5);
near('1 gpm in L/min', convert(1, 'flow', 'gpm', 'Lmin'), 3.78541, 1e-5);
near('1 ft in mm', convert(1, 'length', 'ft', 'mm'), 304.8, 1e-9);
near('1 kWh in BTU', convert(1, 'energy', 'kWh', 'BTU'), 3412.14, 1e-5);
near('round trip kgf/cm² ↔ bar', convert(convert(10, 'pressure', 'kgfcm2', 'bar'), 'pressure', 'bar', 'kgfcm2'), 10, 1e-9);

// Rebar: 16 mm ≈ 1.578 kg/m, 12 mm ≈ 0.888 kg/m, d²/162.2 rule
near('rebar 16 mm kg/m', rebarKgPerM(16), 1.578, 0.002);
near('rebar 12 mm kg/m', rebarKgPerM(12), 0.888, 0.002);
near('rebar 25 mm vs d²/162.2', rebarKgPerM(25), 625 / 162.2, 0.002);
const rq = rebarQuantity(16, 10, 12, 40);
near('rebar 10 × 12 m of 16 mm', rq.totalKg, 189.4, 0.003);
near('lap length 40d', rq.lapLengthMm, 640, 1e-9);

// Concrete 1:2:4 per m³ (no waste): ~6.34 bags of 50 kg, 0.44 m³ sand, 0.88 m³ gravel
const c = concreteMaterials(1, [1, 2, 4], 50, 0);
near('cement bags 1:2:4', c.cementBags, 6.336, 0.002);
near('sand 1:2:4', c.sandM3, 0.44, 0.001);
near('gravel 1:2:4', c.gravelM3, 0.88, 0.001);
near('waste adds 5%', concreteMaterials(1, [1, 2, 4], 50, 0.05).volumeWithWaste, 1.05, 1e-9);

// Electrical
near('3-phase current 55 kW 400 V pf .85', currentFromPower(55000, 400, 0.85, 3), 93.39, 0.002);
near('1-phase current 2.3 kW 230 V pf 1', currentFromPower(2300, 230, 1, 1), 10, 1e-9);
near('3-phase power 100 A 400 V pf .8', powerFromCurrent(100, 400, 0.8, 3).activeW, 55425.6, 0.001);
const vd = voltageDrop(100, 100, 35, 400, 0.85, 3, 'copper');
near('voltage drop 3φ 100 A 100 m 35 mm²', vd.dropV, 9.462, 0.003);
near('voltage drop %', vd.percent, 2.366, 0.003);
const cs = cableSizeForDrop(100, 100, 400, 0.85, 3, 'copper', 3);
expect('cable size for 3% is 35 mm²', cs?.areaMm2 === 35);
expect('impossible drop returns null', cableSizeForDrop(5000, 5000, 230, 1, 1, 'aluminium', 1) === null);

// Fluids: water 10 m³/h, DN50, 100 m steel → ~1.41 m/s, f ≈ 0.0229, ~45.7 kPa
const p = pipePressureDrop(10, 50, 100, 0.045);
near('pipe velocity', p.velocity, 1.4147, 0.002);
near('Reynolds', p.reynolds, 70450, 0.005);
near('friction factor', p.friction, 0.02286, 0.01);
near('pressure drop kPa', p.dpKPa, 45.7, 0.015);
expect('turbulent regime', p.regime === 'turbulent');
near('laminar friction 64/Re', frictionFactor(1000, 0.001), 0.064, 1e-9);
const pp = pumpPower(36, 30, 0.7);
near('pump hydraulic kW', pp.hydraulicKW, 2.938, 0.003);
near('pump shaft kW', pp.shaftKW, 4.197, 0.003);

// General
near('slope 1:100 = 1%', slope(1, 100).percent, 1, 1e-9);
near('slope 45°', slope(1, 1).degrees, 45, 1e-9);
near('circle d=2 area', area.circle(2), Math.PI, 1e-9);
near('trapezoid', area.trapezoid(2, 4, 3), 9, 1e-9);

// Community safety
expect('phone blocked', checkPostText('Call me on 0551234567 for this job please', 10) === 'contact');
expect('whatsapp blocked', checkPostText('Contact me on whatsapp for the drawings', 10) === 'contact');
expect('email blocked', checkPostText('Send the file to eng.ali@gmail.com thanks', 10) === 'contact');
expect('technical numbers allowed', checkPostText('Slab 250 mm thick, fc 30 MPa, span 6.5 m. Is deflection OK?', 10) === null);
expect('arabic technical allowed', checkPostText('سقف بسماكة ٢٥ سم وبحر ٦ متر، هل التسليح كافي؟', 10) === null);
expect('too short', checkPostText('help', 10) === 'too_short');
expect('handle ok', isValidHandle('eng_ahmed'));
expect('handle with phone blocked', !isValidHandle('ali0551234567'));
expect('handle too short', !isValidHandle('ab'));

// Avatar initials skip common prefixes
expect('initials eng_mohamed', initials('eng_mohamed') === 'MO');
expect('initials khaled.structures', initials('khaled.structures') === 'KH');

// Daily challenge bank is well-formed
expect('at least 30 challenges', CHALLENGES.length >= 30);
for (const [i, q] of CHALLENGES.entries()) {
  expect(`challenge ${i} has 4 options`, q.options.length === 4);
  expect(`challenge ${i} answer in range`, q.answer >= 0 && q.answer < 4);
  expect(`challenge ${i} bilingual`, !!q.q.en && !!q.q.ar && !!q.explain.en && !!q.explain.ar && q.options.every((o) => !!o.en && !!o.ar));
}

// The database answer key must match the app's question bank
const keysSql = readFileSync('supabase/migrations/0002_challenge_keys.sql', 'utf8');
const keys = [...keysSql.matchAll(/\((\d+), (\d)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
expect('answer key has every question', keys.length === CHALLENGES.length);
expect('answer key matches bank', keys.every(([i, a]) => CHALLENGES[i]?.answer === a));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

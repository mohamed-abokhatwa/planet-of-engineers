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
import * as M from '../src/tools/calc-more';
import { evaluate, formatResult } from '../src/tools/expr';
import { CHALLENGES } from '../src/data/challenges';
import { initials } from '../src/lib/handle';
import { readFileSync } from 'fs';
import { TOOLS, findTool } from '../src/tools/defs';
import * as TB from '../src/tools/tables';

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
near('voltage drop 3φ 100 A 100 m 35 mm² (R cosφ + X sinφ)', vd.dropV, 10.194, 0.001);
near('voltage drop %', vd.percent, 2.549, 0.001);
near('voltage drop pf 1 is purely resistive', voltageDrop(100, 100, 35, 400, 1, 3, 'copper').dropV, Math.sqrt(3) * 100 * 100 * 0.0225 / 35, 1e-9);
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

// ── More tools ──
// Beams. Simply supported UDL: w=10 kN/m, L=6 m → M=45 kN·m, V=30 kN. E=200 GPa, I=8356 cm⁴ (IPE 300):
// δ = 5wL⁴/384EI = 5·10·6000⁴/(384·200000·8.356e7) = 10.10 mm
let b = M.beam('simple', 'udl', 10, 6, 200, 8356);
near('beam SS UDL moment', b.moment, 45, 1e-9);
near('beam SS UDL shear', b.shear, 30, 1e-9);
near('beam SS UDL deflection', b.deflection, 10.10, 0.003);
b = M.beam('simple', 'point', 20, 4, 200, 8356); // PL/4 = 20, δ = PL³/48EI = 20000·4000³/(48·200000·8.356e7)
near('beam SS point moment', b.moment, 20, 1e-9);
near('beam SS point deflection', b.deflection, (20000 * 4000 ** 3) / (48 * 200000 * 8.356e7), 1e-9);
b = M.beam('cantilever', 'udl', 5, 2, 200, 1000);
near('cantilever UDL moment wL²/2', b.moment, 10, 1e-9);
near('cantilever UDL deflection wL⁴/8EI', b.deflection, (5 * 2000 ** 4) / (8 * 200000 * 1e7), 1e-9);
b = M.beam('fixed', 'udl', 12, 5, 30, 50000);
near('fixed UDL support moment wL²/12', b.moment, 25, 1e-9);
near('fixed UDL midspan moment wL²/24', b.momentMid!, 12.5, 1e-9);
// Euler: E=200 GPa, I=8356 cm⁴, L=4 m pinned → π²EI/L² = 1031 kN (approx)
const eu = M.euler(200, 8356, 4, 'pinned', 53.8);
near('euler pinned', eu.Pcr, (Math.PI ** 2 * 200000 * 8.356e7) / 4000 ** 2 / 1000, 1e-9);
near('euler fixed-free is 1/4 of pinned', M.euler(200, 8356, 4, 'fixedFree').Pcr, eu.Pcr / 4, 1e-9);
near('radius of gyration', eu.radiusOfGyration!, Math.sqrt(8.356e7 / 5380), 1e-9);
// Sections
near('rect 300x600 I', M.section('rect', 300, 600).inertia, 5.4e9, 1e-9);
near('rect Z bh²/6', M.section('rect', 300, 600).modulus, 1.8e7, 1e-9);
near('circle d=100 I', M.section('circle', 100).inertia, (Math.PI * 1e8) / 64, 1e-9);
near('tube 114.3x6 area', M.section('tube', 114.3, 6).area, Math.PI * (114.3 - 6) * 6, 1e-9);
// IPE 300 (bf 150, h 300, tf 10.7, tw 7.1): A ≈ 5381 mm² (no root radii), I ≈ 8.36e7 mm⁴ incl. radii → our simple model ≈ 7.98e7
const ipe = M.section('ibeam', 150, 300, 10.7, 7.1);
near('I-beam area', ipe.area, 2 * 150 * 10.7 + (300 - 21.4) * 7.1, 1e-9);
expect('I-beam inertia close to IPE300 (within 6%)', Math.abs(ipe.inertia - 8.356e7) / 8.356e7 < 0.06);
// Rebar spacing: 565 mm²/m with Ø12 → exact 200 mm
const rs = M.rebarSpacing(565.5, 12);
near('rebar spacing Ø12 for 565.5 mm²/m', rs.spacingExact, 200, 0.001);
expect('practical spacing rounds down to 25', rs.spacingPractical === 200 || rs.spacingPractical === 175);
// Masonry: 400x200 block, 10 mm joint → 1/(0.41·0.21) = 11.61 per m²
near('blocks per m²', M.masonry(10, 3, 0, 400, 200, 200, 10, 0).perM2, 11.614, 0.001);
expect('blocks for 30 m² + 5%', M.masonry(10, 3, 0, 400, 200, 200, 10, 0.05).units === Math.ceil(30 * 11.614 * 1.05));
near('tiles 600x600 3 mm per m²', M.tiles(1, 600, 600, 3, 0).perM2, 1 / (0.603 * 0.603), 1e-9);
near('paint 100 m² 2 coats 10 m²/L +10%', M.paintLitres(100, 2, 10), 22, 1e-9);
const ew = M.earthwork(10, 2, 1.5, 25, 10);
near('earthwork bank', ew.bank, 30, 1e-9);
near('earthwork loose', ew.loose, 37.5, 1e-9);
expect('earthwork trucks', ew.trucks === 4);
near('steel plate 2x1 m x 10 mm', M.steelWeight('plate', 2, 1, 10).kg, 157, 1e-9);
near('round bar 20 mm per m', M.steelWeight('round', 20, 1, 0).kgPerM!, 2.466, 0.001);
near('pipe 114.3x6 per m', M.steelWeight('pipe', 114.3, 6, 1).kgPerM!, 15.99, 0.003);
near('SHS 100x5 per m', M.steelWeight('shs', 100, 5, 1).kgPerM!, 14.92, 0.003);
near('tank 2x2x2 litres', M.tankVolume('rect', 2, 2, 2).litres, 8000, 1e-9);
near('cylinder D1 H1 m³', M.tankVolume('cyl', 1, 1, 0).m3, Math.PI / 4, 1e-9);
const st = M.stairs(3000, 175);
expect('stairs risers', st.risers === 18);
near('stairs riser', st.riser, 166.667, 1e-4);
near('stairs going (Blondel 630)', st.going, 296.667, 1e-4);
// Electrical
const oh = M.ohm(12, 2, NaN, NaN)!;
near('ohm R', oh.R, 6, 1e-9);
near('ohm P', oh.P, 24, 1e-9);
near('ohm from R,P', M.ohm(NaN, NaN, 4, 100)!.V, 20, 1e-9);
near('resistors parallel 100||100', M.resistors([100, 100, NaN], 'parallel'), 50, 1e-9);
near('resistors series', M.resistors([10, 20, 30], 'series'), 60, 1e-9);
// PF correction: 100 kW from 0.7 to 0.95 → 100·(1.0202 − 0.3287) = 69.15 kVAr
const pf = M.pfCorrection(100, 0.7, 0.95, 400, 50, 3);
near('pf correction kVAr', pf.kvar, 69.15, 0.002);
near('pf correction µF per phase (delta)', pf.microfarad, ((69.15e3 / 3) / (2 * Math.PI * 50 * 400 * 400)) * 1e6, 0.003);
near('motor current 30 kW 400 V pf .86 eff .93', M.motorCurrent(30, 400, 0.86, 0.93, 3), 54.14, 0.002);
near('energy 2 kW 8 h 30 d', M.energyCost(2, 8, 30, 0.18).kWh, 480, 1e-9);
expect('transformer 400 kW pf .8 +20% → 630 kVA', M.transformerSize(400, 0.8, 20).standardKVA === 630);
near('luminaires 100 m² 500 lx 4000 lm', M.luminaires(100, 500, 4000, 0.6, 0.8), 26.04, 0.002);
near('fault current 1000 kVA 400 V 6%', M.transformerFault(1000, 400, 6), 24.06, 0.002);
near('backup 200 Ah 12 V 300 W', M.backupHours(200, 12, 300, 0.8, 0.9), 5.76, 1e-9);
expect('solar 20 kWh/day 5 h 550 W 20% loss', M.solar(20, 5, 550, 20).panels === 10);
// Mechanical / HVAC
near('cooling 100 m² × 200 W/m²', M.coolingEstimate(100, 200).tr, 5.687, 0.002);
const du = M.duct(3600, 5, 300);
near('duct area 1 m³/s at 5 m/s', du.areaM2, 0.2, 1e-9);
near('duct round diameter', du.roundMm, 504.6, 0.002);
near('duct rect width', du.rectWidthMm, 666.67, 0.001);
near('pipe diameter for 10 m³/h at 1.5 m/s', M.pipeDiameterForVelocity(10, 1.5), 48.56, 0.002);
near('water 10 m³/h ΔT 5 K', M.waterHeatKW(10, 5), 58.02, 0.002);
near('air 3600 m³/h ΔT 10 K', M.airSensibleKW(3600, 10), 12.07, 0.002);
near('pulley 1450 rpm 100→200', M.drive(1450, 100, 200).outputRpm, 725, 1e-9);
near('bolt torque K .2, 50 kN, M16', M.boltTorque(0.2, 50, 16), 160, 1e-9);
near('hydrostatic 10 m water', M.hydrostatic(10, M.FLUIDS.water) / 1000, 97.87, 0.001);
near('fill 10 m³ at 20 m³/h', M.fillTimeMinutes(10, 20), 30, 1e-9);
near('steel 50 m ΔT 40 K', M.thermalExpansionMm(50, 40, M.EXPANSION.steel), 24, 1e-9);
// Process
near('dilution V2', M.dilution(10, 1, 2, NaN).V2, 5, 1e-9);
near('dilution C2', M.dilution(10, 1, NaN, 5).C2, 2, 1e-9);
near('ideal gas 1 mol at STP-ish', M.idealGas(101.325, 0.022414, 0, 28.97).moles, 1, 0.001);
// Survey
const inv = M.inverse(1000, 1000, 1100, 1100);
near('inverse distance', inv.distance, 141.421, 1e-5);
near('inverse bearing NE', inv.bearing, 45, 1e-9);
near('bearing due west', M.inverse(0, 0, -10, 0).bearing, 270, 1e-9);
expect('DMS format', M.toDMS(45.5125) === '45° 30′ 45″');
near('height from angle', M.heightFromAngle(20, 45, 1.5), 21.5, 1e-9);
// Math
near('interpolation', M.interpolate(10, 100, 20, 200, 15), 150, 1e-9);
const qd = M.quadratic(1, -3, 2);
expect('quadratic roots 2 and 1', qd.real && Math.abs((qd as { x1: number }).x1 - 2) < 1e-12 && Math.abs((qd as { x2: number }).x2 - 1) < 1e-12);
expect('quadratic complex', !M.quadratic(1, 0, 1).real);
near('right triangle 3-4-5', M.rightTriangle(3, 4).hypotenuse, 5, 1e-12);

// ── Scientific calculator ──
const ev = (x: string, mode: 'deg' | 'rad' = 'deg', ans = 0) => evaluate(x, mode, ans);
near('precedence 2+3×4', ev('2+3×4'), 14, 1e-12);
near('brackets (2+3)×4', ev('(2+3)×4'), 20, 1e-12);
near('power right-assoc 2^3^2', ev('2^3^2'), 512, 1e-12);
near('unary minus vs power -2^2', ev('-2^2'), -4, 1e-12);
near('negative base (-2)^2', ev('(-2)^2'), 4, 1e-12);
near('division 7÷2', ev('7÷2'), 3.5, 1e-12);
near('unicode minus', ev('10−4'), 6, 1e-12);
near('implicit 2π', ev('2π'), 2 * Math.PI, 1e-12);
near('implicit 3(4+1)', ev('3(4+1)'), 15, 1e-12);
near('sin 30 deg', ev('sin(30)'), 0.5, 1e-12);
near('sin30 without brackets', ev('sin30'), 0.5, 1e-12);
near('cos 60 deg', ev('cos(60)'), 0.5, 1e-12);
near('sin(30)^2 = 0.25', ev('sin(30)^2'), 0.25, 1e-12);
near('2sin(30)', ev('2sin(30)'), 1, 1e-12);
near('sin π/2 rad', ev('sin(π/2)', 'rad'), 1, 1e-12);
near('asin 0.5 deg', ev('asin(0.5)'), 30, 1e-9);
near('sin⁻¹ symbol', ev('sin⁻¹(1)'), 90, 1e-9);
expect('tan 90 deg is undefined', Number.isNaN(ev('tan(90)')));
near('sqrt symbol √16', ev('√16'), 4, 1e-12);
near('√9^2 = 9', ev('√9^2'), 9, 1e-12);
near('√(9+16)', ev('√(9+16)'), 5, 1e-12);
near('x² symbol', ev('5²'), 25, 1e-12);
near('ln e', ev('ln(e)'), 1, 1e-12);
near('log 1000', ev('log(1000)'), 3, 1e-12);
near('factorial 5!', ev('5!'), 120, 1e-12);
near('percent 200×10%', ev('200×10%'), 20, 1e-12);
near('scientific notation 1.5e3', ev('1.5e3+1'), 1501, 1e-12);
near('Ans', ev('Ans×2', 'deg', 21), 42, 1e-12);
near('missing bracket forgiven', ev('(2+3'), 5, 1e-12);
near('g constant', ev('g'), 9.80665, 1e-12);
near('nested functions', ev('sqrt(abs(-16))'), 4, 1e-12);
for (const bad of ['2+', '3×', '(', 'foo(2)', '2..3', '4!!x']) {
  let threw = false;
  try { ev(bad); } catch { threw = true; }
  expect(`invalid input rejected: ${bad}`, threw);
}
expect('format 0.1+0.2', formatResult(ev('0.1+0.2')) === '0.3');
expect('format 1/3', formatResult(1 / 3) === '0.333333333333');
expect('format large', formatResult(6.02214076e23) === '6.02214076e+23');
expect('format division by zero', formatResult(ev('1/0')) === '∞');

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


// ── Every tool works with its default inputs, is bilingual and has a unique id ──
const ids = new Set<string>();
for (const tool of TOOLS) {
  expect(`tool id unique: ${tool.id}`, !ids.has(tool.id));
  ids.add(tool.id);
  expect(`tool bilingual: ${tool.id}`, !!(tool.title.en && tool.title.ar && tool.desc.en && tool.desc.ar && tool.group.en && tool.group.ar));
  const vals = Object.fromEntries(tool.inputs.map((i) => [i.key, i.default]));
  const r = tool.compute(vals);
  expect(`tool computes with defaults: ${tool.id}`, !!r && r.rows.length > 0);
  for (const row of r?.rows ?? []) {
    expect(`tool ${tool.id} row "${row.label.en}" is valid`, typeof row.value !== 'number' || Number.isFinite(row.value));
    expect(`tool ${tool.id} row bilingual`, !!row.label.en && !!row.label.ar);
  }
  // every select option must also compute
  for (const inp of tool.inputs) {
    if (inp.kind !== 'select') continue;
    for (const o of inp.options) {
      expect(`tool ${tool.id} option ${inp.key}=${o.value} bilingual`, !!o.label.en && !!o.label.ar);
      expect(`tool ${tool.id} computes with ${inp.key}=${o.value}`, !!tool.compute({ ...vals, [inp.key]: o.value }));
    }
  }
  // blank input never throws
  for (const inp of tool.inputs) if (inp.kind === 'number') {
    let ok = true;
    try { tool.compute({ ...vals, [inp.key]: NaN }); } catch { ok = false; }
    expect(`tool ${tool.id} survives blank ${inp.key}`, ok);
  }
}
expect('at least 45 tools', TOOLS.length >= 45);
const rowVal = (id: string, vals: Record<string, number | string>, label: string) => {
  const tool = findTool(id)!;
  const base = Object.fromEntries(tool.inputs.map((i) => [i.key, i.default]));
  const row = tool.compute({ ...base, ...vals })?.rows.find((r) => r.label.en === label);
  return Number(row?.value);
};
near('ohm V+R → I', rowVal('ohm', { V: 12, I: NaN, R: 4 }, 'Current'), 3);
near('ohm I+P → R', rowVal('ohm', { V: NaN, I: 2, P: 100 }, 'Resistance'), 25);
near('dilution solves V1', rowVal('dilution', {}, 'V₁'), (10 * 1000) / 37);
expect('dilution needs exactly one blank', findTool('dilution')!.compute({ C1: 1, V1: 1, C2: 1, V2: 1 }) === null);
near('bolt M20 8.8 preload 75%', rowVal('bolt', {}, 'Preload'), 0.75 * 600 * 245 / 1000);
near('bolt M20 torque K0.2', rowVal('bolt', {}, 'Tightening torque'), 0.2 * 110.25 * 20);
near('pipe sizing 20 m³/h @1.5', rowVal('pipesize', {}, 'Required internal diameter'), 68.7, 0.01);
near('dms 45°30′45″', rowVal('dms', { mode: 'dms' }, 'Decimal degrees'), 45.5125, 1e-9);
near('hydrostatic 10 m water', rowVal('hydrostatic', {}, 'Pressure'), 97.87, 0.001);

// ── Reference tables are self-consistent ──
for (const r of TB.IPE) {
  near(`${r[0]} kg/m ≈ A × 0.785`, r[8], r[5] * 0.785, 0.02);
  const s = M.section('ibeam', r[2], r[1], r[4], r[3]);
  near(`${r[0]} area vs sharp-corner section`, s.area / 100, r[5], 0.06); // root radii add a few %
  near(`${r[0]} Iy vs sharp-corner section`, s.inertia / 1e4, r[6], 0.06);
}
for (const c of TB.CONCRETE) near(`${c[0]} fcm = fck + 8`, c[3], c[1] + 8, 1e-9);
near('AWG 10 ≈ 5.26 mm²', TB.AWG.find((a) => a.gauge === '10')!.area, 5.26, 0.005);
near('AWG 4/0 ≈ 107.2 mm²', TB.AWG.find((a) => a.gauge === '4/0')!.area, 107.2, 0.005);
near('DN100 bore', TB.pipeId(TB.PIPES.find((p) => p[0] === 100)!), 102.26, 1e-6);
expect('pipe for 68.7 mm bore is DN 80', TB.pipeForBore(68.7)?.[0] === 80);
near('rebar Ø16 kg/m', TB.rebarRow(16).kgPerM, 1.578, 0.002);
expect('proof stress 8.8 small', TB.proofStress('8.8', 16) === 580 && TB.proofStress('8.8', 20) === 600);

// ── New unit categories ──
near('1 g/cm³ = 1000 kg/m³', convert(1, 'density', 'gcm3', 'kgm3'), 1000, 1e-12);
near('1 kN/m = 68.52 lbf/ft', convert(1, 'lineload', 'kNm', 'lbfft'), 68.5218, 1e-5);
near('1 in⁴ = 41.62 cm⁴', convert(1, 'inertia', 'in4', 'cm4'), 41.6231, 1e-5);
near('180° = π rad', convert(180, 'angle', 'deg', 'rad'), Math.PI, 1e-12);
near('100 gon = 90°', convert(100, 'angle', 'grad', 'deg'), 90, 1e-12);
near('1 fc = 10.764 lux', convert(1, 'illuminance', 'fc', 'lux'), 10.7639, 1e-5);


// ── Published handbook values (independent of our formulas) ──
near('ASHRAE equivalent duct 300×600 → 457 mm', M.duct(3600, 1, 300).equivalentMm > 0 ? (1.3 * (600 * 300) ** 0.625) / 900 ** 0.25 : 0, 457, 0.002);
near('ASHRAE equivalent duct via tool', rowVal('duct', { Q: 0.18 * 3600 * 5, vel: 5, h: 300 }, 'Equivalent round (friction)'), 457, 0.003);
near('kVAr multiplier table 0.75 → 0.95 = 0.553', M.pfCorrection(1, 0.75, 0.95, 400, 50, 3).kvar, 0.553, 0.001);
near('kVAr multiplier table 0.80 → 1.00 = 0.750', M.pfCorrection(1, 0.8, 1, 400, 50, 3).kvar, 0.75, 0.001);
near('ISA air density 15 °C = 1.225 kg/m³', M.idealGas(101.325, 1, 15, 28.9647).density, 1.225, 0.001);
near('1 TR = 12 000 BTU/h', M.coolingEstimate(3.5168528420667 * 1000, 1).btuh, 12000, 0.0005);
near('Moody: Re 1e5, ε/D 0.001 → f ≈ 0.0222', frictionFactor(1e5, 0.001), 0.0222, 0.02);
near('Moody: Re 1e6, smooth → f ≈ 0.0116', frictionFactor(1e6, 0), 0.0116, 0.02);
near('Nominal mix 1:2:4, 1 m³ → 6.34 bags', concreteMaterials(1, [1, 2, 4], 50, 0).cementBags, 6.336, 0.001);
near('Rebar Ø16 = 1.58 kg/m (BS 4449)', rebarKgPerM(16), 1.579, 0.001);
near('Rebar Ø25 = 3.85 kg/m (BS 4449)', rebarKgPerM(25), 3.854, 0.001);
expect('22 kW 400 V motor ≈ 40 A (typical nameplate 39–42 A)', (() => { const i = M.motorCurrent(22, 400, 0.86, 0.92, 3); return i > 38 && i < 43; })());
near('630 kVA 400 V 6% → 15.2 kA', M.transformerFault(630, 400, 6), 15.16, 0.002);
near('Euler: pinned steel column (E 200 GPa, I 604 cm⁴, 4 m) = 745 kN', M.euler(200, 604, 4, 'pinned').Pcr, 745.1, 0.001);
near('Simply supported IPE 300, 20 kN/m, 6 m, E 210 GPa: δ = 5wL⁴/384EI = 19.2 mm', M.beam('simple', 'udl', 20, 6, 210, 8356).deflection, 19.23, 0.002); // with E = 210
near('Water column 10 m (ρ 1000) = 0.981 bar', M.hydrostatic(10, 1000) / 1e5, 0.98067, 1e-5);
near('Sch 40 4″ bore = 102.3 mm', TB.pipeId(TB.PIPES[8]), 102.26, 1e-4);
near('Calculator 200 + 10% = 220', ev('200+10%'), 220, 1e-12);
near('Calculator 200 − 10% = 180', ev('200-10%'), 180, 1e-12);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

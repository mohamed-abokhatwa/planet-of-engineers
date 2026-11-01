// More engineering calculators. Pure functions, SI units unless stated. Tested in tests/run.ts.
import { G, STEEL_DENSITY } from './calc';

// ───────────── Structural ─────────────

export type Support = 'simple' | 'cantilever' | 'fixed';
export type BeamLoad = 'udl' | 'point';

/**
 * Classic beam cases. w in kN/m (UDL) or P in kN (point: midspan; free end for a cantilever),
 * L in m, E in GPa, I in cm⁴. Returns kN·m, kN and mm.
 */
export function beam(support: Support, load: BeamLoad, value: number, Lm: number, EGPa: number, Icm4: number) {
  const L = Lm * 1000; // mm
  const E = EGPa * 1000; // N/mm²
  const I = Icm4 * 1e4; // mm⁴
  const EI = E * I;
  let M = 0; // kN·m, governing (largest) moment
  let V = 0; // kN
  let d = 0; // mm
  let Mmid: number | null = null;
  if (load === 'udl') {
    const w = value; // kN/m = N/mm
    if (support === 'simple') { M = (w * Lm * Lm) / 8; V = (w * Lm) / 2; d = (5 * w * L ** 4) / (384 * EI); }
    else if (support === 'cantilever') { M = (w * Lm * Lm) / 2; V = w * Lm; d = (w * L ** 4) / (8 * EI); }
    else { M = (w * Lm * Lm) / 12; Mmid = (w * Lm * Lm) / 24; V = (w * Lm) / 2; d = (w * L ** 4) / (384 * EI); }
  } else {
    const P = value * 1000; // N
    if (support === 'simple') { M = (value * Lm) / 4; V = value / 2; d = (P * L ** 3) / (48 * EI); }
    else if (support === 'cantilever') { M = value * Lm; V = value; d = (P * L ** 3) / (3 * EI); }
    else { M = (value * Lm) / 8; Mmid = (value * Lm) / 8; V = value / 2; d = (P * L ** 3) / (192 * EI); }
  }
  return { moment: M, momentMid: Mmid, shear: V, deflection: d, spanOverDeflection: d > 0 ? L / d : Infinity };
}

export const EFFECTIVE_LENGTH = { pinned: 1.0, fixedFree: 2.0, fixedPinned: 0.7, fixedFixed: 0.5 } as const;
export type EndCondition = keyof typeof EFFECTIVE_LENGTH;

/** Euler buckling load (kN). E in GPa, I in cm⁴, L in m, A in cm² (optional, for slenderness). */
export function euler(EGPa: number, Icm4: number, Lm: number, ends: EndCondition, Acm2?: number) {
  const K = EFFECTIVE_LENGTH[ends];
  const KL = K * Lm * 1000; // mm
  const Pcr = (Math.PI ** 2 * EGPa * 1000 * Icm4 * 1e4) / (KL * KL) / 1000; // kN
  const r = Acm2 && Acm2 > 0 ? Math.sqrt((Icm4 * 1e4) / (Acm2 * 100)) : null; // mm
  return { K, effectiveLength: KL / 1000, Pcr, slenderness: r ? KL / r : null, radiusOfGyration: r };
}

export type Shape = 'rect' | 'circle' | 'tube' | 'box' | 'ibeam';
/**
 * Section properties, dimensions in mm. rect(b,h), circle(d), tube(D,t), box(B,H,t), ibeam(bf,h,tf,tw) symmetric.
 * Returns A (mm²), I about the strong axis (mm⁴), elastic modulus Z (mm³), radius of gyration r (mm) and kg/m in steel.
 */
export function section(shape: Shape, a: number, b = 0, c = 0, d = 0) {
  let A = 0;
  let I = 0;
  let y = 0;
  if (shape === 'rect') { A = a * b; I = (a * b ** 3) / 12; y = b / 2; }
  else if (shape === 'circle') { A = (Math.PI / 4) * a * a; I = (Math.PI * a ** 4) / 64; y = a / 2; }
  else if (shape === 'tube') { const di = a - 2 * b; A = (Math.PI / 4) * (a * a - di * di); I = (Math.PI * (a ** 4 - di ** 4)) / 64; y = a / 2; }
  else if (shape === 'box') { const bi = a - 2 * c; const hi = b - 2 * c; A = a * b - bi * hi; I = (a * b ** 3 - bi * hi ** 3) / 12; y = b / 2; }
  else { // I-beam: a=bf, b=h, c=tf, d=tw
    const hw = b - 2 * c;
    A = 2 * a * c + hw * d;
    I = (a * b ** 3 - (a - d) * hw ** 3) / 12;
    y = b / 2;
  }
  return { area: A, inertia: I, modulus: I / y, radius: Math.sqrt(I / A), kgPerM: (A / 1e6) * STEEL_DENSITY };
}

/** Bars needed for a required steel area per metre width (mm²/m). */
export function rebarSpacing(requiredMm2PerM: number, barMm: number) {
  const barArea = (Math.PI / 4) * barMm * barMm;
  const spacing = (1000 * barArea) / requiredMm2PerM; // mm
  const practical = Math.floor(spacing / 25) * 25; // round down to 25 mm
  return { barArea, spacingExact: spacing, spacingPractical: practical, barsPerMetre: 1000 / practical, providedMm2PerM: (1000 / practical) * barArea };
}

// ───────────── Construction quantities ─────────────

/** Blocks/bricks for a wall. Dimensions: wall in m, unit in mm, joint in mm. */
export function masonry(wallL: number, wallH: number, openingsM2: number, unitL: number, unitH: number, unitT: number, jointMm: number, wasteFraction: number) {
  const netArea = Math.max(0, wallL * wallH - openingsM2);
  const perM2 = 1 / (((unitL + jointMm) / 1000) * ((unitH + jointMm) / 1000));
  const units = netArea * perM2;
  const wallVol = netArea * (unitT / 1000);
  const unitsVol = units * (unitL / 1000) * (unitH / 1000) * (unitT / 1000);
  return { netArea, perM2, units: Math.ceil(units * (1 + wasteFraction)), mortarM3: Math.max(0, wallVol - unitsVol) };
}

/** Tiles for an area. Tile and joint in mm. */
export function tiles(areaM2: number, tileW: number, tileH: number, jointMm: number, wasteFraction: number) {
  const perM2 = 1 / (((tileW + jointMm) / 1000) * ((tileH + jointMm) / 1000));
  return { perM2, tiles: Math.ceil(areaM2 * perM2 * (1 + wasteFraction)) };
}

/** Cement-sand plaster/screed. Dry factor 1.33, cement 1440 kg/m³. */
export function plaster(areaM2: number, thicknessMm: number, cement: number, sand: number, bagKg = 50, wasteFraction = 0.05) {
  const wet = areaM2 * (thicknessMm / 1000) * (1 + wasteFraction);
  const dry = wet * 1.33;
  const cementKg = ((dry * cement) / (cement + sand)) * 1440;
  return { wetM3: wet, cementKg, bags: cementKg / bagKg, sandM3: (dry * sand) / (cement + sand) };
}

export const paintLitres = (areaM2: number, coats: number, coverageM2PerL: number, wasteFraction = 0.1) => (areaM2 * coats * (1 + wasteFraction)) / coverageM2PerL;

/** Excavation: bank volume, loose volume after swell, number of truck loads. */
export function earthwork(L: number, W: number, D: number, swellPercent: number, truckM3: number) {
  const bank = L * W * D;
  const loose = bank * (1 + swellPercent / 100);
  return { bank, loose, trucks: Math.ceil(loose / truckM3) };
}

export type SteelShape = 'plate' | 'round' | 'pipe' | 'square' | 'shs';
/** Steel weight (kg). plate(L m, W m, t mm), round(d mm, L m), pipe(D mm, t mm, L m), square(a mm, L m), shs(a mm, t mm, L m). */
export function steelWeight(shape: SteelShape, a: number, b: number, c: number) {
  let areaMm2 = 0;
  let length = 0;
  if (shape === 'plate') return { kg: a * b * (c / 1000) * STEEL_DENSITY, kgPerM: null as number | null };
  if (shape === 'round') { areaMm2 = (Math.PI / 4) * a * a; length = b; }
  else if (shape === 'pipe') { areaMm2 = Math.PI * (a - b) * b; length = c; }
  else if (shape === 'square') { areaMm2 = a * a; length = b; }
  else { areaMm2 = a * a - (a - 2 * b) ** 2; length = c; }
  const kgPerM = (areaMm2 / 1e6) * STEEL_DENSITY;
  return { kg: kgPerM * length, kgPerM };
}

export function tankVolume(shape: 'rect' | 'cyl' | 'hcyl', a: number, b: number, c: number) {
  // rect: L,W,H; cyl (vertical): D,H; hcyl (horizontal, full): D, L
  const m3 = shape === 'rect' ? a * b * c : (Math.PI / 4) * a * a * b;
  return { m3, litres: m3 * 1000, usGallons: m3 / 3.785411784e-3, ukGallons: m3 / 4.54609e-3 };
}

/** Stairs: risers from floor-to-floor height, going from Blondel's rule 2R + G = target (default 630 mm). */
export function stairs(heightMm: number, maxRiserMm: number, blondel = 630) {
  const risers = Math.ceil(heightMm / maxRiserMm);
  const riser = heightMm / risers;
  const going = blondel - 2 * riser;
  return { risers, treads: risers - 1, riser, going, runMm: (risers - 1) * going, angle: (Math.atan(riser / going) * 180) / Math.PI };
}

// ───────────── Electrical ─────────────

/** Ohm's law: give any two of V, I, R, P (others NaN). */
export function ohm(V: number, I: number, R: number, P: number) {
  const k = (x: number) => Number.isFinite(x) && x > 0;
  if (k(V) && k(I)) return { V, I, R: V / I, P: V * I };
  if (k(V) && k(R)) return { V, I: V / R, R, P: (V * V) / R };
  if (k(V) && k(P)) return { V, I: P / V, R: (V * V) / P, P };
  if (k(I) && k(R)) return { V: I * R, I, R, P: I * I * R };
  if (k(I) && k(P)) return { V: P / I, I, R: P / (I * I), P };
  if (k(R) && k(P)) return { V: Math.sqrt(P * R), I: Math.sqrt(P / R), R, P };
  return null;
}

export function resistors(values: number[], mode: 'series' | 'parallel') {
  const vs = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!vs.length) return NaN;
  return mode === 'series' ? vs.reduce((s, v) => s + v, 0) : 1 / vs.reduce((s, v) => s + 1 / v, 0);
}

/** Capacitor bank to raise power factor. Returns kVAr and capacitance (µF) per phase (delta for 3-phase). */
export function pfCorrection(pKW: number, pf1: number, pf2: number, V: number, f: number, phases: 1 | 3) {
  const q = pKW * (Math.tan(Math.acos(pf1)) - Math.tan(Math.acos(pf2))); // kVAr
  const perPhaseVAr = (q * 1000) / (phases === 3 ? 3 : 1);
  const c = perPhaseVAr / (2 * Math.PI * f * V * V); // farads (delta: line voltage across each capacitor)
  return { kvar: q, microfarad: c * 1e6, currentBefore: pKW * 1000 / ((phases === 3 ? Math.sqrt(3) : 1) * V * pf1), currentAfter: pKW * 1000 / ((phases === 3 ? Math.sqrt(3) : 1) * V * pf2) };
}

/** Motor full-load current from shaft power (kW). */
export const motorCurrent = (kW: number, V: number, pf: number, eff: number, phases: 1 | 3) => (kW * 1000) / ((phases === 3 ? Math.sqrt(3) : 1) * V * pf * eff);

export function energyCost(kW: number, hoursPerDay: number, days: number, tariff: number) {
  const kWh = kW * hoursPerDay * days;
  return { kWh, cost: kWh * tariff };
}

export const TRANSFORMERS = [25, 50, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 1600, 2000, 2500, 3150];
export function transformerSize(loadKW: number, pf: number, growthPercent: number) {
  const kva = (loadKW / pf) * (1 + growthPercent / 100);
  return { requiredKVA: kva, standardKVA: TRANSFORMERS.find((s) => s >= kva) ?? null };
}

/** Lumen method: number of luminaires. */
export const luminaires = (areaM2: number, lux: number, lumensPerFitting: number, uf: number, mf: number) => (lux * areaM2) / (lumensPerFitting * uf * mf);

/** Symmetrical fault current at transformer secondary (infinite source), kA. */
export const transformerFault = (kva: number, V: number, zPercent: number) => (kva * 1000) / (Math.sqrt(3) * V * (zPercent / 100)) / 1000;

/** Battery / UPS backup time (hours). */
export const backupHours = (ah: number, V: number, loadW: number, dodFraction: number, efficiency: number) => (ah * V * dodFraction * efficiency) / loadW;

/** Solar PV: panels needed for a daily energy target. */
export function solar(dailyKWh: number, sunHours: number, panelW: number, lossPercent: number) {
  const kWp = dailyKWh / (sunHours * (1 - lossPercent / 100));
  return { kWp, panels: Math.ceil((kWp * 1000) / panelW) };
}

// ───────────── Mechanical / HVAC ─────────────

/** Rule-of-thumb cooling load (W/m²). Only for early estimates. */
export function coolingEstimate(areaM2: number, wPerM2: number) {
  const kw = (areaM2 * wPerM2) / 1000;
  return { kW: kw, btuh: kw * 3412.14, tr: kw / 3.5168528420667 };
}

/** Duct for an airflow (m³/h) at a velocity (m/s): round diameter, and rectangular width for a given height. */
export function duct(flowM3h: number, velocity: number, heightMm: number) {
  const areaM2 = flowM3h / 3600 / velocity;
  const dMm = Math.sqrt((4 * areaM2) / Math.PI) * 1000;
  const widthMm = heightMm > 0 ? (areaM2 * 1e6) / heightMm : NaN;
  // equivalent diameter of that rectangle (Huebscher), for friction comparisons
  const de = heightMm > 0 ? (1.3 * (widthMm * heightMm) ** 0.625) / (widthMm + heightMm) ** 0.25 : NaN;
  return { areaM2, roundMm: dMm, rectWidthMm: widthMm, equivalentMm: de, cfm: flowM3h / 1.69901 };
}

/** Pipe internal diameter for a flow (m³/h) at a velocity (m/s). */
export const pipeDiameterForVelocity = (flowM3h: number, velocity: number) => Math.sqrt((4 * (flowM3h / 3600)) / (Math.PI * velocity)) * 1000;

/** Heat carried by water: kW from flow (m³/h) and ΔT (K). */
export const waterHeatKW = (flowM3h: number, dT: number) => (998 * 4.186 * (flowM3h / 3600) * dT);
/** Sensible heat of air: kW from airflow (m³/h) and ΔT (K), ρ = 1.2 kg/m³, cp = 1.006 kJ/kg·K. */
export const airSensibleKW = (flowM3h: number, dT: number) => 1.2 * 1.006 * (flowM3h / 3600) * dT;

/** Pulleys/gears: output speed = input × driver / driven (diameters or teeth). */
export function drive(inputRpm: number, driver: number, driven: number, inputKW?: number) {
  const ratio = driven / driver;
  const outRpm = inputRpm / ratio;
  const torqueOut = inputKW ? (inputKW * 1000) / ((2 * Math.PI * outRpm) / 60) : null; // N·m, ignoring losses
  return { ratio, outputRpm: outRpm, outputTorque: torqueOut };
}

/** Bolt tightening torque T = K·F·d (N·m), F in kN, d in mm. */
export const boltTorque = (K: number, preloadKN: number, dMm: number) => K * preloadKN * 1000 * (dMm / 1000);

export const FLUIDS = { water: 998, seawater: 1025, diesel: 840, oil: 870, mercury: 13546 } as const;
export type Fluid = keyof typeof FLUIDS;
export const hydrostatic = (depthM: number, density: number) => density * G * depthM; // Pa

export const fillTimeMinutes = (volumeM3: number, flowM3h: number) => (volumeM3 / flowM3h) * 60;

/** Linear expansion coefficients, 1/K. */
export const EXPANSION = { steel: 12e-6, concrete: 10e-6, aluminium: 23e-6, copper: 17e-6, stainless: 17.3e-6, pvc: 52e-6, hdpe: 180e-6, glass: 9e-6 } as const;
export type ExpansionMaterial = keyof typeof EXPANSION;
export const thermalExpansionMm = (lengthM: number, dT: number, alpha: number) => alpha * lengthM * 1000 * dT;

// ───────────── Process ─────────────

/** C1·V1 = C2·V2: returns the missing value (pass NaN for the unknown). */
export function dilution(C1: number, V1: number, C2: number, V2: number) {
  if (!Number.isFinite(V2)) return { C1, V1, C2, V2: (C1 * V1) / C2 };
  if (!Number.isFinite(V1)) return { C1, V1: (C2 * V2) / C1, C2, V2 };
  if (!Number.isFinite(C2)) return { C1, V1, C2: (C1 * V1) / V2, V2 };
  return { C1: (C2 * V2) / V1, V1, C2, V2 };
}

export const R_GAS = 8.314462618; // J/(mol·K)
/** Ideal gas: moles from P (kPa), V (m³), T (°C), and mass for a molar mass (g/mol). */
export function idealGas(PkPa: number, Vm3: number, TC: number, molarMass: number) {
  const n = (PkPa * 1000 * Vm3) / (R_GAS * (TC + 273.15));
  return { moles: n, massKg: (n * molarMass) / 1000, density: (PkPa * 1000 * molarMass) / 1000 / (R_GAS * (TC + 273.15)) };
}

// ───────────── Surveying ─────────────

/** Distance and whole-circle bearing from point 1 to point 2 (Easting, Northing). */
export function inverse(e1: number, n1: number, e2: number, n2: number) {
  const dE = e2 - e1;
  const dN = n2 - n1;
  const dist = Math.hypot(dE, dN);
  let brg = (Math.atan2(dE, dN) * 180) / Math.PI;
  if (brg < 0) brg += 360;
  return { distance: dist, bearing: brg, dms: toDMS(brg), dE, dN };
}

export function toDMS(deg: number) {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  let m = Math.floor(mFloat);
  let s = Math.round((mFloat - m) * 60);
  let dd = d;
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; dd += 1; }
  return `${dd}° ${String(m).padStart(2, '0')}′ ${String(s).padStart(2, '0')}″`;
}

/** Height of an object from horizontal distance and elevation angle, plus instrument height. */
export const heightFromAngle = (distanceM: number, angleDeg: number, instrumentM: number) => distanceM * Math.tan((angleDeg * Math.PI) / 180) + instrumentM;

// ───────────── Math ─────────────

export const interpolate = (x1: number, y1: number, x2: number, y2: number, x: number) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);

export function quadratic(a: number, b: number, c: number) {
  const disc = b * b - 4 * a * c;
  if (a === 0) return { disc, real: true, x1: -c / b, x2: -c / b };
  if (disc >= 0) return { disc, real: true, x1: (-b + Math.sqrt(disc)) / (2 * a), x2: (-b - Math.sqrt(disc)) / (2 * a) };
  return { disc, real: false, re: -b / (2 * a), im: Math.sqrt(-disc) / (2 * a) };
}

/** Right triangle from two legs. */
export function rightTriangle(a: number, b: number) {
  const c = Math.hypot(a, b);
  return { hypotenuse: c, angleA: (Math.atan2(a, b) * 180) / Math.PI, angleB: (Math.atan2(b, a) * 180) / Math.PI, area: (a * b) / 2, perimeter: a + b + c };
}

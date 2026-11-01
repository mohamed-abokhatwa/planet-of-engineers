// Engineering calculators. Pure functions only, so they work offline and are unit-tested.
// All results are for estimation; users are reminded to verify against their local codes.

export const G = 9.80665; // standard gravity, m/s²

// ───────────── Unit conversion ─────────────

export type UnitDef = { id: string; label: string; toSI: number };
export type UnitCategory = { id: string; units: UnitDef[] };

const u = (id: string, label: string, toSI: number): UnitDef => ({ id, label, toSI });

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    units: [u('m', 'm', 1), u('mm', 'mm', 1e-3), u('cm', 'cm', 1e-2), u('km', 'km', 1e3), u('in', 'in', 0.0254), u('ft', 'ft', 0.3048), u('yd', 'yd', 0.9144), u('mi', 'mile', 1609.344)],
  },
  {
    id: 'area',
    units: [
      u('m2', 'm²', 1), u('mm2', 'mm²', 1e-6), u('cm2', 'cm²', 1e-4), u('km2', 'km²', 1e6), u('ha', 'hectare', 1e4),
      u('in2', 'in²', 6.4516e-4), u('ft2', 'ft²', 0.09290304), u('acre', 'acre', 4046.8564224),
      u('feddan', 'feddan', 4200.83), u('dunam', 'dunam', 1000),
    ],
  },
  {
    id: 'volume',
    units: [
      u('m3', 'm³', 1), u('L', 'L', 1e-3), u('mL', 'mL', 1e-6), u('ft3', 'ft³', 0.028316846592), u('in3', 'in³', 1.6387064e-5),
      u('yd3', 'yd³', 0.764554857984), u('galUS', 'gal (US)', 3.785411784e-3), u('galUK', 'gal (UK)', 4.54609e-3),
    ],
  },
  {
    id: 'mass',
    units: [u('kg', 'kg', 1), u('g', 'g', 1e-3), u('t', 'tonne', 1e3), u('lb', 'lb', 0.45359237), u('oz', 'oz', 0.028349523125), u('tonUS', 'ton (US)', 907.18474)],
  },
  {
    id: 'force',
    units: [u('N', 'N', 1), u('kN', 'kN', 1e3), u('MN', 'MN', 1e6), u('kgf', 'kgf', G), u('tf', 'tf', 1e3 * G), u('lbf', 'lbf', 4.4482216152605), u('kip', 'kip', 4448.2216152605)],
  },
  {
    id: 'pressure',
    units: [
      u('Pa', 'Pa', 1), u('kPa', 'kPa', 1e3), u('MPa', 'MPa (N/mm²)', 1e6), u('bar', 'bar', 1e5), u('psi', 'psi', 6894.757293168),
      u('ksi', 'ksi', 6894757.293168), u('atm', 'atm', 101325), u('kgfcm2', 'kgf/cm²', 98066.5), u('mH2O', 'm H₂O', 9806.65), u('mmHg', 'mmHg', 133.322387415),
    ],
  },
  {
    id: 'power',
    units: [u('W', 'W', 1), u('kW', 'kW', 1e3), u('MW', 'MW', 1e6), u('hp', 'hp', 745.69987158227), u('PS', 'hp (metric)', 735.49875), u('BTUh', 'BTU/h', 0.29307107017), u('TR', 'TR (refrigeration)', 3516.8528420667)],
  },
  {
    id: 'energy',
    units: [u('J', 'J', 1), u('kJ', 'kJ', 1e3), u('MJ', 'MJ', 1e6), u('kWh', 'kWh', 3.6e6), u('cal', 'cal', 4.184), u('kcal', 'kcal', 4184), u('BTU', 'BTU', 1055.05585262)],
  },
  {
    id: 'flow',
    units: [u('m3s', 'm³/s', 1), u('m3h', 'm³/h', 1 / 3600), u('Ls', 'L/s', 1e-3), u('Lmin', 'L/min', 1e-3 / 60), u('gpm', 'gpm (US)', 6.30901964e-5), u('cfm', 'cfm', 4.719474432e-4)],
  },
  {
    id: 'speed',
    units: [u('ms', 'm/s', 1), u('kmh', 'km/h', 1 / 3.6), u('mph', 'mph', 0.44704), u('kn', 'knot', 0.514444444), u('fts', 'ft/s', 0.3048)],
  },
  {
    id: 'torque',
    units: [u('Nm', 'N·m', 1), u('kNm', 'kN·m', 1e3), u('lbfft', 'lbf·ft', 1.3558179483314), u('kgfm', 'kgf·m', G)],
  },
  {
    id: 'temperature',
    units: [u('C', '°C', 1), u('F', '°F', 1), u('K', 'K', 1)],
  },
];

export function convert(value: number, category: string, from: string, to: string): number {
  if (category === 'temperature') {
    const c = from === 'C' ? value : from === 'F' ? ((value - 32) * 5) / 9 : value - 273.15;
    return to === 'C' ? c : to === 'F' ? (c * 9) / 5 + 32 : c + 273.15;
  }
  const cat = UNIT_CATEGORIES.find((c) => c.id === category);
  const a = cat?.units.find((x) => x.id === from);
  const b = cat?.units.find((x) => x.id === to);
  if (!a || !b) return NaN;
  return (value * a.toSI) / b.toSI;
}

// ───────────── Concrete ─────────────

/** Dry-volume factor: loose dry materials needed per m³ of wet concrete. */
export const DRY_FACTOR = 1.54;
export const CEMENT_DENSITY = 1440; // kg/m³ (loose)

export function concreteMaterials(volumeM3: number, mix: [number, number, number], bagKg = 50, wasteFraction = 0.05, wcRatio = 0.5) {
  const v = volumeM3 * (1 + wasteFraction);
  const dry = v * DRY_FACTOR;
  const parts = mix[0] + mix[1] + mix[2];
  const cementM3 = (dry * mix[0]) / parts;
  const cementKg = cementM3 * CEMENT_DENSITY;
  return {
    volumeWithWaste: v,
    cementKg,
    cementBags: cementKg / bagKg,
    sandM3: (dry * mix[1]) / parts,
    gravelM3: (dry * mix[2]) / parts,
    waterL: cementKg * wcRatio,
  };
}

export const slabVolume = (L: number, W: number, T: number) => L * W * T;
export const circularColumnVolume = (diameter: number, height: number) => (Math.PI / 4) * diameter * diameter * height;

// ───────────── Rebar ─────────────

export const STEEL_DENSITY = 7850; // kg/m³

/** Mass of a round bar per metre, kg/m (d in mm). Equivalent to d²/162.2. */
export const rebarKgPerM = (dMm: number) => (Math.PI / 4) * (dMm / 1000) ** 2 * STEEL_DENSITY;

export function rebarQuantity(dMm: number, bars: number, lengthM: number, lapFactor = 0) {
  const perM = rebarKgPerM(dMm);
  const totalLength = bars * lengthM;
  const totalKg = totalLength * perM;
  return { kgPerM: perM, totalLength, totalKg, tonnes: totalKg / 1000, lapLengthMm: lapFactor * dMm, areaMm2: (Math.PI / 4) * dMm * dMm };
}

// ───────────── Electrical ─────────────

/** Line current from active power. phases: 1 or 3. V is line-to-line for 3-phase. */
export function currentFromPower(pW: number, v: number, pf: number, phases: 1 | 3) {
  return phases === 3 ? pW / (Math.sqrt(3) * v * pf) : pW / (v * pf);
}

export function powerFromCurrent(i: number, v: number, pf: number, phases: 1 | 3) {
  const s = phases === 3 ? Math.sqrt(3) * v * i : v * i; // apparent power, VA
  return { apparentVA: s, activeW: s * pf, reactiveVAr: s * Math.sqrt(Math.max(0, 1 - pf * pf)) };
}

/** Resistivity at a typical conductor operating temperature (~70 °C), Ω·mm²/m. */
export const RESISTIVITY = { copper: 0.0225, aluminium: 0.036 } as const;
export type Conductor = keyof typeof RESISTIVITY;

/** Voltage drop (resistive part, simplified), volts and % of supply. */
export function voltageDrop(i: number, lengthM: number, areaMm2: number, v: number, pf: number, phases: 1 | 3, conductor: Conductor) {
  const rho = RESISTIVITY[conductor];
  const k = phases === 3 ? Math.sqrt(3) : 2;
  const dropV = (k * rho * lengthM * i * pf) / areaMm2;
  return { dropV, percent: (dropV / v) * 100 };
}

export const CABLE_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630];

/** Smallest standard cross-section that keeps voltage drop within the limit (does NOT check ampacity). */
export function cableSizeForDrop(i: number, lengthM: number, v: number, pf: number, phases: 1 | 3, conductor: Conductor, maxPercent: number) {
  for (const a of CABLE_SIZES) {
    const { dropV, percent } = voltageDrop(i, lengthM, a, v, pf, phases, conductor);
    if (percent <= maxPercent) return { areaMm2: a, dropV, percent };
  }
  return null;
}

// ───────────── Mechanical / fluids ─────────────

export const WATER = { density: 998, kinematicViscosity: 1.004e-6 }; // 20 °C

/** Absolute roughness ε in mm. */
export const ROUGHNESS = { steel: 0.045, galvanized: 0.15, castIron: 0.26, concrete: 0.3, pvc: 0.0015, copper: 0.0015, hdpe: 0.007 } as const;
export type PipeMaterial = keyof typeof ROUGHNESS;

/** Darcy friction factor: laminar 64/Re, turbulent Swamee–Jain. */
export function frictionFactor(re: number, relRoughness: number) {
  if (re <= 0) return NaN;
  if (re < 2300) return 64 / re;
  return 0.25 / Math.log10(relRoughness / 3.7 + 5.74 / re ** 0.9) ** 2;
}

/** Darcy–Weisbach pressure drop for water in a full circular pipe. */
export function pipePressureDrop(flowM3h: number, diameterMm: number, lengthM: number, roughnessMm: number, fluid = WATER) {
  const q = flowM3h / 3600;
  const d = diameterMm / 1000;
  const area = (Math.PI / 4) * d * d;
  const v = q / area;
  const re = (v * d) / fluid.kinematicViscosity;
  const f = frictionFactor(re, roughnessMm / diameterMm);
  const dpPa = f * (lengthM / d) * ((fluid.density * v * v) / 2);
  return { velocity: v, reynolds: re, friction: f, dpPa, dpKPa: dpPa / 1000, headLossM: dpPa / (fluid.density * G), regime: re < 2300 ? 'laminar' : re < 4000 ? 'transitional' : 'turbulent' };
}

/** Pump power from flow (m³/h), head (m) and efficiency (0–1). */
export function pumpPower(flowM3h: number, headM: number, efficiency: number, density = WATER.density) {
  const hydraulicW = density * G * (flowM3h / 3600) * headM;
  const shaftW = hydraulicW / efficiency;
  return { hydraulicKW: hydraulicW / 1000, shaftKW: shaftW / 1000, shaftHp: shaftW / 745.69987158227 };
}

// ───────────── General ─────────────

export function slope(rise: number, run: number) {
  const ratio = rise / run;
  return { percent: ratio * 100, degrees: (Math.atan(ratio) * 180) / Math.PI, oneIn: ratio === 0 ? Infinity : 1 / ratio, permille: ratio * 1000 };
}

export const area = {
  rectangle: (a: number, b: number) => a * b,
  circle: (d: number) => (Math.PI / 4) * d * d,
  triangle: (base: number, h: number) => 0.5 * base * h,
  trapezoid: (a: number, b: number, h: number) => ((a + b) / 2) * h,
};

// Reference tables used offline by the Reference screen and some tools. Values from standard tables
// (EN 1992-1-1 Table 3.1, EN 10365 IPE, ISO 898-1 / ISO 4032, ASME B36.10 Sch 40). Tested for consistency in tests/run.ts.
import { G, STEEL_DENSITY } from './calc';

export const REBAR_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40];
export const rebarRow = (d: number) => {
  const area = (Math.PI / 4) * d * d;
  return { d, area, kgPerM: (area / 1e6) * STEEL_DENSITY, perimeter: Math.PI * d, at100: (area * 1000) / 100, at150: (area * 1000) / 150, at200: (area * 1000) / 200 };
};

// [name, h, b, tw, tf, A cm², Iy cm⁴, Wy cm³, kg/m]
export const IPE: [string, number, number, number, number, number, number, number, number][] = [
  ['IPE 100', 100, 55, 4.1, 5.7, 10.3, 171, 34.2, 8.1],
  ['IPE 120', 120, 64, 4.4, 6.3, 13.2, 318, 53.0, 10.4],
  ['IPE 140', 140, 73, 4.7, 6.9, 16.4, 541, 77.3, 12.9],
  ['IPE 160', 160, 82, 5.0, 7.4, 20.1, 869, 109, 15.8],
  ['IPE 180', 180, 91, 5.3, 8.0, 23.9, 1317, 146, 18.8],
  ['IPE 200', 200, 100, 5.6, 8.5, 28.5, 1943, 194, 22.4],
  ['IPE 220', 220, 110, 5.9, 9.2, 33.4, 2772, 252, 26.2],
  ['IPE 240', 240, 120, 6.2, 9.8, 39.1, 3892, 324, 30.7],
  ['IPE 270', 270, 135, 6.6, 10.2, 45.9, 5790, 429, 36.1],
  ['IPE 300', 300, 150, 7.1, 10.7, 53.8, 8356, 557, 42.2],
  ['IPE 330', 330, 160, 7.5, 11.5, 62.6, 11770, 713, 49.1],
  ['IPE 360', 360, 170, 8.0, 12.7, 72.7, 16270, 904, 57.1],
  ['IPE 400', 400, 180, 8.6, 13.5, 84.5, 23130, 1160, 66.3],
  ['IPE 450', 450, 190, 9.4, 14.6, 98.8, 33740, 1500, 77.6],
  ['IPE 500', 500, 200, 10.2, 16.0, 116, 48200, 1930, 90.7],
  ['IPE 550', 550, 210, 11.1, 17.2, 134, 67120, 2440, 106],
  ['IPE 600', 600, 220, 12.0, 19.0, 156, 92080, 3070, 122],
];

// [class, fck, fck,cube, fcm, fctm, Ecm GPa]
export const CONCRETE: [string, number, number, number, number, number][] = [
  ['C12/15', 12, 15, 20, 1.6, 27],
  ['C16/20', 16, 20, 24, 1.9, 29],
  ['C20/25', 20, 25, 28, 2.2, 30],
  ['C25/30', 25, 30, 33, 2.6, 31],
  ['C30/37', 30, 37, 38, 2.9, 33],
  ['C35/45', 35, 45, 43, 3.2, 34],
  ['C40/50', 40, 50, 48, 3.5, 35],
  ['C45/55', 45, 55, 53, 3.8, 36],
  ['C50/60', 50, 60, 58, 4.1, 37],
];

// Metric coarse bolts: [size, d mm, pitch mm, tensile stress area mm², spanner (ISO) mm]
export const BOLTS: [string, number, number, number, number][] = [
  ['M6', 6, 1.0, 20.1, 10],
  ['M8', 8, 1.25, 36.6, 13],
  ['M10', 10, 1.5, 58.0, 16],
  ['M12', 12, 1.75, 84.3, 18],
  ['M16', 16, 2.0, 157, 24],
  ['M20', 20, 2.5, 245, 30],
  ['M24', 24, 3.0, 353, 36],
  ['M30', 30, 3.5, 561, 46],
  ['M36', 36, 4.0, 817, 55],
];
/** Proof stress (MPa), ISO 898-1. Class 8.8 is 580 up to M16 and 600 above. */
export const proofStress = (grade: string, d: number) => (grade === '12.9' ? 970 : grade === '10.9' ? 830 : d <= 16 ? 580 : 600);

// Steel pipe, Schedule 40: [DN, NPS, OD mm, wall mm]
export const PIPES: [number, string, number, number][] = [
  [15, '½″', 21.3, 2.77],
  [20, '¾″', 26.7, 2.87],
  [25, '1″', 33.4, 3.38],
  [32, '1¼″', 42.2, 3.56],
  [40, '1½″', 48.3, 3.68],
  [50, '2″', 60.3, 3.91],
  [65, '2½″', 73.0, 5.16],
  [80, '3″', 88.9, 5.49],
  [100, '4″', 114.3, 6.02],
  [125, '5″', 141.3, 6.55],
  [150, '6″', 168.3, 7.11],
  [200, '8″', 219.1, 8.18],
  [250, '10″', 273.0, 9.27],
  [300, '12″', 323.8, 10.31],
];
export const pipeId = (p: (typeof PIPES)[number]) => p[2] - 2 * p[3];
/** Smallest Sch 40 pipe whose bore is at least the required internal diameter (mm). */
export const pipeForBore = (idMm: number) => PIPES.find((p) => pipeId(p) >= idMm) ?? null;

/** American Wire Gauge: diameter and area. Gauge 0 = "1/0", -1 = "2/0" … -3 = "4/0". */
export const awgDiameter = (n: number) => 0.127 * 92 ** ((36 - n) / 39);
export const AWG = [-3, -2, -1, 0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((n) => {
  const d = awgDiameter(n);
  return { gauge: n <= 0 ? `${1 - n}/0` : String(n), d, area: (Math.PI / 4) * d * d };
});

export type Lbl = { en: string; ar: string };
// [name, density kg/m³]
export const DENSITIES: [Lbl, number][] = [
  [{ en: 'Water', ar: 'مياه' }, 1000],
  [{ en: 'Sea water', ar: 'مياه البحر' }, 1025],
  [{ en: 'Reinforced concrete', ar: 'خرسانة مسلحة' }, 2500],
  [{ en: 'Plain concrete', ar: 'خرسانة عادية' }, 2400],
  [{ en: 'Cement (bulk)', ar: 'أسمنت (سائب)' }, 1440],
  [{ en: 'Sand (dry)', ar: 'رمل (جاف)' }, 1600],
  [{ en: 'Gravel', ar: 'زلط' }, 1700],
  [{ en: 'Soil (compacted)', ar: 'تربة (مدموكة)' }, 1800],
  [{ en: 'Brick masonry', ar: 'مباني طوب' }, 1900],
  [{ en: 'Asphalt', ar: 'أسفلت' }, 2300],
  [{ en: 'Glass', ar: 'زجاج' }, 2500],
  [{ en: 'Timber (softwood)', ar: 'خشب (لين)' }, 500],
  [{ en: 'Timber (hardwood)', ar: 'خشب (صلب)' }, 750],
  [{ en: 'Structural steel', ar: 'حديد إنشائي' }, 7850],
  [{ en: 'Stainless steel', ar: 'ستانلس ستيل' }, 8000],
  [{ en: 'Cast iron', ar: 'حديد زهر' }, 7200],
  [{ en: 'Aluminium', ar: 'ألومنيوم' }, 2700],
  [{ en: 'Copper', ar: 'نحاس' }, 8960],
  [{ en: 'Lead', ar: 'رصاص' }, 11340],
  [{ en: 'Diesel', ar: 'ديزل' }, 840],
  [{ en: 'Ice', ar: 'ثلج' }, 917],
];
export const unitWeight = (density: number) => (density * G) / 1000; // kN/m³

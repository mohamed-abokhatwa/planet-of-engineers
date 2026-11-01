// Tool definitions for the extended toolbox. Rendered by src/app/tool/[id].tsx like the ones in defs.ts.
import type { InputDef, ResultRow, ToolDef } from './defs';
import {
  EXPANSION,
  FLUIDS,
  TRANSFORMERS,
  airSensibleKW,
  backupHours,
  beam,
  boltTorque,
  coolingEstimate,
  dilution,
  drive,
  duct,
  earthwork,
  energyCost,
  euler,
  fillTimeMinutes,
  heightFromAngle,
  hydrostatic,
  idealGas,
  interpolate,
  inverse,
  luminaires,
  masonry,
  motorCurrent,
  ohm,
  paintLitres,
  pfCorrection,
  pipeDiameterForVelocity,
  plaster,
  quadratic,
  rebarSpacing,
  resistors,
  rightTriangle,
  section,
  solar,
  stairs,
  steelWeight,
  tankVolume,
  thermalExpansionMm,
  tiles,
  toDMS,
  transformerFault,
  transformerSize,
  waterHeatKW,
  type BeamLoad,
  type EndCondition,
  type ExpansionMaterial,
  type Fluid,
  type Shape,
  type SteelShape,
  type Support,
} from './calc-more';
import { BOLTS, REBAR_SIZES, pipeForBore, pipeId, proofStress } from './tables';

type T = { en: string; ar: string };
const t = (en: string, ar: string): T => ({ en, ar });
type Vals = Record<string, number | string>;

const n = (v: Vals, k: string) => Number(v[k]);
const pos = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);
const fin = (...xs: number[]) => xs.every((x) => Number.isFinite(x));
const num = (key: string, label: T, def: number, unit?: string, showIf?: (v: Vals) => boolean): InputDef => ({ key, label, kind: 'number', default: def, unit, showIf });
const sel = (key: string, label: T, def: string, options: [string, T][], showIf?: (v: Vals) => boolean): InputDef => ({
  key, label, kind: 'select', default: def, options: options.map(([value, l]) => ({ value, label: l })), showIf,
});
const row = (label: T, value: ResultRow['value'], unit?: ResultRow['unit'], digits?: number, extra?: Partial<ResultRow>): ResultRow => ({ label, value, unit, digits, ...extra });
const hi = { highlight: true };

const STRUCT = t('Structural', 'إنشائي');
const CIVIL = t('Civil', 'مدني');
const ELEC = t('Electrical', 'كهرباء');
const MECH = t('Mechanical', 'ميكانيكا');
const PROC = t('Process & chemical', 'العمليات والكيمياء');
const SURV = t('Surveying', 'المساحة');
const GEN = t('General', 'عام');

const PHASES = sel('phases', t('System', 'النظام'), '3', [['3', t('Three-phase', 'ثلاثي الأطوار')], ['1', t('Single-phase', 'أحادي الطور')]]);
const ph = (v: Vals) => (v.phases === '1' ? 1 : 3) as 1 | 3;
const E_DEFAULT = 200; // GPa, steel

export const MORE_TOOLS: ToolDef[] = [
  // ───────────── Structural ─────────────
  {
    id: 'beam',
    icon: 'remove-outline',
    group: STRUCT,
    title: t('Beam: moment, shear & deflection', 'الكمرة: العزم والقص والترخيم'),
    desc: t('Simple, cantilever or fixed; UDL or point load', 'بسيطة أو كابولي أو مثبتة؛ حمل موزع أو مركز'),
    inputs: [
      sel('support', t('Support', 'نوع الركائز'), 'simple', [['simple', t('Simply supported', 'بسيطة الارتكاز')], ['cantilever', t('Cantilever', 'كابولي')], ['fixed', t('Fixed both ends', 'مثبتة الطرفين')]]),
      sel('load', t('Load', 'الحمل'), 'udl', [['udl', t('Uniform (kN/m)', 'موزع (كن/م)')], ['point', t('Point (kN)', 'مركز (كن)')]]),
      num('w', t('Uniform load w', 'الحمل الموزع w'), 20, 'kN/m', (v) => v.load === 'udl'),
      num('P', t('Point load P (midspan / free end)', 'الحمل المركز P (منتصف البحر / الطرف الحر)'), 50, 'kN', (v) => v.load === 'point'),
      num('L', t('Span', 'البحر'), 6, 'm'),
      num('E', t('Elastic modulus E', 'معاير المرونة E'), E_DEFAULT, 'GPa'),
      num('I', t('Moment of inertia I', 'عزم القصور الذاتي I'), 8356, 'cm⁴'),
    ],
    compute: (v) => {
      const value = v.load === 'udl' ? n(v, 'w') : n(v, 'P');
      if (!pos(value, n(v, 'L'), n(v, 'E'), n(v, 'I'))) return null;
      const r = beam(v.support as Support, v.load as BeamLoad, value, n(v, 'L'), n(v, 'E'), n(v, 'I'));
      const ratio = r.spanOverDeflection;
      // usual limits: spans L/360 (finishes) and L/250; cantilevers L/180 and L/125
      const lim = v.support === 'cantilever' ? [180, 125] : [360, 250];
      return {
        rows: [
          row(t('Max bending moment', 'أقصى عزم انحناء'), r.moment, 'kN·m', 2, hi),
          ...(r.momentMid !== null ? [row(t('Midspan moment', 'العزم عند المنتصف'), r.momentMid, 'kN·m', 2)] : []),
          row(t('Max shear', 'أقصى قوة قص'), r.shear, 'kN', 2, hi),
          row(t('Max deflection', 'أقصى ترخيم'), r.deflection, 'mm', 2, hi),
          row(t('Span / deflection', 'البحر / الترخيم'), Number.isFinite(ratio) ? `L / ${Math.round(ratio)}` : '—', undefined, undefined, { tone: ratio >= lim[0] ? 'good' : ratio >= lim[1] ? 'warn' : 'bad' }),
        ],
        note: t('Elastic, prismatic beam, self-weight not included unless added to w. Default I = IPE 300. Typical limits: spans L/360 (finishes) and L/250, cantilevers L/180.', 'كمرة مرنة منتظمة المقطع، الوزن الذاتي غير محسوب إلا إذا أضفته إلى w. القيمة الافتراضية لـ I هي IPE 300. الحدود المعتادة: البحور L/360 (التشطيبات) و L/250، والكوابيل L/180.'),
      };
    },
  },
  {
    id: 'buckling',
    icon: 'reorder-four-outline',
    group: STRUCT,
    title: t('Column buckling (Euler)', 'انبعاج الأعمدة (أويلر)'),
    desc: t('Critical load, effective length, slenderness', 'الحمل الحرج والطول الفعال ونسبة النحافة'),
    inputs: [
      sel('ends', t('End conditions', 'حالة الأطراف'), 'pinned', [
        ['pinned', t('Pinned–pinned (K 1.0)', 'مفصلي–مفصلي (K 1.0)')], ['fixedPinned', t('Fixed–pinned (K 0.7)', 'مثبت–مفصلي (K 0.7)')],
        ['fixedFixed', t('Fixed–fixed (K 0.5)', 'مثبت–مثبت (K 0.5)')], ['fixedFree', t('Fixed–free (K 2.0)', 'مثبت–حر (K 2.0)')],
      ]),
      num('L', t('Column length', 'طول العمود'), 4, 'm'),
      num('E', t('Elastic modulus E', 'معاير المرونة E'), E_DEFAULT, 'GPa'),
      num('I', t('Minor-axis inertia I', 'عزم القصور حول المحور الضعيف I'), 604, 'cm⁴'),
      num('A', t('Section area (for slenderness)', 'مساحة المقطع (للنحافة)'), 53.8, 'cm²'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'L'), n(v, 'E'), n(v, 'I'))) return null;
      const r = euler(n(v, 'E'), n(v, 'I'), n(v, 'L'), v.ends as EndCondition, pos(n(v, 'A')) ? n(v, 'A') : undefined);
      return {
        rows: [
          row(t('Effective length factor K', 'معامل الطول الفعال K'), r.K, undefined, 1),
          row(t('Effective length KL', 'الطول الفعال KL'), r.effectiveLength, 'm', 2),
          row(t('Euler critical load', 'حمل أويلر الحرج'), r.Pcr, 'kN', 1, hi),
          ...(r.radiusOfGyration ? [row(t('Radius of gyration', 'نصف قطر القصور'), r.radiusOfGyration, 'mm', 1)] : []),
          ...(r.slenderness ? [row(t('Slenderness KL/r', 'النحافة KL/r'), r.slenderness, undefined, 0, { highlight: true, tone: r.slenderness <= 120 ? 'good' : r.slenderness <= 200 ? 'warn' : 'bad' })] : []),
        ],
        note: t('Ideal elastic buckling with theoretical K; design codes use larger K for fixed ends (0.65–0.8) and reduce the load for imperfections and yielding. Defaults: IPE 300 minor axis.', 'انبعاج مرن مثالي بمعامل K نظري؛ أكواد التصميم تستخدم K أكبر للأطراف المثبتة (0.65–0.8) وتخفّض الحمل بسبب العيوب والخضوع. القيم الافتراضية: IPE 300 حول المحور الضعيف.'),
      };
    },
  },
  {
    id: 'section',
    icon: 'square-outline',
    group: STRUCT,
    title: t('Section properties', 'خواص المقاطع'),
    desc: t('Area, inertia, modulus, radius of gyration, kg/m', 'المساحة والقصور ومعاير المقطع ونصف قطر القصور والوزن'),
    inputs: [
      sel('shape', t('Shape', 'الشكل'), 'rect', [
        ['rect', t('Rectangle', 'مستطيل')], ['circle', t('Solid round', 'دائري مصمت')], ['tube', t('Round tube', 'ماسورة دائرية')],
        ['box', t('Box / RHS', 'صندوقي')], ['ibeam', t('I-beam', 'قطاع I')],
      ]),
      num('rb', t('Width b', 'العرض b'), 250, 'mm', (v) => v.shape === 'rect'),
      num('rh', t('Depth h', 'العمق h'), 500, 'mm', (v) => v.shape === 'rect'),
      num('cd', t('Diameter', 'القطر'), 300, 'mm', (v) => v.shape === 'circle'),
      num('tD', t('Outside diameter', 'القطر الخارجي'), 168.3, 'mm', (v) => v.shape === 'tube'),
      num('tt', t('Wall thickness', 'سمك الجدار'), 7.1, 'mm', (v) => v.shape === 'tube'),
      num('bB', t('Width B', 'العرض B'), 100, 'mm', (v) => v.shape === 'box'),
      num('bH', t('Depth H', 'العمق H'), 200, 'mm', (v) => v.shape === 'box'),
      num('bt', t('Wall thickness', 'سمك الجدار'), 6, 'mm', (v) => v.shape === 'box'),
      num('ibf', t('Flange width', 'عرض الشفة'), 150, 'mm', (v) => v.shape === 'ibeam'),
      num('ih', t('Overall depth', 'العمق الكلي'), 300, 'mm', (v) => v.shape === 'ibeam'),
      num('itf', t('Flange thickness', 'سمك الشفة'), 10.7, 'mm', (v) => v.shape === 'ibeam'),
      num('itw', t('Web thickness', 'سمك العصب'), 7.1, 'mm', (v) => v.shape === 'ibeam'),
    ],
    compute: (v) => {
      const s = v.shape as Shape;
      const args: Record<Shape, string[]> = { rect: ['rb', 'rh'], circle: ['cd'], tube: ['tD', 'tt'], box: ['bB', 'bH', 'bt'], ibeam: ['ibf', 'ih', 'itf', 'itw'] };
      const xs = args[s].map((k) => n(v, k));
      if (!pos(...xs)) return null;
      if (s === 'tube' && 2 * xs[1] >= xs[0]) return null;
      if (s === 'box' && 2 * xs[2] >= Math.min(xs[0], xs[1])) return null;
      if (s === 'ibeam' && (2 * xs[2] >= xs[1] || xs[3] >= xs[0])) return null;
      const r = section(s, xs[0], xs[1], xs[2], xs[3]);
      return {
        rows: [
          row(t('Area A', 'المساحة A'), r.area / 100, 'cm²', 2, hi),
          row(t('Moment of inertia I (strong axis)', 'عزم القصور I (المحور القوي)'), r.inertia / 1e4, 'cm⁴', 1, hi),
          row(t('Elastic modulus Z', 'معاير المقطع Z'), r.modulus / 1e3, 'cm³', 1, hi),
          row(t('Radius of gyration r', 'نصف قطر القصور r'), r.radius, 'mm', 1),
          row(t('Weight in steel', 'الوزن (حديد)'), r.kgPerM, 'kg/m', 2),
        ],
        note: t('Sharp corners (no root radii), so rolled sections differ slightly from catalogue values.', 'زوايا حادة بدون أنصاف أقطار، لذلك تختلف القطاعات المدرفلة قليلًا عن قيم الكتالوج.'),
      };
    },
  },
  {
    id: 'rebarspacing',
    icon: 'grid-outline',
    group: STRUCT,
    title: t('Rebar spacing for As', 'تباعد الحديد لمساحة مطلوبة'),
    desc: t('Bar spacing per metre for a required steel area', 'تباعد الأسياخ في المتر لمساحة حديد مطلوبة'),
    inputs: [
      num('As', t('Required steel area', 'مساحة الحديد المطلوبة'), 565, 'mm²/m'),
      sel('d', t('Bar diameter', 'قطر السيخ'), '12', REBAR_SIZES.map((d) => [String(d), t(`Ø${d}`, `Ø${d}`)])),
    ],
    compute: (v) => {
      if (!pos(n(v, 'As'), n(v, 'd'))) return null;
      const r = rebarSpacing(n(v, 'As'), n(v, 'd'));
      if (r.spacingPractical <= 0) return { rows: [row(t('Exact spacing', 'التباعد الدقيق'), r.spacingExact, 'mm', 0, { tone: 'bad' })], note: t('Spacing below 25 mm: use a larger bar.', 'التباعد أقل من 25 مم: استخدم قطرًا أكبر.') };
      return {
        rows: [
          row(t('Bar area', 'مساحة السيخ'), r.barArea, 'mm²', 1),
          row(t('Exact spacing', 'التباعد الدقيق'), r.spacingExact, 'mm', 0),
          row(t('Use spacing', 'التباعد المقترح'), `Ø${n(v, 'd')} @ ${r.spacingPractical}`, 'mm', undefined, hi),
          row(t('Bars per metre', 'عدد الأسياخ في المتر'), r.barsPerMetre, undefined, 2),
          row(t('Area provided', 'المساحة المحققة'), r.providedMm2PerM, 'mm²/m', 0, { highlight: true, tone: 'good' }),
        ],
        note: t('Spacing rounded down to 25 mm. Check code maximum spacing and minimum steel.', 'التباعد مقرّب لأسفل لأقرب 25 مم. راجع أقصى تباعد وأقل نسبة حديد في الكود.'),
      };
    },
  },

  // ───────────── Civil & construction ─────────────
  {
    id: 'masonry',
    icon: 'apps-outline',
    group: CIVIL,
    title: t('Blocks & bricks', 'البلوك والطوب'),
    desc: t('Units and mortar for a wall', 'عدد الوحدات والمونة لحائط'),
    inputs: [
      num('L', t('Wall length', 'طول الحائط'), 10, 'm'),
      num('H', t('Wall height', 'ارتفاع الحائط'), 3, 'm'),
      num('open', t('Openings (doors, windows)', 'الفتحات (أبواب وشبابيك)'), 4, 'm²'),
      sel('unit', t('Unit', 'الوحدة'), '400x200x200', [
        ['400x200x200', t('Block 400×200×200', 'بلوك 400×200×200')], ['400x200x150', t('Block 400×200×150', 'بلوك 400×200×150')],
        ['400x200x100', t('Block 400×200×100', 'بلوك 400×200×100')], ['250x60x120', t('Brick 250×120×60', 'طوب 250×120×60')],
        ['215x65x102.5', t('Brick 215×102.5×65', 'طوب 215×102.5×65')],
      ]),
      num('joint', t('Mortar joint', 'سمك العرموس'), 10, 'mm'),
      num('waste', t('Waste', 'الهالك'), 5, '%'),
    ],
    compute: (v) => {
      const [uL, uH, uT] = String(v.unit).split('x').map(Number);
      if (!pos(n(v, 'L'), n(v, 'H')) || !fin(n(v, 'open'), n(v, 'joint'), n(v, 'waste')) || n(v, 'joint') < 0) return null;
      const r = masonry(n(v, 'L'), n(v, 'H'), Math.max(0, n(v, 'open')), uL, uH, uT, n(v, 'joint'), Math.max(0, n(v, 'waste')) / 100);
      return {
        rows: [
          row(t('Net wall area', 'صافي مساحة الحائط'), r.netArea, 'm²', 2),
          row(t('Units per m²', 'عدد الوحدات في المتر²'), r.perM2, undefined, 1),
          row(t('Units incl. waste', 'العدد شامل الهالك'), r.units, undefined, 0, hi),
          row(t('Mortar (wet)', 'المونة (مبللة)'), r.mortarM3, 'm³', 3, hi),
        ],
        note: t('Wall thickness = unit thickness (stretcher bond). For a brick wall one brick thick, double the count.', 'سمك الحائط = سمك الوحدة (رباط طولي). لحائط بسمك طوبة كاملة ضاعف العدد.'),
      };
    },
  },
  {
    id: 'tiles',
    icon: 'grid',
    group: CIVIL,
    title: t('Tiles', 'البلاط'),
    desc: t('Tiles, boxes and adhesive for a floor or wall', 'عدد البلاط والكراتين واللاصق'),
    inputs: [
      num('A', t('Area', 'المساحة'), 25, 'm²'),
      num('w', t('Tile width', 'عرض البلاطة'), 600, 'mm'),
      num('h', t('Tile length', 'طول البلاطة'), 600, 'mm'),
      num('joint', t('Joint', 'العرموس'), 3, 'mm'),
      num('waste', t('Waste (cuts)', 'الهالك (القص)'), 10, '%'),
      num('box', t('Tiles per box', 'عدد البلاط في الكرتونة'), 4),
    ],
    compute: (v) => {
      if (!pos(n(v, 'A'), n(v, 'w'), n(v, 'h')) || !fin(n(v, 'joint'), n(v, 'waste'))) return null;
      const r = tiles(n(v, 'A'), n(v, 'w'), n(v, 'h'), Math.max(0, n(v, 'joint')), Math.max(0, n(v, 'waste')) / 100);
      return {
        rows: [
          row(t('Tiles per m²', 'عدد البلاط في المتر²'), r.perM2, undefined, 2),
          row(t('Tiles incl. waste', 'العدد شامل الهالك'), r.tiles, undefined, 0, hi),
          ...(pos(n(v, 'box')) ? [row(t('Boxes', 'الكراتين'), Math.ceil(r.tiles / n(v, 'box')), undefined, 0, hi)] : []),
          row(t('Adhesive (≈ 5 kg/m²)', 'اللاصق (≈ 5 كجم/م²)'), n(v, 'A') * 5, 'kg', 0),
        ],
      };
    },
  },
  {
    id: 'plaster',
    icon: 'brush-outline',
    group: CIVIL,
    title: t('Plaster & screed', 'المحارة والتسوية'),
    desc: t('Cement bags and sand for a cement–sand mortar', 'شكائر الأسمنت والرمل لمونة أسمنتية'),
    inputs: [
      num('A', t('Area', 'المساحة'), 100, 'm²'),
      num('th', t('Thickness', 'السمك'), 20, 'mm'),
      sel('mix', t('Mix (cement : sand)', 'النسبة (أسمنت : رمل)'), '1:4', [['1:3', t('1 : 3', '1 : 3')], ['1:4', t('1 : 4', '1 : 4')], ['1:5', t('1 : 5', '1 : 5')], ['1:6', t('1 : 6', '1 : 6')]]),
      num('bag', t('Cement bag', 'وزن الشكارة'), 50, 'kg'),
      num('waste', t('Waste', 'الهالك'), 5, '%'),
    ],
    compute: (v) => {
      const [c, s] = String(v.mix).split(':').map(Number);
      if (!pos(n(v, 'A'), n(v, 'th'), n(v, 'bag')) || !fin(n(v, 'waste'))) return null;
      const r = plaster(n(v, 'A'), n(v, 'th'), c, s, n(v, 'bag'), Math.max(0, n(v, 'waste')) / 100);
      return {
        rows: [
          row(t('Wet volume', 'الحجم المبلل'), r.wetM3, 'm³', 3),
          row(t('Cement', 'الأسمنت'), Math.ceil(r.bags), t('bags', 'شكارة'), 0, hi),
          row(t('Cement (weight)', 'الأسمنت (وزن)'), r.cementKg, 'kg', 0),
          row(t('Sand', 'الرمل'), r.sandM3, 'm³', 2, hi),
        ],
        note: t('Dry-volume factor 1.33.', 'معامل الحجم الجاف 1.33.'),
      };
    },
  },
  {
    id: 'paint',
    icon: 'color-palette-outline',
    group: CIVIL,
    title: t('Paint', 'الدهانات'),
    desc: t('Litres and buckets for walls and ceilings', 'اللترات والجرادل للحوائط والأسقف'),
    inputs: [
      num('A', t('Area', 'المساحة'), 120, 'm²'),
      num('coats', t('Coats', 'عدد الأوجه'), 2),
      num('cov', t('Coverage per coat', 'معدل التغطية للوجه'), 10, 'm²/L'),
      num('waste', t('Waste', 'الهالك'), 10, '%'),
      num('can', t('Bucket size', 'حجم الجردل'), 18, 'L'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'A'), n(v, 'coats'), n(v, 'cov')) || !fin(n(v, 'waste'))) return null;
      const L = paintLitres(n(v, 'A'), n(v, 'coats'), n(v, 'cov'), Math.max(0, n(v, 'waste')) / 100);
      return {
        rows: [
          row(t('Paint needed', 'الكمية المطلوبة'), L, 'L', 1, hi),
          ...(pos(n(v, 'can')) ? [row(t('Buckets', 'الجرادل'), Math.ceil(L / n(v, 'can')), undefined, 0, hi)] : []),
        ],
        note: t('Coverage is on the product data sheet; rough or porous surfaces need more.', 'معدل التغطية مكتوب في نشرة المنتج؛ الأسطح الخشنة أو المسامية تحتاج أكثر.'),
      };
    },
  },
  {
    id: 'earthwork',
    icon: 'layers-outline',
    group: CIVIL,
    title: t('Excavation & trucks', 'الحفر وعدد النقلات'),
    desc: t('Bank and loose volume, truck loads', 'الحجم الطبيعي والمنفوش وعدد النقلات'),
    inputs: [
      num('L', t('Length', 'الطول'), 20, 'm'),
      num('W', t('Width', 'العرض'), 15, 'm'),
      num('D', t('Depth', 'العمق'), 2, 'm'),
      sel('soil', t('Soil (swell)', 'نوع التربة (الانتفاش)'), '25', [['12', t('Sand 12%', 'رمل 12٪')], ['25', t('Common earth 25%', 'تربة عادية 25٪')], ['35', t('Clay 35%', 'طين 35٪')], ['60', t('Rock 60%', 'صخر 60٪')]]),
      num('truck', t('Truck capacity', 'سعة السيارة'), 16, 'm³'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'L'), n(v, 'W'), n(v, 'D'), n(v, 'truck'))) return null;
      const r = earthwork(n(v, 'L'), n(v, 'W'), n(v, 'D'), n(v, 'soil'), n(v, 'truck'));
      return {
        rows: [
          row(t('Bank volume', 'الحجم الطبيعي'), r.bank, 'm³', 1, hi),
          row(t('Loose volume', 'الحجم المنفوش'), r.loose, 'm³', 1),
          row(t('Truck loads', 'عدد النقلات'), r.trucks, undefined, 0, hi),
        ],
        note: t('Vertical sides. Add working space and side slopes for real trenches.', 'جوانب رأسية. أضف مسافة العمل وميول الجوانب للحفر الفعلي.'),
      };
    },
  },
  {
    id: 'steelweight',
    icon: 'barbell-outline',
    group: CIVIL,
    title: t('Steel weight', 'وزن الحديد'),
    desc: t('Plate, round bar, pipe, square and hollow sections', 'ألواح وأسياخ ومواسير ومربعات وقطاعات مجوفة'),
    inputs: [
      sel('shape', t('Shape', 'الشكل'), 'plate', [['plate', t('Plate', 'لوح')], ['round', t('Round bar', 'سيخ مصمت')], ['pipe', t('Pipe', 'ماسورة')], ['square', t('Square bar', 'مربع مصمت')], ['shs', t('Square hollow (SHS)', 'مربع مجوف')]]),
      num('pL', t('Length', 'الطول'), 2.4, 'm', (v) => v.shape === 'plate'),
      num('pW', t('Width', 'العرض'), 1.2, 'm', (v) => v.shape === 'plate'),
      num('pt', t('Thickness', 'السمك'), 10, 'mm', (v) => v.shape === 'plate'),
      num('d', t('Diameter / side', 'القطر / الضلع'), 50, 'mm', (v) => v.shape === 'round' || v.shape === 'square'),
      num('D', t('Outside diameter / side', 'القطر / الضلع الخارجي'), 114.3, 'mm', (v) => v.shape === 'pipe' || v.shape === 'shs'),
      num('t', t('Wall thickness', 'سمك الجدار'), 6, 'mm', (v) => v.shape === 'pipe' || v.shape === 'shs'),
      num('len', t('Length', 'الطول'), 6, 'm', (v) => v.shape !== 'plate'),
      num('qty', t('Quantity', 'العدد'), 1),
    ],
    compute: (v) => {
      const s = v.shape as SteelShape;
      const q = n(v, 'qty');
      let r: ReturnType<typeof steelWeight>;
      if (s === 'plate') { if (!pos(n(v, 'pL'), n(v, 'pW'), n(v, 'pt'))) return null; r = steelWeight(s, n(v, 'pL'), n(v, 'pW'), n(v, 'pt')); }
      else if (s === 'round' || s === 'square') { if (!pos(n(v, 'd'), n(v, 'len'))) return null; r = steelWeight(s, n(v, 'd'), n(v, 'len'), 0); }
      else { if (!pos(n(v, 'D'), n(v, 't'), n(v, 'len')) || 2 * n(v, 't') >= n(v, 'D')) return null; r = steelWeight(s, n(v, 'D'), n(v, 't'), n(v, 'len')); }
      if (!pos(q)) return null;
      return {
        rows: [
          ...(r.kgPerM !== null ? [row(t('Weight per metre', 'الوزن لكل متر'), r.kgPerM, 'kg/m', 2)] : []),
          row(t('Weight of one', 'وزن القطعة'), r.kg, 'kg', 2),
          row(t('Total weight', 'الوزن الكلي'), r.kg * q, 'kg', 1, hi),
          row(t('Total weight', 'الوزن الكلي'), (r.kg * q) / 1000, 't', 3),
        ],
        note: t('Steel 7850 kg/m³. Stainless ≈ ×1.02, aluminium ≈ ×0.344.', 'الحديد 7850 كجم/م³. الستانلس ≈ ×1.02، الألومنيوم ≈ ×0.344.'),
      };
    },
  },
  {
    id: 'tank',
    icon: 'beaker-outline',
    group: CIVIL,
    title: t('Tank volume', 'سعة الخزانات'),
    desc: t('Rectangular or cylindrical, m³ / litres / gallons', 'مستطيل أو أسطواني، م³ / لتر / جالون'),
    inputs: [
      sel('shape', t('Shape', 'الشكل'), 'rect', [['rect', t('Rectangular', 'مستطيل')], ['cyl', t('Vertical cylinder', 'أسطوانة رأسية')], ['hcyl', t('Horizontal cylinder', 'أسطوانة أفقية')]]),
      num('L', t('Length', 'الطول'), 4, 'm', (v) => v.shape === 'rect'),
      num('W', t('Width', 'العرض'), 3, 'm', (v) => v.shape === 'rect'),
      num('H', t('Water depth', 'عمق المياه'), 2, 'm', (v) => v.shape === 'rect'),
      num('D', t('Diameter', 'القطر'), 2.5, 'm', (v) => v.shape !== 'rect'),
      num('CH', t('Height / length', 'الارتفاع / الطول'), 3, 'm', (v) => v.shape !== 'rect'),
    ],
    compute: (v) => {
      const s = v.shape as 'rect' | 'cyl' | 'hcyl';
      const xs = s === 'rect' ? [n(v, 'L'), n(v, 'W'), n(v, 'H')] : [n(v, 'D'), n(v, 'CH'), 0];
      if (!pos(xs[0], xs[1]) || (s === 'rect' && !pos(xs[2]))) return null;
      const r = tankVolume(s, xs[0], xs[1], xs[2]);
      return {
        rows: [
          row(t('Volume', 'الحجم'), r.m3, 'm³', 3, hi),
          row(t('Volume', 'الحجم'), r.litres, 'L', 0, hi),
          row(t('US gallons', 'جالون أمريكي'), r.usGallons, 'gal', 0),
          row(t('Imperial gallons', 'جالون إنجليزي'), r.ukGallons, 'gal', 0),
          row(t('Water weight', 'وزن المياه'), r.m3, 't', 2),
        ],
      };
    },
  },
  {
    id: 'stairs',
    icon: 'stats-chart-outline',
    group: CIVIL,
    title: t('Stairs', 'السلالم'),
    desc: t('Risers, going and run (Blondel rule)', 'القائم والنائم وطول السلم (قاعدة بلونديل)'),
    inputs: [
      num('H', t('Floor-to-floor height', 'الارتفاع بين الأدوار'), 3200, 'mm'),
      num('R', t('Maximum riser', 'أقصى ارتفاع للقائم'), 175, 'mm'),
      num('B', t('2R + G target', 'هدف 2R + G'), 630, 'mm'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'H'), n(v, 'R'), n(v, 'B'))) return null;
      const r = stairs(n(v, 'H'), n(v, 'R'), n(v, 'B'));
      if (r.going <= 0) return null;
      return {
        rows: [
          row(t('Risers', 'عدد القوائم'), r.risers, undefined, 0, hi),
          row(t('Riser height', 'ارتفاع القائم'), r.riser, 'mm', 1, hi),
          row(t('Treads', 'عدد النوائم'), r.treads, undefined, 0),
          row(t('Going (tread)', 'عرض النائم'), r.going, 'mm', 0, { highlight: true, tone: r.going >= 250 ? 'good' : 'warn' }),
          row(t('Horizontal run', 'الطول الأفقي'), r.runMm / 1000, 'm', 2),
          row(t('Pitch', 'زاوية الميل'), r.angle, '°', 1, { tone: r.angle <= 38 ? 'good' : 'bad' }),
        ],
        note: t('Single straight flight, no landing. Check local building code limits.', 'قلبة واحدة مستقيمة بدون بسطة. راجع حدود كود البناء المحلي.'),
      };
    },
  },

  // ───────────── Electrical ─────────────
  {
    id: 'ohm',
    icon: 'git-network-outline',
    group: ELEC,
    title: t("Ohm's law", 'قانون أوم'),
    desc: t('Enter any two of V, I, R, P', 'أدخل أي قيمتين من الجهد والتيار والمقاومة والقدرة'),
    inputs: [
      num('V', t('Voltage V', 'الجهد V'), 230, 'V'),
      num('I', t('Current I', 'التيار I'), 10, 'A'),
      num('R', t('Resistance R', 'المقاومة R'), NaN, 'Ω'),
      num('P', t('Power P', 'القدرة P'), NaN, 'W'),
    ],
    compute: (v) => {
      const r = ohm(n(v, 'V'), n(v, 'I'), n(v, 'R'), n(v, 'P'));
      if (!r) return null;
      return {
        rows: [
          row(t('Voltage', 'الجهد'), r.V, 'V', 3, hi),
          row(t('Current', 'التيار'), r.I, 'A', 4, hi),
          row(t('Resistance', 'المقاومة'), r.R, 'Ω', 4, hi),
          row(t('Power', 'القدرة'), r.P, 'W', 3, hi),
        ],
        note: t('Leave the unknowns blank. If more than two are filled, the first pair (V, I, R, P order) is used. DC or resistive AC.', 'اترك المجاهيل فارغة. إذا ملأت أكثر من قيمتين تُستخدم أول قيمتين بالترتيب (V، I، R، P). تيار مستمر أو متردد مقاومي.'),
      };
    },
  },
  {
    id: 'resistors',
    icon: 'options-outline',
    group: ELEC,
    title: t('Resistors in series / parallel', 'المقاومات على التوالي / التوازي'),
    desc: t('Up to six resistors (also capacitors / inductors)', 'حتى ست مقاومات (وأيضًا المكثفات والملفات)'),
    inputs: [
      sel('mode', t('Connection', 'التوصيل'), 'parallel', [['series', t('Series', 'توالي')], ['parallel', t('Parallel', 'توازي')]]),
      num('r1', t('R1', 'R1'), 100, 'Ω'),
      num('r2', t('R2', 'R2'), 220, 'Ω'),
      num('r3', t('R3', 'R3'), NaN, 'Ω'),
      num('r4', t('R4', 'R4'), NaN, 'Ω'),
      num('r5', t('R5', 'R5'), NaN, 'Ω'),
      num('r6', t('R6', 'R6'), NaN, 'Ω'),
    ],
    compute: (v) => {
      const vs = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((k) => n(v, k));
      const r = resistors(vs, v.mode as 'series' | 'parallel');
      if (!Number.isFinite(r)) return null;
      return {
        rows: [
          row(t('Equivalent resistance', 'المقاومة المكافئة'), r, 'Ω', 3, hi),
          row(t('Resistors used', 'عدد المقاومات'), vs.filter((x) => pos(x)).length, undefined, 0),
        ],
        note: t('Inductors combine like resistors. Capacitors are the opposite: use "parallel" for capacitors in series.', 'الملفات تُجمع مثل المقاومات. المكثفات عكسها: استخدم "توازي" للمكثفات الموصلة على التوالي.'),
      };
    },
  },
  {
    id: 'pf',
    icon: 'battery-charging-outline',
    group: ELEC,
    title: t('Power factor correction', 'تحسين معامل القدرة'),
    desc: t('Capacitor kVAr and µF, current before and after', 'قدرة المكثفات kVAr والسعة µF والتيار قبل وبعد'),
    inputs: [
      PHASES,
      num('P', t('Active power', 'القدرة الفعالة'), 100, 'kW'),
      num('pf1', t('Present power factor', 'معامل القدرة الحالي'), 0.75),
      num('pf2', t('Target power factor', 'معامل القدرة المستهدف'), 0.95),
      num('V', t('Voltage (line)', 'الجهد (بين الخطوط)'), 400, 'V'),
      sel('f', t('Frequency', 'التردد'), '50', [['50', t('50 Hz', '50 هرتز')], ['60', t('60 Hz', '60 هرتز')]]),
    ],
    compute: (v) => {
      const [P, a, b, V] = [n(v, 'P'), n(v, 'pf1'), n(v, 'pf2'), n(v, 'V')];
      if (!pos(P, a, b, V) || a > 1 || b > 1 || b <= a) return null;
      const r = pfCorrection(P, a, b, V, n(v, 'f'), ph(v));
      return {
        rows: [
          row(t('Capacitor bank', 'بنك المكثفات'), r.kvar, 'kVAr', 1, hi),
          row(ph(v) === 3 ? t('Capacitance per phase (delta)', 'السعة لكل طور (دلتا)') : t('Capacitance', 'السعة'), r.microfarad, 'µF', 0),
          row(t('Current before', 'التيار قبل'), r.currentBefore, 'A', 1),
          row(t('Current after', 'التيار بعد'), r.currentAfter, 'A', 1, { highlight: true, tone: 'good' }),
          row(t('Current reduction', 'نسبة انخفاض التيار'), (1 - r.currentAfter / r.currentBefore) * 100, '%', 1),
        ],
        note: t('Choose the next standard bank size. Check harmonics before installing capacitors.', 'اختر أقرب بنك قياسي أكبر. راجع التوافقيات قبل تركيب المكثفات.'),
      };
    },
  },
  {
    id: 'motor',
    icon: 'cog-outline',
    group: ELEC,
    title: t('Motor current', 'تيار المحرك'),
    desc: t('Full-load and starting current from kW', 'تيار الحمل الكامل وتيار البدء من القدرة'),
    inputs: [
      PHASES,
      num('kW', t('Motor rated power', 'قدرة المحرك'), 22, 'kW'),
      num('V', t('Voltage', 'الجهد'), 400, 'V'),
      num('pf', t('Power factor', 'معامل القدرة'), 0.86),
      num('eff', t('Efficiency', 'الكفاءة'), 92, '%'),
    ],
    compute: (v) => {
      const [kW, V, pf, e] = [n(v, 'kW'), n(v, 'V'), n(v, 'pf'), n(v, 'eff')];
      if (!pos(kW, V, pf, e) || pf > 1 || e > 100) return null;
      const I = motorCurrent(kW, V, pf, e / 100, ph(v));
      return {
        rows: [
          row(t('Full-load current', 'تيار الحمل الكامل'), I, 'A', 1, hi),
          row(t('Input power', 'القدرة الداخلة'), kW / (e / 100), 'kW', 2),
          row(t('Starting current, DOL (≈ 6–7×)', 'تيار البدء المباشر (≈ 6–7×)'), `${(I * 6).toFixed(0)} – ${(I * 7).toFixed(0)}`, 'A'),
          ...(ph(v) === 3 ? [row(t('Starting current, star-delta (≈ ⅓ DOL)', 'تيار البدء ستار-دلتا (≈ ⅓)'), `${(I * 2).toFixed(0)} – ${((I * 7) / 3).toFixed(0)}`, 'A')] : []),
        ],
        note: t('Use the nameplate current when available. Size cables and protection to the code.', 'استخدم تيار لوحة البيانات عند توفرها. حدد الكابلات والحماية حسب الكود.'),
      };
    },
  },
  {
    id: 'energy',
    icon: 'cash-outline',
    group: ELEC,
    title: t('Energy cost', 'تكلفة الطاقة'),
    desc: t('kWh and cost per period', 'الاستهلاك بالكيلوواط ساعة والتكلفة'),
    inputs: [
      num('kW', t('Load', 'الحمل'), 2.5, 'kW'),
      num('h', t('Hours per day', 'ساعات التشغيل يوميًا'), 8, 'h'),
      num('d', t('Days', 'عدد الأيام'), 30),
      num('tariff', t('Tariff per kWh', 'التعريفة لكل ك.و.س'), 0.18),
    ],
    compute: (v) => {
      if (!pos(n(v, 'kW'), n(v, 'h'), n(v, 'd')) || !fin(n(v, 'tariff')) || n(v, 'h') > 24) return null;
      const r = energyCost(n(v, 'kW'), n(v, 'h'), n(v, 'd'), n(v, 'tariff'));
      return {
        rows: [
          row(t('Energy', 'الطاقة'), r.kWh, 'kWh', 1, hi),
          row(t('Cost', 'التكلفة'), r.cost, t('currency', 'عملة'), 2, hi),
          row(t('Cost per day', 'التكلفة اليومية'), r.cost / n(v, 'd'), t('currency', 'عملة'), 2),
        ],
      };
    },
  },
  {
    id: 'transformer',
    icon: 'magnet-outline',
    group: ELEC,
    title: t('Transformer size & fault level', 'قدرة المحول ومستوى القصر'),
    desc: t('kVA with growth, standard size, current and fault kA', 'القدرة مع التوسع والمقاس القياسي والتيار وتيار القصر'),
    inputs: [
      num('P', t('Total load', 'إجمالي الحمل'), 450, 'kW'),
      num('pf', t('Power factor', 'معامل القدرة'), 0.85),
      num('g', t('Future growth', 'نسبة التوسع المستقبلي'), 20, '%'),
      num('V', t('Secondary voltage', 'الجهد الثانوي'), 400, 'V'),
      num('z', t('Impedance', 'المعاوقة'), 6, '%Z'),
    ],
    compute: (v) => {
      const [P, pf, g, V, z] = [n(v, 'P'), n(v, 'pf'), n(v, 'g'), n(v, 'V'), n(v, 'z')];
      if (!pos(P, pf, V, z) || pf > 1 || !fin(g)) return null;
      const r = transformerSize(P, pf, Math.max(0, g));
      const kva = r.standardKVA ?? r.requiredKVA;
      return {
        rows: [
          row(t('Required', 'المطلوب'), r.requiredKVA, 'kVA', 0),
          row(t('Standard size', 'المقاس القياسي'), r.standardKVA ?? `> ${TRANSFORMERS[TRANSFORMERS.length - 1]}`, r.standardKVA ? 'kVA' : undefined, 0, hi),
          row(t('Rated secondary current', 'التيار المقنن الثانوي'), (kva * 1000) / (Math.sqrt(3) * V), 'A', 0),
          row(t('Fault current at terminals', 'تيار القصر عند الأطراف'), transformerFault(kva, V, z), 'kA', 1, hi),
        ],
        note: t('Fault level assumes an infinite upstream source (worst case). Loading also depends on cooling and ambient.', 'تيار القصر بفرض مصدر لانهائي (أسوأ حالة). التحميل يعتمد أيضًا على التبريد والحرارة المحيطة.'),
      };
    },
  },
  {
    id: 'lighting',
    icon: 'bulb-outline',
    group: ELEC,
    title: t('Lighting (lumen method)', 'الإنارة (طريقة اللومن)'),
    desc: t('Number of luminaires for a target lux', 'عدد الكشافات لشدة إضاءة مطلوبة'),
    inputs: [
      num('A', t('Room area', 'مساحة الغرفة'), 60, 'm²'),
      sel('lux', t('Target illuminance', 'شدة الإضاءة المطلوبة'), '500', [
        ['150', t('Corridor 150', 'ممر 150')], ['300', t('Classroom 300', 'فصل 300')], ['500', t('Office 500', 'مكتب 500')],
        ['750', t('Drawing / lab 750', 'رسم / معمل 750')], ['200', t('Warehouse 200', 'مخزن 200')],
      ]),
      num('lm', t('Lumens per luminaire', 'اللومن لكل كشاف'), 3600, 'lm'),
      num('W', t('Watts per luminaire', 'القدرة لكل كشاف'), 36, 'W'),
      num('uf', t('Utilisation factor', 'معامل الاستخدام'), 0.6),
      num('mf', t('Maintenance factor', 'معامل الصيانة'), 0.8),
    ],
    compute: (v) => {
      const [A, lux, lm, uf, mf] = [n(v, 'A'), n(v, 'lux'), n(v, 'lm'), n(v, 'uf'), n(v, 'mf')];
      if (!pos(A, lux, lm, uf, mf) || uf > 1 || mf > 1) return null;
      const exact = luminaires(A, lux, lm, uf, mf);
      const count = Math.ceil(exact);
      return {
        rows: [
          row(t('Luminaires (exact)', 'عدد الكشافات (دقيق)'), exact, undefined, 2),
          row(t('Luminaires', 'عدد الكشافات'), count, undefined, 0, hi),
          row(t('Achieved illuminance', 'شدة الإضاءة المحققة'), (count * lm * uf * mf) / A, 'lux', 0),
          ...(pos(n(v, 'W')) ? [row(t('Power density', 'كثافة القدرة'), (count * n(v, 'W')) / A, 'W/m²', 1)] : []),
        ],
      };
    },
  },
  {
    id: 'ups',
    icon: 'battery-half-outline',
    group: ELEC,
    title: t('Battery / UPS backup time', 'زمن التشغيل بالبطاريات / UPS'),
    desc: t('Runtime from battery Ah, voltage and load', 'زمن التشغيل من سعة البطارية والجهد والحمل'),
    inputs: [
      num('Ah', t('Battery capacity', 'سعة البطارية'), 200, 'Ah'),
      num('V', t('Battery bank voltage', 'جهد مجموعة البطاريات'), 24, 'V'),
      num('W', t('Load', 'الحمل'), 800, 'W'),
      num('dod', t('Usable depth of discharge', 'عمق التفريغ المسموح'), 80, '%'),
      num('eff', t('Inverter efficiency', 'كفاءة الإنفرتر'), 90, '%'),
    ],
    compute: (v) => {
      const [Ah, V, W, dod, e] = [n(v, 'Ah'), n(v, 'V'), n(v, 'W'), n(v, 'dod'), n(v, 'eff')];
      if (!pos(Ah, V, W, dod, e) || dod > 100 || e > 100) return null;
      const h = backupHours(Ah, V, W, dod / 100, e / 100);
      return {
        rows: [
          row(t('Backup time', 'زمن التشغيل'), h, 'h', 2, hi),
          row(t('Backup time', 'زمن التشغيل'), h * 60, 'min', 0),
          row(t('Stored energy', 'الطاقة المخزنة'), (Ah * V) / 1000, 'kWh', 2),
        ],
        note: t('Use 50% depth of discharge for lead-acid, 80–90% for lithium. High loads reduce real capacity (Peukert).', 'استخدم 50٪ لبطاريات الرصاص و80–90٪ لليثيوم. الأحمال العالية تقلل السعة الفعلية (بيوكرت).'),
      };
    },
  },
  {
    id: 'solar',
    icon: 'sunny-outline',
    group: ELEC,
    title: t('Solar PV sizing', 'تصميم الطاقة الشمسية'),
    desc: t('Array kWp, panels and battery for a daily load', 'قدرة المصفوفة وعدد الألواح والبطاريات لحمل يومي'),
    inputs: [
      num('E', t('Daily energy use', 'الاستهلاك اليومي'), 12, 'kWh'),
      num('sun', t('Peak sun hours', 'ساعات الذروة الشمسية'), 5.5, 'h'),
      num('pw', t('Panel rating', 'قدرة اللوح'), 550, 'W'),
      num('loss', t('System losses', 'فواقد النظام'), 20, '%'),
      num('days', t('Battery autonomy (0 = grid-tied)', 'أيام التخزين (0 = متصل بالشبكة)'), 1, 'day'),
      num('bv', t('Battery bank voltage', 'جهد البطاريات'), 48, 'V'),
    ],
    compute: (v) => {
      const [E, sun, pw, loss] = [n(v, 'E'), n(v, 'sun'), n(v, 'pw'), n(v, 'loss')];
      if (!pos(E, sun, pw) || !fin(loss) || loss < 0 || loss >= 100) return null;
      const r = solar(E, sun, pw, loss);
      const days = n(v, 'days');
      const ah = pos(days, n(v, 'bv')) ? (E * days * 1000) / (n(v, 'bv') * 0.8 * 0.9) : 0; // 80% DoD, 90% inverter
      return {
        rows: [
          row(t('Array size', 'قدرة المصفوفة'), r.kWp, 'kWp', 2, hi),
          row(t('Panels', 'عدد الألواح'), r.panels, undefined, 0, hi),
          row(t('Installed', 'القدرة المركبة'), (r.panels * pw) / 1000, 'kWp', 2),
          ...(ah > 0 ? [row(t('Battery (80% DoD, 90% inverter)', 'البطاريات (تفريغ 80٪، كفاءة إنفرتر 90٪)'), ah, 'Ah', 0, hi)] : []),
        ],
        note: t('Peak sun hours depend on site and month; use the worst month for off-grid.', 'ساعات الذروة تعتمد على الموقع والشهر؛ استخدم أسوأ شهر للأنظمة المنفصلة.'),
      };
    },
  },

  // ───────────── Mechanical & HVAC ─────────────
  {
    id: 'cooling',
    icon: 'snow-outline',
    group: MECH,
    title: t('Cooling load estimate', 'تقدير حمل التبريد'),
    desc: t('Quick kW, BTU/h and TR by area', 'تقدير سريع بالكيلوواط والوحدة الحرارية والطن'),
    inputs: [
      num('A', t('Floor area', 'مساحة الأرضية'), 100, 'm²'),
      sel('use', t('Space type', 'نوع المكان'), '150', [
        ['120', t('Residential 120 W/m²', 'سكني 120 واط/م²')], ['150', t('Office 150 W/m²', 'مكاتب 150 واط/م²')],
        ['200', t('Retail 200 W/m²', 'محلات 200 واط/م²')], ['250', t('Restaurant / gym 250 W/m²', 'مطعم / جيم 250 واط/م²')],
        ['300', t('Hot climate, glazed 300 W/m²', 'مناخ حار وزجاج كثير 300 واط/م²')],
      ]),
    ],
    compute: (v) => {
      if (!pos(n(v, 'A'))) return null;
      const r = coolingEstimate(n(v, 'A'), n(v, 'use'));
      return {
        rows: [
          row(t('Cooling load', 'حمل التبريد'), r.kW, 'kW', 1, hi),
          row(t('Cooling load', 'حمل التبريد'), r.tr, 'TR', 2, hi),
          row(t('Cooling load', 'حمل التبريد'), r.btuh, 'BTU/h', 0),
        ],
        note: t('Rule of thumb for early budgeting only. Do a full heat-load calculation for design.', 'قاعدة تقريبية للتقدير المبدئي فقط. اعمل حساب أحمال كامل للتصميم.'),
      };
    },
  },
  {
    id: 'duct',
    icon: 'albums-outline',
    group: MECH,
    title: t('Duct sizing', 'تصميم مجاري الهواء'),
    desc: t('Round and rectangular duct for an airflow', 'مجرى دائري ومستطيل لكمية هواء'),
    inputs: [
      num('Q', t('Airflow', 'كمية الهواء'), 2000, 'm³/h'),
      num('vel', t('Velocity', 'السرعة'), 5, 'm/s'),
      num('h', t('Rectangular duct height', 'ارتفاع المجرى المستطيل'), 300, 'mm'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'Q'), n(v, 'vel'))) return null;
      const r = duct(n(v, 'Q'), n(v, 'vel'), pos(n(v, 'h')) ? n(v, 'h') : 0);
      return {
        rows: [
          row(t('Airflow', 'كمية الهواء'), r.cfm, 'cfm', 0),
          row(t('Cross-section area', 'مساحة المقطع'), r.areaM2, 'm²', 4),
          row(t('Round duct diameter', 'قطر المجرى الدائري'), r.roundMm, 'mm', 0, hi),
          ...(Number.isFinite(r.rectWidthMm) ? [
            row(t('Rectangular width', 'عرض المجرى المستطيل'), `${Math.round(r.rectWidthMm)} × ${n(v, 'h')}`, 'mm', undefined, hi),
            row(t('Aspect ratio', 'نسبة الأبعاد'), Math.max(r.rectWidthMm, n(v, 'h')) / Math.min(r.rectWidthMm, n(v, 'h')), ': 1', 1, { tone: Math.max(r.rectWidthMm, n(v, 'h')) / Math.min(r.rectWidthMm, n(v, 'h')) <= 4 ? 'good' : 'warn' }),
            row(t('Equivalent round (friction)', 'القطر المكافئ (للاحتكاك)'), r.equivalentMm, 'mm', 0),
          ] : []),
        ],
        note: t('Typical velocities: mains 5–8 m/s, branches 3–5 m/s, quiet rooms 2–3 m/s. Keep aspect ratio ≤ 4.', 'السرعات المعتادة: الرئيسي 5–8 م/ث، الفرعي 3–5 م/ث، الأماكن الهادئة 2–3 م/ث. اجعل نسبة الأبعاد ≤ 4.'),
      };
    },
  },
  {
    id: 'pipesize',
    icon: 'git-merge-outline',
    group: MECH,
    title: t('Pipe sizing by velocity', 'تحديد قطر الماسورة بالسرعة'),
    desc: t('Required bore and nearest Sch 40 pipe', 'القطر الداخلي المطلوب وأقرب ماسورة Sch 40'),
    inputs: [
      num('Q', t('Flow rate', 'معدل السريان'), 20, 'm³/h'),
      num('vel', t('Design velocity', 'السرعة التصميمية'), 1.5, 'm/s'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'Q'), n(v, 'vel'))) return null;
      const d = pipeDiameterForVelocity(n(v, 'Q'), n(v, 'vel'));
      const p = pipeForBore(d);
      const actualV = p ? n(v, 'Q') / 3600 / ((Math.PI / 4) * (pipeId(p) / 1000) ** 2) : NaN;
      return {
        rows: [
          row(t('Required internal diameter', 'القطر الداخلي المطلوب'), d, 'mm', 1, hi),
          row(t('Steel pipe Sch 40', 'ماسورة حديد Sch 40'), p ? `DN ${p[0]} (${p[1]})` : t('Larger than DN 300', 'أكبر من DN 300'), undefined, undefined, hi),
          ...(p ? [row(t('Bore of that pipe', 'القطر الداخلي لها'), pipeId(p), 'mm', 1), row(t('Actual velocity', 'السرعة الفعلية'), actualV, 'm/s', 2, { tone: actualV > 3 ? 'bad' : actualV > 2 ? 'warn' : 'good' })] : []),
        ],
        note: t('Water: 1–2 m/s typical (pump suction 0.6–1.2 m/s). Then check pressure drop with the pipe tool.', 'المياه: 1–2 م/ث عادةً (سحب المضخة 0.6–1.2 م/ث). ثم افحص فاقد الضغط بأداة المواسير.'),
      };
    },
  },
  {
    id: 'heat',
    icon: 'thermometer-outline',
    group: MECH,
    title: t('Heat transfer: water or air', 'الحمل الحراري: مياه أو هواء'),
    desc: t('Q = m·cp·ΔT for chilled water, hot water or air', 'Q = m·cp·ΔT للمياه المثلجة أو الساخنة أو الهواء'),
    inputs: [
      sel('medium', t('Medium', 'الوسط'), 'water', [['water', t('Water', 'مياه')], ['air', t('Air (sensible)', 'هواء (محسوس)')]]),
      num('Q', t('Flow rate', 'معدل السريان'), 10, 'm³/h'),
      num('dT', t('Temperature difference ΔT', 'فرق الحرارة ΔT'), 5, 'K'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'Q'), n(v, 'dT'))) return null;
      const kW = v.medium === 'air' ? airSensibleKW(n(v, 'Q'), n(v, 'dT')) : waterHeatKW(n(v, 'Q'), n(v, 'dT'));
      return {
        rows: [
          row(t('Heat', 'الحمل الحراري'), kW, 'kW', 2, hi),
          row(t('Heat', 'الحمل الحراري'), kW / 3.5168528420667, 'TR', 2),
          row(t('Heat', 'الحمل الحراري'), kW * 3412.14, 'BTU/h', 0),
          ...(v.medium === 'water' ? [row(t('Flow', 'التصرف'), (n(v, 'Q') * 1000) / 3600, 'L/s', 2)] : []),
        ],
        note: v.medium === 'air' ? t('Air ρ 1.2 kg/m³, cp 1.006 kJ/kg·K, sensible heat only.', 'الهواء ρ 1.2 كجم/م³، cp 1.006، حرارة محسوسة فقط.') : t('Water ρ 998 kg/m³, cp 4.186 kJ/kg·K.', 'المياه ρ 998 كجم/م³، cp 4.186.'),
      };
    },
  },
  {
    id: 'drive',
    icon: 'sync-outline',
    group: MECH,
    title: t('Pulleys & gears', 'البكرات والتروس'),
    desc: t('Speed ratio, output rpm and torque', 'نسبة السرعة وسرعة الخرج والعزم'),
    inputs: [
      num('rpm', t('Input speed', 'سرعة الدخل'), 1450, 'rpm'),
      num('a', t('Driver pulley Ø / teeth', 'قطر / أسنان البكرة القائدة'), 100),
      num('b', t('Driven pulley Ø / teeth', 'قطر / أسنان البكرة المنقادة'), 250),
      num('kW', t('Input power (optional)', 'قدرة الدخل (اختياري)'), 5.5, 'kW'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'rpm'), n(v, 'a'), n(v, 'b'))) return null;
      const r = drive(n(v, 'rpm'), n(v, 'a'), n(v, 'b'), pos(n(v, 'kW')) ? n(v, 'kW') : undefined);
      return {
        rows: [
          row(t('Ratio', 'النسبة'), `${r.ratio.toFixed(3)} : 1`, undefined, undefined),
          row(t('Output speed', 'سرعة الخرج'), r.outputRpm, 'rpm', 0, hi),
          ...(r.outputTorque ? [row(t('Output torque (no losses)', 'عزم الخرج (بدون فواقد)'), r.outputTorque, 'N·m', 1, hi)] : []),
        ],
      };
    },
  },
  {
    id: 'bolt',
    icon: 'construct-outline',
    group: MECH,
    title: t('Bolt tightening torque', 'عزم ربط المسامير'),
    desc: t('Preload and torque for metric bolts', 'قوة الشد المسبق والعزم للمسامير المترية'),
    inputs: [
      sel('size', t('Bolt size', 'مقاس المسمار'), 'M20', BOLTS.map((b) => [b[0], t(b[0], b[0])])),
      sel('grade', t('Property class', 'الرتبة'), '8.8', [['8.8', t('8.8', '8.8')], ['10.9', t('10.9', '10.9')], ['12.9', t('12.9', '12.9')]]),
      sel('K', t('Condition (nut factor K)', 'الحالة (معامل K)'), '0.2', [['0.2', t('Dry, plain 0.20', 'جاف 0.20')], ['0.18', t('Zinc plated 0.18', 'مجلفن 0.18')], ['0.15', t('Lubricated 0.15', 'مشحم 0.15')], ['0.12', t('Anti-seize / moly 0.12', 'مانع التصاق 0.12')]]),
      num('pct', t('Preload as % of proof load', 'الشد المسبق كنسبة من حمل الإثبات'), 75, '%'),
    ],
    compute: (v) => {
      const b = BOLTS.find((x) => x[0] === v.size);
      if (!b || !pos(n(v, 'pct')) || n(v, 'pct') > 100) return null;
      const proof = (proofStress(String(v.grade), b[1]) * b[3]) / 1000; // kN
      const F = (proof * n(v, 'pct')) / 100;
      const T = boltTorque(n(v, 'K'), F, b[1]);
      return {
        rows: [
          row(t('Tensile stress area', 'مساحة إجهاد الشد'), b[3], 'mm²', 1),
          row(t('Proof load', 'حمل الإثبات'), proof, 'kN', 1),
          row(t('Preload', 'قوة الشد المسبق'), F, 'kN', 1, hi),
          row(t('Tightening torque', 'عزم الربط'), T, 'N·m', 0, hi),
          row(t('Tightening torque', 'عزم الربط'), T / 1.3558179483314, 'lbf·ft', 0),
          row(t('Spanner size', 'مقاس المفتاح'), b[4], 'mm', 0),
        ],
        note: t('T = K·F·d. Friction varies a lot; follow the manufacturer or project specification when given.', 'T = K·F·d. الاحتكاك يتغير كثيرًا؛ اتبع المُصنّع أو مواصفات المشروع إن وُجدت.'),
      };
    },
  },
  {
    id: 'hydrostatic',
    icon: 'water',
    group: MECH,
    title: t('Hydrostatic pressure', 'الضغط الهيدروستاتيكي'),
    desc: t('Pressure at depth for water, oil and more', 'الضغط عند عمق للمياه والزيت وغيرها'),
    inputs: [
      num('h', t('Depth / head', 'العمق / الرفع'), 10, 'm'),
      sel('fluid', t('Fluid', 'السائل'), 'water', [['water', t('Water', 'مياه')], ['seawater', t('Sea water', 'مياه البحر')], ['diesel', t('Diesel', 'ديزل')], ['oil', t('Oil', 'زيت')], ['mercury', t('Mercury', 'زئبق')]]),
    ],
    compute: (v) => {
      if (!pos(n(v, 'h'))) return null;
      const Pa = hydrostatic(n(v, 'h'), FLUIDS[v.fluid as Fluid]);
      return {
        rows: [
          row(t('Pressure', 'الضغط'), Pa / 1000, 'kPa', 2, hi),
          row(t('Pressure', 'الضغط'), Pa / 1e5, 'bar', 3, hi),
          row(t('Pressure', 'الضغط'), Pa / 6894.757293168, 'psi', 2),
          row(t('Absolute (+1 atm)', 'مطلق (+1 ض.ج)'), (Pa + 101325) / 1e5, 'bar(a)', 3),
        ],
      };
    },
  },
  {
    id: 'filltime',
    icon: 'hourglass-outline',
    group: MECH,
    title: t('Tank fill / drain time', 'زمن ملء / تفريغ الخزان'),
    desc: t('Time from volume and flow', 'الزمن من الحجم والتصرف'),
    inputs: [
      num('V', t('Volume', 'الحجم'), 50, 'm³'),
      num('Q', t('Flow rate', 'معدل السريان'), 12, 'm³/h'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'V'), n(v, 'Q'))) return null;
      const m = fillTimeMinutes(n(v, 'V'), n(v, 'Q'));
      const hh = Math.floor(m / 60);
      const mm = Math.round(m - hh * 60);
      return {
        rows: [
          row(t('Time', 'الزمن'), `${hh} h ${String(mm).padStart(2, '0')} min`, undefined, undefined, hi),
          row(t('Time', 'الزمن'), m, 'min', 1),
          row(t('Flow', 'التصرف'), (n(v, 'Q') * 1000) / 3600, 'L/s', 2),
        ],
      };
    },
  },
  {
    id: 'expansion',
    icon: 'resize-outline',
    group: MECH,
    title: t('Thermal expansion', 'التمدد الحراري'),
    desc: t('Length change of pipes, rails and members', 'تغير طول المواسير والقضبان والعناصر'),
    inputs: [
      sel('mat', t('Material', 'المادة'), 'steel', [
        ['steel', t('Carbon steel', 'حديد كربوني')], ['stainless', t('Stainless', 'ستانلس')], ['concrete', t('Concrete', 'خرسانة')], ['aluminium', t('Aluminium', 'ألومنيوم')],
        ['copper', t('Copper', 'نحاس')], ['pvc', t('PVC', 'PVC')], ['hdpe', t('HDPE', 'HDPE')], ['glass', t('Glass', 'زجاج')],
      ]),
      num('L', t('Length', 'الطول'), 50, 'm'),
      num('dT', t('Temperature change ΔT', 'تغير الحرارة ΔT'), 40, 'K'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'L')) || !fin(n(v, 'dT'))) return null;
      const a = EXPANSION[v.mat as ExpansionMaterial];
      const mm = thermalExpansionMm(n(v, 'L'), n(v, 'dT'), a);
      return {
        rows: [
          row(t('Change in length', 'التغير في الطول'), mm, 'mm', 2, hi),
          row(t('Coefficient α', 'المعامل α'), a * 1e6, '×10⁻⁶ /K', 1),
          ...(['steel', 'stainless', 'aluminium', 'copper', 'concrete'].includes(String(v.mat)) ? [row(t('Stress if fully restrained', 'الإجهاد لو مقيد تمامًا'), a * Math.abs(n(v, 'dT')) * ({ steel: 200, stainless: 193, aluminium: 69, copper: 117, concrete: 30 } as Record<string, number>)[String(v.mat)] * 1000, 'MPa', 0)] : []),
        ],
      };
    },
  },

  // ───────────── Process & chemical ─────────────
  {
    id: 'dilution',
    icon: 'flask-outline',
    group: PROC,
    title: t('Dilution C₁V₁ = C₂V₂', 'التخفيف C₁V₁ = C₂V₂'),
    desc: t('Leave one value blank to solve for it', 'اترك قيمة واحدة فارغة لحسابها'),
    inputs: [
      num('C1', t('Stock concentration C₁', 'التركيز الأصلي C₁'), 37),
      num('V1', t('Stock volume V₁', 'الحجم الأصلي V₁'), NaN),
      num('C2', t('Final concentration C₂', 'التركيز النهائي C₂'), 10),
      num('V2', t('Final volume V₂', 'الحجم النهائي V₂'), 1000),
    ],
    compute: (v) => {
      const xs = ['C1', 'V1', 'C2', 'V2'].map((k) => n(v, k));
      if (xs.filter((x) => !Number.isFinite(x)).length !== 1) return null;
      if (!xs.every((x) => !Number.isFinite(x) || x > 0)) return null;
      const r = dilution(xs[0], xs[1], xs[2], xs[3]);
      const solved = ['C1', 'V1', 'C2', 'V2'][xs.findIndex((x) => !Number.isFinite(x))];
      return {
        rows: [
          row(t('C₁', 'C₁'), r.C1, undefined, 4, { highlight: solved === 'C1' }),
          row(t('V₁', 'V₁'), r.V1, undefined, 4, { highlight: solved === 'V1' }),
          row(t('C₂', 'C₂'), r.C2, undefined, 4, { highlight: solved === 'C2' }),
          row(t('V₂', 'V₂'), r.V2, undefined, 4, { highlight: solved === 'V2' }),
          ...(solved === 'V1' ? [row(t('Solvent to add', 'المذيب المضاف'), r.V2 - r.V1, undefined, 4)] : []),
        ],
        note: t('Use the same units on both sides (%, mol/L, mg/L… and mL, L…).', 'استخدم نفس الوحدات على الجانبين (٪، مول/لتر، مجم/لتر… و مل، لتر…).'),
      };
    },
  },
  {
    id: 'gas',
    icon: 'cloud-outline',
    group: PROC,
    title: t('Ideal gas', 'الغاز المثالي'),
    desc: t('Moles, mass and density from P, V, T', 'عدد المولات والكتلة والكثافة من الضغط والحجم والحرارة'),
    inputs: [
      sel('gas', t('Gas', 'الغاز'), '28.97', [
        ['28.97', t('Air', 'هواء')], ['28.01', t('Nitrogen N₂', 'نيتروجين N₂')], ['32', t('Oxygen O₂', 'أكسجين O₂')], ['44.01', t('CO₂', 'CO₂')],
        ['16.04', t('Methane CH₄', 'ميثان CH₄')], ['44.1', t('Propane', 'بروبان')], ['2.016', t('Hydrogen H₂', 'هيدروجين H₂')], ['4.003', t('Helium', 'هيليوم')],
      ]),
      num('P', t('Absolute pressure', 'الضغط المطلق'), 101.325, 'kPa'),
      num('V', t('Volume', 'الحجم'), 1, 'm³'),
      num('T', t('Temperature', 'درجة الحرارة'), 15, '°C'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'P'), n(v, 'V')) || !fin(n(v, 'T')) || n(v, 'T') <= -273.15) return null;
      const r = idealGas(n(v, 'P'), n(v, 'V'), n(v, 'T'), n(v, 'gas'));
      return {
        rows: [
          row(t('Amount', 'كمية المادة'), r.moles, 'mol', 2),
          row(t('Mass', 'الكتلة'), r.massKg, 'kg', 3, hi),
          row(t('Density', 'الكثافة'), r.density, 'kg/m³', 3, hi),
        ],
        note: t('Ideal gas law PV = nRT; real gases deviate at high pressure or low temperature.', 'قانون الغاز المثالي PV = nRT؛ الغازات الحقيقية تنحرف عند الضغط العالي أو الحرارة المنخفضة.'),
      };
    },
  },

  // ───────────── Surveying ─────────────
  {
    id: 'bearing',
    icon: 'compass-outline',
    group: SURV,
    title: t('Distance & bearing', 'المسافة والانحراف'),
    desc: t('Between two coordinates (E, N)', 'بين نقطتين بالإحداثيات (شرقي، شمالي)'),
    inputs: [
      num('e1', t('Point A Easting', 'شرقي النقطة A'), 1000, 'm'),
      num('n1', t('Point A Northing', 'شمالي النقطة A'), 2000, 'm'),
      num('e2', t('Point B Easting', 'شرقي النقطة B'), 1150, 'm'),
      num('n2', t('Point B Northing', 'شمالي النقطة B'), 2080, 'm'),
    ],
    compute: (v) => {
      const xs = ['e1', 'n1', 'e2', 'n2'].map((k) => n(v, k));
      if (!fin(...xs)) return null;
      const r = inverse(xs[0], xs[1], xs[2], xs[3]);
      if (r.distance === 0) return null;
      return {
        rows: [
          row(t('Distance', 'المسافة'), r.distance, 'm', 3, hi),
          row(t('Bearing A → B', 'الانحراف A → B'), r.dms, undefined, undefined, hi),
          row(t('Bearing A → B', 'الانحراف A → B'), r.bearing, '°', 4),
          row(t('Back bearing B → A', 'الانحراف العكسي B → A'), toDMS((r.bearing + 180) % 360), undefined, undefined),
          row(t('ΔE', 'ΔE'), r.dE, 'm', 3),
          row(t('ΔN', 'ΔN'), r.dN, 'm', 3),
        ],
        note: t('Whole-circle bearing from grid north, clockwise.', 'انحراف دائري كامل من الشمال الشبكي مع عقارب الساعة.'),
      };
    },
  },
  {
    id: 'height',
    icon: 'triangle-outline',
    group: SURV,
    title: t('Height by angle', 'الارتفاع بالزاوية'),
    desc: t('Building or tree height from distance and angle', 'ارتفاع مبنى أو شجرة من المسافة والزاوية'),
    inputs: [
      num('d', t('Horizontal distance', 'المسافة الأفقية'), 30, 'm'),
      num('a', t('Elevation angle', 'زاوية الارتفاع'), 35, '°'),
      num('hi', t('Instrument / eye height', 'ارتفاع الجهاز / العين'), 1.5, 'm'),
    ],
    compute: (v) => {
      if (!pos(n(v, 'd')) || !fin(n(v, 'a'), n(v, 'hi')) || n(v, 'a') <= -90 || n(v, 'a') >= 90) return null;
      const h = heightFromAngle(n(v, 'd'), n(v, 'a'), n(v, 'hi'));
      return {
        rows: [
          row(t('Height of object', 'ارتفاع الجسم'), h, 'm', 2, hi),
          row(t('Slope distance to top', 'المسافة المائلة للقمة'), n(v, 'd') / Math.cos((n(v, 'a') * Math.PI) / 180), 'm', 2),
        ],
      };
    },
  },
  {
    id: 'dms',
    icon: 'locate-outline',
    group: SURV,
    title: t('Angle: decimal ⇄ DMS', 'الزوايا: عشري ⇄ درجات ودقائق وثوانٍ'),
    desc: t('Degrees–minutes–seconds, radians and gradians', 'درجات ودقائق وثوانٍ وراديان وجراد'),
    inputs: [
      sel('mode', t('Convert from', 'التحويل من'), 'dec', [['dec', t('Decimal degrees', 'درجات عشرية')], ['dms', t('D° M′ S″', 'د° د′ ث″')]]),
      num('x', t('Decimal degrees', 'درجات عشرية'), 45.5125, '°', (v) => v.mode === 'dec'),
      num('D', t('Degrees', 'درجات'), 45, '°', (v) => v.mode === 'dms'),
      num('M', t('Minutes', 'دقائق'), 30, '′', (v) => v.mode === 'dms'),
      num('S', t('Seconds', 'ثوانٍ'), 45, '″', (v) => v.mode === 'dms'),
    ],
    compute: (v) => {
      let deg: number;
      if (v.mode === 'dec') { deg = n(v, 'x'); if (!fin(deg)) return null; }
      else {
        const [D, M, S] = [n(v, 'D'), Number.isFinite(n(v, 'M')) ? n(v, 'M') : 0, Number.isFinite(n(v, 'S')) ? n(v, 'S') : 0];
        if (!fin(D) || M < 0 || S < 0 || M >= 60 || S >= 60) return null;
        deg = Math.sign(D || 1) * (Math.abs(D) + M / 60 + S / 3600);
      }
      return {
        rows: [
          row(t('Decimal degrees', 'درجات عشرية'), deg, '°', 6, hi),
          row(t('D° M′ S″', 'د° د′ ث″'), (deg < 0 ? '−' : '') + toDMS(Math.abs(deg)), undefined, undefined, hi),
          row(t('Radians', 'راديان'), (deg * Math.PI) / 180, 'rad', 6),
          row(t('Gradians', 'جراد'), deg / 0.9, 'gon', 4),
        ],
      };
    },
  },

  // ───────────── General ─────────────
  {
    id: 'interp',
    icon: 'analytics-outline',
    group: GEN,
    title: t('Linear interpolation', 'الاستيفاء الخطي'),
    desc: t('Read between two table values', 'القراءة بين قيمتين في جدول'),
    inputs: [
      num('x1', t('x₁', 'x₁'), 20),
      num('y1', t('y₁', 'y₁'), 0.998),
      num('x2', t('x₂', 'x₂'), 30),
      num('y2', t('y₂', 'y₂'), 0.996),
      num('x', t('x', 'x'), 25),
    ],
    compute: (v) => {
      const xs = ['x1', 'y1', 'x2', 'y2', 'x'].map((k) => n(v, k));
      if (!fin(...xs) || xs[0] === xs[2]) return null;
      const y = interpolate(xs[0], xs[1], xs[2], xs[3], xs[4]);
      const out = xs[4] < Math.min(xs[0], xs[2]) || xs[4] > Math.max(xs[0], xs[2]);
      return {
        rows: [row(t('y', 'y'), y, undefined, 6, hi), ...(out ? [row(t('Note', 'ملاحظة'), t('Extrapolated (outside x₁–x₂)', 'استقراء (خارج المدى x₁–x₂)'), undefined, undefined, { tone: 'warn' })] : [])],
      };
    },
  },
  {
    id: 'quadratic',
    icon: 'code-working-outline',
    group: GEN,
    title: t('Quadratic equation', 'المعادلة التربيعية'),
    desc: t('Roots of ax² + bx + c = 0', 'جذور ax² + bx + c = 0'),
    inputs: [num('a', t('a', 'a'), 1), num('b', t('b', 'b'), -3), num('c', t('c', 'c'), 2)],
    compute: (v) => {
      const [a, b, c] = [n(v, 'a'), n(v, 'b'), n(v, 'c')];
      if (!fin(a, b, c) || (a === 0 && b === 0)) return null;
      const r = quadratic(a, b, c);
      if (r.real) return { rows: [row(t('Discriminant', 'المميز'), r.disc, undefined, 4), row(t('x₁', 'x₁'), r.x1!, undefined, 6, hi), row(t('x₂', 'x₂'), r.x2!, undefined, 6, hi)] };
      const im = Math.abs(r.im!);
      const re = Number(r.re!.toPrecision(6));
      return {
        rows: [
          row(t('Discriminant', 'المميز'), r.disc, undefined, 4),
          row(t('x₁', 'x₁'), `${re} + ${Number(im.toPrecision(6))}i`, undefined, undefined, hi),
          row(t('x₂', 'x₂'), `${re} − ${Number(im.toPrecision(6))}i`, undefined, undefined, hi),
        ],
        note: t('Complex roots.', 'جذور مركبة.'),
      };
    },
  },
  {
    id: 'triangle',
    icon: 'caret-up-outline',
    group: GEN,
    title: t('Right triangle', 'المثلث القائم'),
    desc: t('Hypotenuse, angles, area from two legs', 'الوتر والزوايا والمساحة من الضلعين'),
    inputs: [num('a', t('Side a (opposite angle A)', 'الضلع a (مقابل الزاوية A)'), 3, 'm'), num('b', t('Side b (opposite angle B)', 'الضلع b (مقابل الزاوية B)'), 4, 'm')],
    compute: (v) => {
      if (!pos(n(v, 'a'), n(v, 'b'))) return null;
      const r = rightTriangle(n(v, 'a'), n(v, 'b'));
      return {
        rows: [
          row(t('Hypotenuse c', 'الوتر c'), r.hypotenuse, 'm', 4, hi),
          row(t('Angle A', 'الزاوية A'), r.angleA, '°', 3, hi),
          row(t('Angle B', 'الزاوية B'), r.angleB, '°', 3),
          row(t('Area', 'المساحة'), r.area, 'm²', 3),
          row(t('Perimeter', 'المحيط'), r.perimeter, 'm', 3),
        ],
      };
    },
  },
  {
    id: 'percent',
    icon: 'stats-chart',
    group: GEN,
    title: t('Percentages', 'النسب المئوية'),
    desc: t('Change, ratio and percentage of a value', 'التغير والنسبة والنسبة المئوية من قيمة'),
    inputs: [num('a', t('Old value / part', 'القيمة القديمة / الجزء'), 80), num('b', t('New value / whole', 'القيمة الجديدة / الكل'), 100)],
    compute: (v) => {
      const [a, b] = [n(v, 'a'), n(v, 'b')];
      if (!fin(a, b)) return null;
      return {
        rows: [
          row(t('Difference (new − old)', 'الفرق (الجديد − القديم)'), b - a, undefined, 4),
          ...(a !== 0 ? [row(t('Change from old to new', 'نسبة التغير'), ((b - a) / Math.abs(a)) * 100, '%', 2, { highlight: true, tone: b >= a ? 'good' : 'bad' })] : []),
          ...(b !== 0 ? [row(t('Part as % of whole', 'الجزء كنسبة من الكل'), (a / b) * 100, '%', 2, hi)] : []),
          row(t('Old value + 15% (e.g. VAT)', 'القيمة القديمة + 15٪ (مثل الضريبة)'), a * 1.15, undefined, 2),
        ],
      };
    },
  },
];

// Displayed order of groups on the Tools screen.
export const GROUP_ORDER = ['Structural', 'Civil', 'Electrical', 'Mechanical', 'Process & chemical', 'Surveying', 'General'];

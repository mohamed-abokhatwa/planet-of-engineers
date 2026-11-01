import type { Ionicons } from '@expo/vector-icons';
import {
  CABLE_SIZES,
  ROUGHNESS,
  area,
  cableSizeForDrop,
  circularColumnVolume,
  concreteMaterials,
  currentFromPower,
  pipePressureDrop,
  powerFromCurrent,
  pumpPower,
  rebarQuantity,
  slope,
  voltageDrop,
  type Conductor,
  type PipeMaterial,
} from './calc';
import { GROUP_ORDER, MORE_TOOLS } from './defs-more';

type T = { en: string; ar: string };
const t = (en: string, ar: string): T => ({ en, ar });
type Vals = Record<string, number | string>;

export type InputDef =
  | { key: string; label: T; kind: 'number'; unit?: string; default: number; showIf?: (v: Vals) => boolean }
  | { key: string; label: T; kind: 'select'; options: { value: string; label: T }[]; default: string; showIf?: (v: Vals) => boolean };

export interface ResultRow {
  label: T;
  value: number | string | T;
  unit?: string | T;
  digits?: number;
  highlight?: boolean;
  tone?: 'good' | 'warn' | 'bad';
}

export interface ToolDef {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  group: T;
  title: T;
  desc: T;
  inputs: InputDef[];
  compute: (v: Vals) => { rows: ResultRow[]; note?: T } | null;
}

const n = (v: Vals, k: string) => Number(v[k]);
const pos = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);

const MOTORS = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400];

const BASE_TOOLS: ToolDef[] = [
  {
    id: 'concrete',
    icon: 'cube-outline',
    group: t('Civil', 'مدني'),
    title: t('Concrete & materials', 'الخرسانة والمواد'),
    desc: t('Volume, cement bags, sand and gravel', 'الحجم وعدد شكائر الأسمنت والرمل والزلط'),
    inputs: [
      {
        key: 'shape', label: t('Element', 'العنصر'), kind: 'select', default: 'box',
        options: [{ value: 'box', label: t('Slab / beam / footing', 'سقف / كمرة / قاعدة') }, { value: 'cyl', label: t('Circular column', 'عمود دائري') }],
      },
      { key: 'L', label: t('Length', 'الطول'), kind: 'number', unit: 'm', default: 5, showIf: (v) => v.shape === 'box' },
      { key: 'W', label: t('Width', 'العرض'), kind: 'number', unit: 'm', default: 4, showIf: (v) => v.shape === 'box' },
      { key: 'H', label: t('Thickness / depth', 'السمك / العمق'), kind: 'number', unit: 'm', default: 0.15, showIf: (v) => v.shape === 'box' },
      { key: 'D', label: t('Diameter', 'القطر'), kind: 'number', unit: 'm', default: 0.4, showIf: (v) => v.shape === 'cyl' },
      { key: 'HC', label: t('Height', 'الارتفاع'), kind: 'number', unit: 'm', default: 3, showIf: (v) => v.shape === 'cyl' },
      { key: 'count', label: t('Number of elements', 'عدد العناصر'), kind: 'number', default: 1 },
      {
        key: 'mix', label: t('Nominal mix (C:S:G)', 'نسب الخلط (أسمنت:رمل:زلط)'), kind: 'select', default: '1:2:4',
        options: [
          { value: '1:1.5:3', label: t('1 : 1.5 : 3 (≈ M20)', '1 : 1.5 : 3 (≈ M20)') },
          { value: '1:2:4', label: t('1 : 2 : 4 (≈ M15)', '1 : 2 : 4 (≈ M15)') },
          { value: '1:3:6', label: t('1 : 3 : 6 (≈ M10, blinding)', '1 : 3 : 6 (≈ M10، نظافة)') },
        ],
      },
      { key: 'waste', label: t('Waste allowance', 'نسبة الهالك'), kind: 'number', unit: '%', default: 5 },
      { key: 'bag', label: t('Cement bag', 'وزن الشكارة'), kind: 'number', unit: 'kg', default: 50 },
    ],
    compute: (v) => {
      const count = n(v, 'count');
      const single = v.shape === 'cyl' ? circularColumnVolume(n(v, 'D'), n(v, 'HC')) : n(v, 'L') * n(v, 'W') * n(v, 'H');
      if (!pos(single, count, n(v, 'bag')) || n(v, 'waste') < 0) return null;
      const mix = String(v.mix).split(':').map(Number) as [number, number, number];
      const r = concreteMaterials(single * count, mix, n(v, 'bag'), n(v, 'waste') / 100);
      return {
        rows: [
          { label: t('Net volume', 'الحجم الصافي'), value: single * count, unit: 'm³', digits: 3 },
          { label: t('Volume incl. waste', 'الحجم شامل الهالك'), value: r.volumeWithWaste, unit: 'm³', digits: 3, highlight: true },
          { label: t('Cement', 'الأسمنت'), value: Math.ceil(r.cementBags), unit: t('bags', 'شكارة'), digits: 0, highlight: true },
          { label: t('Cement (weight)', 'الأسمنت (وزن)'), value: r.cementKg, unit: 'kg', digits: 0 },
          { label: t('Sand', 'الرمل'), value: r.sandM3, unit: 'm³', digits: 2 },
          { label: t('Gravel / aggregate', 'الزلط / الركام'), value: r.gravelM3, unit: 'm³', digits: 2 },
          { label: t('Water (w/c 0.5)', 'الماء (م/أ 0.5)'), value: r.waterL, unit: 'L', digits: 0 },
        ],
        note: t('Nominal-mix estimate using a dry-volume factor of 1.54. Use a designed mix for structural work.', 'تقدير بالخلطة الحجمية بمعامل حجم جاف 1.54. استخدم خلطة مصممة للأعمال الإنشائية.'),
      };
    },
  },
  {
    id: 'rebar',
    icon: 'git-commit-outline',
    group: t('Civil', 'مدني'),
    title: t('Rebar weight', 'وزن حديد التسليح'),
    desc: t('kg/m, total weight and lap length', 'الوزن لكل متر والوزن الكلي وطول الوصلة'),
    inputs: [
      {
        key: 'd', label: t('Bar diameter', 'قطر السيخ'), kind: 'select', default: '16',
        options: [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40].map((d) => ({ value: String(d), label: t(`Ø${d} mm`, `Ø${d} مم`) })),
      },
      { key: 'bars', label: t('Number of bars', 'عدد الأسياخ'), kind: 'number', default: 10 },
      { key: 'len', label: t('Length of each bar', 'طول السيخ'), kind: 'number', unit: 'm', default: 12 },
      { key: 'lap', label: t('Lap length factor', 'معامل طول الوصلة'), kind: 'number', unit: '× d', default: 40 },
    ],
    compute: (v) => {
      const d = n(v, 'd');
      if (!pos(d, n(v, 'bars'), n(v, 'len'))) return null;
      const r = rebarQuantity(d, n(v, 'bars'), n(v, 'len'), Math.max(0, n(v, 'lap')));
      return {
        rows: [
          { label: t('Weight per metre', 'الوزن لكل متر'), value: r.kgPerM, unit: 'kg/m', digits: 3, highlight: true },
          { label: t('Bar area', 'مساحة مقطع السيخ'), value: r.areaMm2, unit: 'mm²', digits: 1 },
          { label: t('Total length', 'الطول الكلي'), value: r.totalLength, unit: 'm', digits: 1 },
          { label: t('Total weight', 'الوزن الكلي'), value: r.totalKg, unit: 'kg', digits: 1, highlight: true },
          { label: t('Total weight', 'الوزن الكلي'), value: r.tonnes, unit: 't', digits: 3 },
          { label: t('Lap length', 'طول الوصلة'), value: r.lapLengthMm, unit: 'mm', digits: 0 },
        ],
        note: t('Density 7850 kg/m³ (≈ d²/162 kg/m). Lap length depends on code, concrete grade and bar position.', 'الكثافة 7850 كجم/م³ (≈ d²/162 كجم/م). طول الوصلة يعتمد على الكود ورتبة الخرسانة وموضع السيخ.'),
      };
    },
  },
  {
    id: 'power',
    icon: 'flash-outline',
    group: t('Electrical', 'كهرباء'),
    title: t('Power & current', 'القدرة والتيار'),
    desc: t('Single- and three-phase, kW ⇄ A', 'أحادي وثلاثي الأطوار، كيلوواط ⇄ أمبير'),
    inputs: [
      { key: 'phases', label: t('System', 'النظام'), kind: 'select', default: '3', options: [{ value: '3', label: t('Three-phase', 'ثلاثي الأطوار') }, { value: '1', label: t('Single-phase', 'أحادي الطور') }] },
      { key: 'mode', label: t('I know the…', 'أعرف…'), kind: 'select', default: 'p', options: [{ value: 'p', label: t('Power (kW)', 'القدرة (كيلوواط)') }, { value: 'i', label: t('Current (A)', 'التيار (أمبير)') }] },
      { key: 'V', label: t('Voltage (line-to-line for 3φ)', 'الجهد (بين الخطوط للثلاثي)'), kind: 'number', unit: 'V', default: 400 },
      { key: 'P', label: t('Active power', 'القدرة الفعالة'), kind: 'number', unit: 'kW', default: 55, showIf: (v) => v.mode === 'p' },
      { key: 'I', label: t('Current', 'التيار'), kind: 'number', unit: 'A', default: 100, showIf: (v) => v.mode === 'i' },
      { key: 'pf', label: t('Power factor', 'معامل القدرة'), kind: 'number', default: 0.85 },
    ],
    compute: (v) => {
      const ph = (v.phases === '1' ? 1 : 3) as 1 | 3;
      const V = n(v, 'V');
      const pf = n(v, 'pf');
      if (!pos(V, pf) || pf > 1) return null;
      if (v.mode === 'p') {
        if (!pos(n(v, 'P'))) return null;
        const I = currentFromPower(n(v, 'P') * 1000, V, pf, ph);
        const s = powerFromCurrent(I, V, pf, ph);
        return {
          rows: [
            { label: t('Current', 'التيار'), value: I, unit: 'A', digits: 1, highlight: true },
            { label: t('Apparent power', 'القدرة الظاهرية'), value: s.apparentVA / 1000, unit: 'kVA', digits: 2 },
            { label: t('Reactive power', 'القدرة غير الفعالة'), value: s.reactiveVAr / 1000, unit: 'kVAr', digits: 2 },
          ],
        };
      }
      if (!pos(n(v, 'I'))) return null;
      const s = powerFromCurrent(n(v, 'I'), V, pf, ph);
      return {
        rows: [
          { label: t('Active power', 'القدرة الفعالة'), value: s.activeW / 1000, unit: 'kW', digits: 2, highlight: true },
          { label: t('Apparent power', 'القدرة الظاهرية'), value: s.apparentVA / 1000, unit: 'kVA', digits: 2 },
          { label: t('Reactive power', 'القدرة غير الفعالة'), value: s.reactiveVAr / 1000, unit: 'kVAr', digits: 2 },
        ],
      };
    },
  },
  {
    id: 'vdrop',
    icon: 'pulse-outline',
    group: t('Electrical', 'كهرباء'),
    title: t('Voltage drop & cable size', 'هبوط الجهد ومقطع الكابل'),
    desc: t('Check a cable or find the smallest size', 'افحص كابلًا أو اعرف أصغر مقطع مناسب'),
    inputs: [
      { key: 'phases', label: t('System', 'النظام'), kind: 'select', default: '3', options: [{ value: '3', label: t('Three-phase', 'ثلاثي الأطوار') }, { value: '1', label: t('Single-phase', 'أحادي الطور') }] },
      { key: 'cond', label: t('Conductor', 'الموصل'), kind: 'select', default: 'copper', options: [{ value: 'copper', label: t('Copper', 'نحاس') }, { value: 'aluminium', label: t('Aluminium', 'ألومنيوم') }] },
      { key: 'V', label: t('Supply voltage', 'جهد المصدر'), kind: 'number', unit: 'V', default: 400 },
      { key: 'I', label: t('Load current', 'تيار الحمل'), kind: 'number', unit: 'A', default: 100 },
      { key: 'L', label: t('Cable length (one way)', 'طول الكابل (اتجاه واحد)'), kind: 'number', unit: 'm', default: 100 },
      { key: 'pf', label: t('Power factor', 'معامل القدرة'), kind: 'number', default: 0.85 },
      { key: 'A', label: t('Cable size to check', 'مقطع الكابل للفحص'), kind: 'select', default: '35', options: CABLE_SIZES.map((a) => ({ value: String(a), label: t(`${a} mm²`, `${a} مم²`) })) },
      { key: 'max', label: t('Allowed drop', 'الهبوط المسموح'), kind: 'number', unit: '%', default: 3 },
    ],
    compute: (v) => {
      const ph = (v.phases === '1' ? 1 : 3) as 1 | 3;
      const c = v.cond as Conductor;
      const [V, I, L, pf, A, max] = [n(v, 'V'), n(v, 'I'), n(v, 'L'), n(v, 'pf'), n(v, 'A'), n(v, 'max')];
      if (!pos(V, I, L, pf, A, max) || pf > 1) return null;
      const d = voltageDrop(I, L, A, V, pf, ph, c);
      const best = cableSizeForDrop(I, L, V, pf, ph, c, max);
      const ok = d.percent <= max;
      return {
        rows: [
          { label: t('Voltage drop', 'هبوط الجهد'), value: d.dropV, unit: 'V', digits: 2 },
          { label: t('Voltage drop', 'هبوط الجهد'), value: d.percent, unit: '%', digits: 2, highlight: true, tone: ok ? 'good' : 'bad' },
          { label: t('Within limit?', 'ضمن الحد؟'), value: ok ? t('Yes', 'نعم') : t('No', 'لا'), tone: ok ? 'good' : 'bad' },
          { label: t('Smallest size for limit', 'أصغر مقطع يحقق الحد'), value: best ? best.areaMm2 : '—', unit: best ? 'mm²' : undefined, digits: 0, highlight: true },
        ],
        note: t('ΔV = k·I·L·(R cosφ + X sinφ), R at ~70 °C (Cu 0.0225, Al 0.036 Ω·mm²/m), X = 0.08 Ω/km (multicore cable). Always check current-carrying capacity and protection separately.', 'ΔV = k·I·L·(R cosφ + X sinφ)، المقاومة عند ~70 °م (نحاس 0.0225، ألومنيوم 0.036 أوم·مم²/م)، المفاعلة 0.08 أوم/كم (كابل متعدد القلوب). راجع دائمًا سعة التيار والحماية بشكل منفصل.'),
      };
    },
  },
  {
    id: 'pipe',
    icon: 'water-outline',
    group: t('Mechanical', 'ميكانيكا'),
    title: t('Pipe pressure drop', 'فاقد الضغط في المواسير'),
    desc: t('Darcy–Weisbach for water', 'معادلة دارسي–فايسباخ للمياه'),
    inputs: [
      { key: 'Q', label: t('Flow rate', 'معدل السريان'), kind: 'number', unit: 'm³/h', default: 10 },
      { key: 'D', label: t('Internal diameter', 'القطر الداخلي'), kind: 'number', unit: 'mm', default: 50 },
      { key: 'L', label: t('Pipe length', 'طول الماسورة'), kind: 'number', unit: 'm', default: 100 },
      {
        key: 'mat', label: t('Material', 'المادة'), kind: 'select', default: 'steel',
        options: (Object.keys(ROUGHNESS) as PipeMaterial[]).map((m) => ({
          value: m,
          label: {
            steel: t('Steel (new)', 'حديد (جديد)'), galvanized: t('Galvanised steel', 'حديد مجلفن'), castIron: t('Cast iron', 'زهر'),
            concrete: t('Concrete', 'خرسانة'), pvc: t('PVC / uPVC', 'PVC / uPVC'), copper: t('Copper', 'نحاس'), hdpe: t('HDPE', 'HDPE'),
          }[m],
        })),
      },
    ],
    compute: (v) => {
      const [Q, D, L] = [n(v, 'Q'), n(v, 'D'), n(v, 'L')];
      if (!pos(Q, D, L)) return null;
      const r = pipePressureDrop(Q, D, L, ROUGHNESS[v.mat as PipeMaterial]);
      const vTone = r.velocity > 3 ? 'bad' : r.velocity > 2 ? 'warn' : 'good';
      return {
        rows: [
          { label: t('Velocity', 'السرعة'), value: r.velocity, unit: 'm/s', digits: 2, tone: vTone },
          { label: t('Pressure drop', 'فاقد الضغط'), value: r.dpKPa, unit: 'kPa', digits: 2, highlight: true },
          { label: t('Pressure drop', 'فاقد الضغط'), value: r.dpKPa / 100, unit: 'bar', digits: 3 },
          { label: t('Head loss', 'فاقد الرأس'), value: r.headLossM, unit: 'm', digits: 2, highlight: true },
          { label: t('Reynolds number', 'رقم رينولدز'), value: r.reynolds, digits: 0 },
          { label: t('Friction factor', 'معامل الاحتكاك'), value: r.friction, digits: 4 },
          { label: t('Flow regime', 'نوع السريان'), value: { laminar: t('Laminar', 'رقائقي'), transitional: t('Transitional', 'انتقالي'), turbulent: t('Turbulent', 'مضطرب') }[r.regime as 'laminar'] },
        ],
        note: t('Water at 20 °C, full pipe, straight run only. Add fittings as equivalent length. Typical design velocity 1–2 m/s.', 'مياه عند 20 °م، ماسورة ممتلئة، أطوال مستقيمة فقط. أضف القطع كطول مكافئ. السرعة التصميمية المعتادة 1–2 م/ث.'),
      };
    },
  },
  {
    id: 'pump',
    icon: 'speedometer-outline',
    group: t('Mechanical', 'ميكانيكا'),
    title: t('Pump power', 'قدرة المضخة'),
    desc: t('Hydraulic and shaft power, motor size', 'القدرة الهيدروليكية وقدرة العمود ومقاس المحرك'),
    inputs: [
      { key: 'Q', label: t('Flow rate', 'معدل السريان'), kind: 'number', unit: 'm³/h', default: 36 },
      { key: 'H', label: t('Total head', 'الرفع الكلي'), kind: 'number', unit: 'm', default: 30 },
      { key: 'eff', label: t('Pump efficiency', 'كفاءة المضخة'), kind: 'number', unit: '%', default: 70 },
    ],
    compute: (v) => {
      const [Q, H, e] = [n(v, 'Q'), n(v, 'H'), n(v, 'eff')];
      if (!pos(Q, H, e) || e > 100) return null;
      const r = pumpPower(Q, H, e / 100);
      const motor = MOTORS.find((m) => m >= r.shaftKW * 1.15);
      return {
        rows: [
          { label: t('Hydraulic power', 'القدرة الهيدروليكية'), value: r.hydraulicKW, unit: 'kW', digits: 2 },
          { label: t('Shaft power', 'قدرة العمود'), value: r.shaftKW, unit: 'kW', digits: 2, highlight: true },
          { label: t('Shaft power', 'قدرة العمود'), value: r.shaftHp, unit: 'hp', digits: 2 },
          { label: t('Suggested motor (+15%)', 'المحرك المقترح (+15٪)'), value: motor ?? '—', unit: motor ? 'kW' : undefined, digits: 2, highlight: true },
        ],
        note: t('Water density 998 kg/m³. Motor margin and size depend on the pump curve and standards used.', 'كثافة المياه 998 كجم/م³. هامش ومقاس المحرك يعتمدان على منحنى المضخة والمواصفات.'),
      };
    },
  },
  {
    id: 'slope',
    icon: 'trending-up-outline',
    group: t('General', 'عام'),
    title: t('Slope & gradient', 'الميول والانحدار'),
    desc: t('%, degrees, 1:n and ‰', 'نسبة مئوية ودرجات و1:ن وفي الألف'),
    inputs: [
      { key: 'rise', label: t('Rise', 'الارتفاع'), kind: 'number', unit: 'm', default: 1 },
      { key: 'run', label: t('Horizontal run', 'المسافة الأفقية'), kind: 'number', unit: 'm', default: 100 },
    ],
    compute: (v) => {
      const [rise, run] = [n(v, 'rise'), n(v, 'run')];
      if (!pos(run) || !Number.isFinite(rise) || rise < 0) return null;
      const r = slope(rise, run);
      return {
        rows: [
          { label: t('Gradient', 'الميل'), value: r.percent, unit: '%', digits: 3, highlight: true },
          { label: t('Angle', 'الزاوية'), value: r.degrees, unit: '°', digits: 3 },
          { label: t('Ratio 1 : n', 'النسبة 1 : ن'), value: Number.isFinite(r.oneIn) ? `1 : ${r.oneIn.toFixed(1)}` : '—' },
          { label: t('Per mille', 'في الألف'), value: r.permille, unit: '‰', digits: 2 },
        ],
      };
    },
  },
  {
    id: 'area',
    icon: 'shapes-outline',
    group: t('General', 'عام'),
    title: t('Area of shapes', 'مساحات الأشكال'),
    desc: t('Rectangle, circle, triangle, trapezoid', 'مستطيل ودائرة ومثلث وشبه منحرف'),
    inputs: [
      {
        key: 'shape', label: t('Shape', 'الشكل'), kind: 'select', default: 'rect',
        options: [
          { value: 'rect', label: t('Rectangle', 'مستطيل') }, { value: 'circle', label: t('Circle', 'دائرة') },
          { value: 'tri', label: t('Triangle', 'مثلث') }, { value: 'trap', label: t('Trapezoid', 'شبه منحرف') },
        ],
      },
      { key: 'a', label: t('Length / base a', 'الطول / القاعدة a'), kind: 'number', unit: 'm', default: 10, showIf: (v) => v.shape !== 'circle' },
      { key: 'b', label: t('Width / base b', 'العرض / القاعدة b'), kind: 'number', unit: 'm', default: 6, showIf: (v) => v.shape === 'rect' || v.shape === 'trap' },
      { key: 'h', label: t('Height', 'الارتفاع'), kind: 'number', unit: 'm', default: 4, showIf: (v) => v.shape === 'tri' || v.shape === 'trap' },
      { key: 'd', label: t('Diameter', 'القطر'), kind: 'number', unit: 'm', default: 2, showIf: (v) => v.shape === 'circle' },
    ],
    compute: (v) => {
      const s = v.shape;
      const val =
        s === 'circle' ? (pos(n(v, 'd')) ? area.circle(n(v, 'd')) : NaN)
        : s === 'tri' ? (pos(n(v, 'a'), n(v, 'h')) ? area.triangle(n(v, 'a'), n(v, 'h')) : NaN)
        : s === 'trap' ? (pos(n(v, 'a'), n(v, 'b'), n(v, 'h')) ? area.trapezoid(n(v, 'a'), n(v, 'b'), n(v, 'h')) : NaN)
        : pos(n(v, 'a'), n(v, 'b')) ? area.rectangle(n(v, 'a'), n(v, 'b')) : NaN;
      if (!Number.isFinite(val)) return null;
      return {
        rows: [
          { label: t('Area', 'المساحة'), value: val, unit: 'm²', digits: 3, highlight: true },
          { label: t('Area', 'المساحة'), value: val * 10.7639104, unit: 'ft²', digits: 2 },
          { label: t('Area', 'المساحة'), value: val / 4200.83, unit: t('feddan', 'فدان'), digits: 4 },
        ],
      };
    },
  },
];

const order = (g: T) => {
  const i = GROUP_ORDER.indexOf(g.en);
  return i < 0 ? GROUP_ORDER.length : i;
};
/** Every tool, ordered by group (the sort is stable, so tools keep their order inside a group). */
export const TOOLS: ToolDef[] = [...BASE_TOOLS, ...MORE_TOOLS].sort((a, b) => order(a.group) - order(b.group));

export const findTool = (id: string) => TOOLS.find((x) => x.id === id);

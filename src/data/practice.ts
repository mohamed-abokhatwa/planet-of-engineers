// Practice tracks for students: exam-style questions by subject (first years to the professional exam).
// Practice runs on the phone (works offline); progress is kept on the device.
// Every numeric answer is recomputed independently in tests/practice.test.ts.
import type { Discipline } from '../lib/types';

type T = { en: string; ar: string };
const o = (en: string, ar: string): T => ({ en, ar });
const same = (s: string): T => ({ en: s, ar: s });

export type TrackId = 'math' | 'statics' | 'strength' | 'fluids' | 'thermo' | 'circuits' | 'concrete' | 'soil' | 'economics' | 'ethics';

export interface Track {
  id: TrackId;
  title: T;
  level: T;
  icon: string;
  disciplines: Discipline[] | 'all';
}

export interface PracticeQ {
  id: string;
  track: TrackId;
  q: T;
  options: T[];
  answer: number;
  explain: T;
}

const Y12 = o('Years 1–2', 'السنة 1–2');
const Y23 = o('Years 2–3', 'السنة 2–3');
const PRO = o('Graduation and professional exam', 'التخرج واختبار المزاولة');

export const TRACKS: Track[] = [
  { id: 'math', title: o('Engineering mathematics', 'رياضيات هندسية'), level: Y12, icon: 'calculator-outline', disciplines: 'all' },
  { id: 'statics', title: o('Statics', 'استاتيكا'), level: Y12, icon: 'git-network-outline', disciplines: ['civil', 'structural', 'mechanical', 'architecture', 'industrial', 'petroleum', 'general'] },
  { id: 'circuits', title: o('Electric circuits', 'دوائر كهربائية'), level: Y12, icon: 'flash-outline', disciplines: ['electrical', 'mechanical', 'software', 'industrial', 'general'] },
  { id: 'strength', title: o('Strength of materials', 'مقاومة المواد'), level: Y23, icon: 'barbell-outline', disciplines: ['civil', 'structural', 'mechanical', 'architecture', 'petroleum', 'general'] },
  { id: 'fluids', title: o('Fluid mechanics and hydraulics', 'ميكانيكا الموائع والهيدروليكا'), level: Y23, icon: 'water-outline', disciplines: ['civil', 'mechanical', 'chemical', 'petroleum', 'general'] },
  { id: 'thermo', title: o('Thermodynamics', 'ديناميكا حرارية'), level: Y23, icon: 'thermometer-outline', disciplines: ['mechanical', 'chemical', 'petroleum', 'electrical', 'general'] },
  { id: 'concrete', title: o('Reinforced concrete basics', 'أساسيات الخرسانة المسلحة'), level: Y23, icon: 'cube-outline', disciplines: ['civil', 'structural', 'architecture', 'general'] },
  { id: 'soil', title: o('Soil mechanics', 'ميكانيكا التربة'), level: Y23, icon: 'layers-outline', disciplines: ['civil', 'structural', 'petroleum', 'general'] },
  { id: 'economics', title: o('Engineering economics', 'اقتصاد هندسي'), level: PRO, icon: 'cash-outline', disciplines: 'all' },
  { id: 'ethics', title: o('Ethics and safety', 'أخلاقيات المهنة والسلامة'), level: PRO, icon: 'shield-checkmark-outline', disciplines: 'all' },
];

const Q = (id: string, track: TrackId, q: T, options: T[], answer: number, explain: T): PracticeQ => ({ id, track, q, options, answer, explain });

const RAW: PracticeQ[] = [
  // ── Engineering mathematics ──
  Q('m1', 'math', o('What is the derivative of x³?', 'ما مشتقة x³؟'), [same('x²'), same('3x²'), same('3x³'), same('x⁴/4')], 1,
    o('Power rule: d/dx xⁿ = n·xⁿ⁻¹, so d/dx x³ = 3x². x⁴/4 is the integral.', 'قاعدة القوة: مشتقة xⁿ هي n·xⁿ⁻¹، إذن مشتقة x³ هي 3x². أما x⁴/4 فهي التكامل.')),
  Q('m2', 'math', o('∫₀¹ 2x dx = ?', '∫₀¹ 2x dx = ؟'), [same('0'), same('0.5'), same('2'), same('1')], 3,
    o('The antiderivative of 2x is x²; from 0 to 1 it is 1 − 0 = 1.', 'تكامل 2x هو x²، ومن 0 إلى 1 يساوي 1 − 0 = 1.')),
  Q('m3', 'math', o('The determinant of the matrix [[2, 1], [3, 4]] is:', 'محدد المصفوفة [[2, 1], [3, 4]] يساوي:'), [same('5'), same('11'), same('2'), same('−5')], 0,
    o('det = ad − bc = 2·4 − 1·3 = 5.', 'المحدد = ad − bc = 2×4 − 1×3 = 5.')),
  Q('m4', 'math', o('lim (x→0) sin(x)/x = ?', 'نهاية sin(x)/x عندما x→0 = ؟'), [same('0'), same('1'), same('∞'), o('It does not exist', 'غير موجودة')], 1,
    o('A standard limit (x in radians): sin x ≈ x for small x, so the ratio tends to 1.', 'نهاية أساسية (x بالراديان): sin x ≈ x للقيم الصغيرة، فتقترب النسبة من 1.')),
  Q('m5', 'math', o('d/dx (e^(2x)) = ?', 'مشتقة e^(2x) = ؟'), [same('e^(2x)'), same('2x·e^(2x−1)'), same('2e^(2x)'), same('e^(2x)/2')], 2,
    o('Chain rule: the derivative of e^u is e^u·u′, with u = 2x and u′ = 2.', 'قاعدة السلسلة: مشتقة e^u هي e^u·u′ حيث u = 2x و u′ = 2.')),
  Q('m6', 'math', o('The roots of x² − 5x + 6 = 0 are:', 'جذور المعادلة x² − 5x + 6 = 0 هي:'), [same('2 and 3'), same('−2 and −3'), same('1 and 6'), same('−1 and 6')], 0,
    o('x² − 5x + 6 = (x − 2)(x − 3) = 0, so x = 2 or x = 3.', 'x² − 5x + 6 = (x − 2)(x − 3) = 0، إذن x = 2 أو x = 3.')),
  Q('m7', 'math', o('The slope of the line through (1, 2) and (3, 8) is:', 'ميل الخط المار بالنقطتين (1، 2) و(3، 8) هو:'), [same('2'), same('6'), same('3'), same('1/3')], 2,
    o('Slope = Δy/Δx = (8 − 2)/(3 − 1) = 6/2 = 3.', 'الميل = Δy/Δx = (8 − 2)/(3 − 1) = 6/2 = 3.')),
  Q('m8', 'math', o('ln(e³) = ?', 'ln(e³) = ؟'), [same('e³'), same('3'), same('1/3'), same('3e')], 1,
    o('ln is the inverse of eˣ, so ln(e³) = 3.', 'اللوغاريتم الطبيعي هو معكوس eˣ، إذن ln(e³) = 3.')),
  Q('m9', 'math', o('The area of a circle with a 2 m diameter is about:', 'مساحة دائرة قطرها 2 م تساوي تقريبًا:'), [o('6.28 m²', '6.28 م²'), o('12.57 m²', '12.57 م²'), o('3.14 m²', '3.14 م²'), o('1.57 m²', '1.57 م²')], 2,
    o('A = πr² = π·1² ≈ 3.14 m². 12.57 m² would use the diameter as the radius.', 'المساحة = πr² = π×1² ≈ 3.14 م². القيمة 12.57 تنتج من استخدام القطر بدل نصف القطر.')),
  Q('m10', 'math', o('Multiplying a 2×3 matrix by a 3×4 matrix gives a matrix of size:', 'حاصل ضرب مصفوفة 2×3 في مصفوفة 3×4 مصفوفة أبعادها:'), [same('3×3'), same('2×4'), same('4×2'), o('Not defined', 'غير معرّف')], 1,
    o('The inner sizes (3 and 3) match, and the result takes the outer sizes: 2×4.', 'البعدان الداخليان متساويان (3 و3)، والناتج يأخذ البعدين الخارجيين: 2×4.')),

  // ── Statics ──
  Q('s1', 'statics', o('A 6 m simply supported beam carries a 12 kN point load at mid-span. Each support reaction is:', 'كمرة بسيطة الارتكاز بحرها 6 م عليها حمل مركز 12 كن في المنتصف. رد فعل كل ركيزة:'), [o('12 kN', '12 كن'), o('3 kN', '3 كن'), o('6 kN', '6 كن'), o('4 kN', '4 كن')], 2,
    o('By symmetry each support carries half the load: 12/2 = 6 kN.', 'بالتماثل تحمل كل ركيزة نصف الحمل: 12/2 = 6 كن.')),
  Q('s2', 'statics', o('A 3 m cantilever carries a 10 kN load at its free end. The moment at the fixed end is:', 'كابولي طوله 3 م عليه حمل 10 كن عند طرفه الحر. العزم عند الطرف المثبت:'), [o('30 kN·m', '30 كن·م'), o('15 kN·m', '15 كن·م'), o('3.3 kN·m', '3.3 كن·م'), o('10 kN·m', '10 كن·م')], 0,
    o('M = P·L = 10 × 3 = 30 kN·m.', 'العزم = P·L = 10 × 3 = 30 كن·م.')),
  Q('s3', 'statics', o('An 8 m simply supported beam has a 20 kN load 2 m from the left support. The left reaction is:', 'كمرة بسيطة بحرها 8 م عليها حمل 20 كن على بعد 2 م من الركيزة اليسرى. رد الفعل الأيسر:'), [o('5 kN', '5 كن'), o('10 kN', '10 كن'), o('15 kN', '15 كن'), o('20 kN', '20 كن')], 2,
    o('Moments about the right support: R_left × 8 = 20 × 6, so R_left = 15 kN (and R_right = 5 kN).', 'بأخذ العزوم حول الركيزة اليمنى: R_left × 8 = 20 × 6، إذن R_left = 15 كن و R_right = 5 كن.')),
  Q('s4', 'statics', o('How many independent equilibrium equations does a rigid body have in 2D?', 'كم معادلة اتزان مستقلة لجسم جاسئ في المستوى (2D)؟'), [same('2'), same('3'), same('4'), same('6')], 1,
    o('ΣFx = 0, ΣFy = 0 and ΣM = 0. In 3D there are six.', 'ΣFx = 0 و ΣFy = 0 و ΣM = 0. وفي الفراغ (3D) ست معادلات.')),
  Q('s5', 'statics', o('In a two-force member, the force acts:', 'في العضو ثنائي القوى تعمل القوة:'), [o('Perpendicular to the member', 'عموديًا على العضو'), o('Along the line joining the two pins', 'على امتداد الخط الواصل بين المفصلين'), o('At 45° to the member', 'بزاوية 45° على العضو'), o('In any direction', 'في أي اتجاه')], 1,
    o('Equilibrium of a member loaded only at two points needs equal, opposite and collinear forces: along the line between them.', 'اتزان عضو محمّل عند نقطتين فقط يتطلب قوتين متساويتين ومتعاكستين على خط واحد يصل بينهما.')),
  Q('s6', 'statics', o('The resultant of two perpendicular forces of 3 kN and 4 kN is:', 'محصلة قوتين متعامدتين 3 كن و4 كن تساوي:'), [o('7 kN', '7 كن'), o('1 kN', '1 كن'), o('12 kN', '12 كن'), o('5 kN', '5 كن')], 3,
    o('R = √(3² + 4²) = √25 = 5 kN.', 'المحصلة = √(3² + 4²) = √25 = 5 كن.')),
  Q('s7', 'statics', o('A 50 N force acts perpendicular to a 0.4 m wrench. The moment is:', 'قوة 50 نيوتن تعمل عموديًا على مفتاح طوله 0.4 م. العزم:'), [o('125 N·m', '125 ن·م'), o('20 N·m', '20 ن·م'), o('12.5 N·m', '12.5 ن·م'), o('200 N·m', '200 ن·م')], 1,
    o('M = F·d = 50 × 0.4 = 20 N·m.', 'العزم = F·d = 50 × 0.4 = 20 ن·م.')),
  Q('s8', 'statics', o('A 4 m simply supported beam carries a uniform load of 5 kN/m. Each reaction is:', 'كمرة بسيطة بحرها 4 م عليها حمل منتظم 5 كن/م. رد فعل كل ركيزة:'), [o('20 kN', '20 كن'), o('5 kN', '5 كن'), o('10 kN', '10 كن'), o('2.5 kN', '2.5 كن')], 2,
    o('Total load = 5 × 4 = 20 kN, shared equally: 10 kN each.', 'الحمل الكلي = 5 × 4 = 20 كن، يتوزع بالتساوي: 10 كن لكل ركيزة.')),
  Q('s9', 'statics', o('How many reaction components does a fixed support provide in 2D?', 'كم مركبة رد فعل توفرها الركيزة المثبتة (الوثاقة) في المستوى؟'), [same('1'), same('2'), same('3'), same('4')], 2,
    o('Horizontal force, vertical force and a moment. A pin gives 2 and a roller gives 1.', 'قوة أفقية وقوة رأسية وعزم. المفصل يعطي 2 والركيزة المتحركة تعطي 1.')),
  Q('s10', 'statics', o('The centroid of a triangle is at what height above its base (h = triangle height)?', 'على أي ارتفاع من القاعدة يقع مركز ثقل المثلث (h = ارتفاع المثلث)؟'), [same('h/2'), same('h/3'), same('2h/3'), same('h/4')], 1,
    o('The centroid lies at one third of the height from the base (two thirds from the apex).', 'يقع مركز الثقل على ثلث الارتفاع من القاعدة (ثلثي الارتفاع من الرأس).')),

  // ── Electric circuits ──
  Q('e1', 'circuits', o('A 12 V source is connected across a 4 Ω resistor. The current is:', 'مصدر 12 فولت موصّل على مقاومة 4 أوم. التيار:'), [o('48 A', '48 أمبير'), o('0.33 A', '0.33 أمبير'), o('3 A', '3 أمبير'), o('8 A', '8 أمبير')], 2,
    o('Ohm’s law: I = V/R = 12/4 = 3 A.', 'قانون أوم: I = V/R = 12/4 = 3 أمبير.')),
  Q('e2', 'circuits', o('2 Ω and 3 Ω resistors in series have a total resistance of:', 'مقاومتان 2 أوم و3 أوم على التوالي، المقاومة الكلية:'), [o('1.2 Ω', '1.2 أوم'), o('5 Ω', '5 أوم'), o('6 Ω', '6 أوم'), o('1 Ω', '1 أوم')], 1,
    o('In series resistances add: 2 + 3 = 5 Ω.', 'على التوالي تُجمع المقاومات: 2 + 3 = 5 أوم.')),
  Q('e3', 'circuits', o('6 Ω and 3 Ω resistors in parallel have a total resistance of:', 'مقاومتان 6 أوم و3 أوم على التوازي، المقاومة الكلية:'), [o('9 Ω', '9 أوم'), o('4.5 Ω', '4.5 أوم'), o('2 Ω', '2 أوم'), o('0.5 Ω', '0.5 أوم')], 2,
    o('R = (6 × 3)/(6 + 3) = 18/9 = 2 Ω. Parallel is always less than the smallest resistor.', 'R = (6 × 3)/(6 + 3) = 18/9 = 2 أوم. المقاومة على التوازي دائمًا أقل من أصغر مقاومة.')),
  Q('e4', 'circuits', o('A heater draws 10 A from 230 V (unity power factor). Its power is:', 'سخان يسحب 10 أمبير من 230 فولت (معامل قدرة 1). قدرته:'), [o('23 W', '23 وات'), o('2.3 kW', '2.3 كيلووات'), o('23 kW', '23 كيلووات'), o('230 W', '230 وات')], 1,
    o('P = V·I = 230 × 10 = 2300 W = 2.3 kW.', 'القدرة = V·I = 230 × 10 = 2300 وات = 2.3 كيلووات.')),
  Q('e5', 'circuits', o('A 10 Ω resistor carries 2 A. The power it dissipates is:', 'مقاومة 10 أوم يمر بها 2 أمبير. القدرة المبددة:'), [o('20 W', '20 وات'), o('5 W', '5 وات'), o('40 W', '40 وات'), o('200 W', '200 وات')], 2,
    o('P = I²R = 2² × 10 = 40 W.', 'القدرة = I²R = 2² × 10 = 40 وات.')),
  Q('e6', 'circuits', o('As the frequency increases, the reactance of a capacitor:', 'بزيادة التردد فإن مفاعلة المكثف:'), [o('Increases', 'تزيد'), o('Decreases', 'تقل'), o('Stays the same', 'تبقى ثابتة'), o('Becomes negative resistance', 'تصبح مقاومة سالبة')], 1,
    o('Xc = 1/(2πfC): higher frequency, lower reactance. An inductor is the opposite (XL = 2πfL).', 'Xc = 1/(2πfC): كلما زاد التردد قلت المفاعلة. والملف عكس ذلك (XL = 2πfL).')),
  Q('e7', 'circuits', o('In a balanced three-phase star system with 230 V phase voltage, the line voltage is about:', 'في نظام ثلاثي الأوجه نجمة متزن جهد الوجه فيه 230 فولت، الجهد بين الخطوط تقريبًا:'), [o('230 V', '230 فولت'), o('460 V', '460 فولت'), o('400 V', '400 فولت'), o('690 V', '690 فولت')], 2,
    o('V_line = √3 × V_phase = 1.732 × 230 ≈ 398 V, the standard 400 V system.', 'جهد الخط = √3 × جهد الوجه = 1.732 × 230 ≈ 398 فولت، وهو نظام 400 فولت القياسي.')),
  Q('e8', 'circuits', o('A load takes 8 kW of real power and 10 kVA of apparent power. Its power factor is:', 'حمل يستهلك 8 كيلووات قدرة فعالة و10 كيلو فولت أمبير قدرة ظاهرية. معامل القدرة:'), [same('0.8'), same('1.25'), same('0.6'), same('0.2')], 0,
    o('PF = P/S = 8/10 = 0.8. The reactive power is √(10² − 8²) = 6 kvar.', 'معامل القدرة = P/S = 8/10 = 0.8. والقدرة غير الفعالة = √(10² − 8²) = 6 كيلو فار.')),
  Q('e9', 'circuits', o('Kirchhoff’s current law says that at a node:', 'ينص قانون كيرشوف للتيار على أنه عند العقدة:'), [o('The sum of voltages is zero', 'مجموع الجهود صفر'), o('The sum of currents in equals the sum of currents out', 'مجموع التيارات الداخلة يساوي مجموع التيارات الخارجة'), o('The current is the same everywhere', 'التيار واحد في كل مكان'), o('Power is conserved only in resistors', 'القدرة محفوظة في المقاومات فقط')], 1,
    o('KCL is conservation of charge at a node. The voltage law (KVL) is about loops.', 'قانون التيار هو حفظ الشحنة عند العقدة. أما قانون الجهد فيخص المسارات المغلقة.')),
  Q('e10', 'circuits', o('The time constant of a 1 kΩ resistor with a 1000 µF capacitor is:', 'الثابت الزمني لمقاومة 1 كيلو أوم مع مكثف 1000 ميكروفاراد:'), [o('1 ms', '1 ملي ثانية'), o('1 s', '1 ثانية'), o('1000 s', '1000 ثانية'), o('0.1 s', '0.1 ثانية')], 1,
    o('τ = RC = 1000 Ω × 0.001 F = 1 s.', 'τ = RC = 1000 أوم × 0.001 فاراد = 1 ثانية.')),

  // ── Strength of materials ──
  Q('t1', 'strength', o('A 10 kN axial force acts on a 100 mm² bar. The stress is:', 'قوة محورية 10 كن على قضيب مساحته 100 مم². الإجهاد:'), [o('10 MPa', '10 ميجا باسكال'), o('1000 MPa', '1000 ميجا باسكال'), o('100 MPa', '100 ميجا باسكال'), o('1 MPa', '1 ميجا باسكال')], 2,
    o('σ = F/A = 10 000 N / 100 mm² = 100 N/mm² = 100 MPa.', 'σ = F/A = 10000 نيوتن / 100 مم² = 100 ن/مم² = 100 ميجا باسكال.')),
  Q('t2', 'strength', o('A 2 m bar stretches by 1 mm. The strain is:', 'قضيب طوله 2 م استطال 1 مم. الانفعال:'), [same('0.0005'), same('0.005'), same('0.002'), same('0.5')], 0,
    o('ε = ΔL/L = 1 mm / 2000 mm = 0.0005 (500 microstrain).', 'ε = ΔL/L = 1 مم / 2000 مم = 0.0005 (500 ميكرو انفعال).')),
  Q('t3', 'strength', o('Steel (E = 200 GPa) is stressed to 100 MPa within the elastic range. The strain is:', 'حديد (E = 200 جيجا باسكال) تحت إجهاد 100 ميجا باسكال في المدى المرن. الانفعال:'), [same('0.002'), same('0.0005'), same('0.02'), same('2')], 1,
    o('ε = σ/E = 100 / 200 000 = 0.0005.', 'الانفعال = الإجهاد ÷ معامل المرونة: ε = σ/E = 100 / 200000 = 0.0005.')),
  Q('t4', 'strength', o('The second moment of area of a b × h rectangle about its centroidal axis (bending about h) is:', 'عزم القصور الذاتي لمستطيل b × h حول محوره المركزي (الانحناء في اتجاه h):'), [same('bh²/6'), same('bh³/3'), same('bh³/12'), same('b³h/12')], 2,
    o('I = bh³/12. bh²/6 is the section modulus, and bh³/3 is about the base.', 'I = bh³/12. أما bh²/6 فهو معامل المقطع، و bh³/3 حول القاعدة.')),
  Q('t5', 'strength', o('The bending stress at a distance y from the neutral axis is:', 'إجهاد الانحناء على بعد y من المحور المحايد:'), [same('σ = My/I'), same('σ = MI/y'), same('σ = VQ/(Ib)'), same('σ = Tr/J')], 0,
    o('Flexure formula σ = My/I. VQ/(Ib) is shear stress and Tr/J is torsion.', 'معادلة الانحناء σ = My/I. أما VQ/(Ib) فهي إجهاد القص و Tr/J للالتواء.')),
  Q('t6', 'strength', o('If the length of a pin-ended column is doubled, its Euler buckling load becomes:', 'إذا تضاعف طول عمود مفصلي الطرفين فإن حمل الانبعاج (أويلر) يصبح:'), [o('Half', 'النصف'), o('A quarter', 'الربع'), o('Double', 'الضعف'), o('Unchanged', 'بدون تغيير')], 1,
    o('P_cr = π²EI/L², so doubling L divides the load by 4.', 'P_cr = π²EI/L²، فمضاعفة الطول تقسم الحمل على 4.')),
  Q('t7', 'strength', o('The Poisson’s ratio of structural steel is about:', 'نسبة بواسون لحديد الإنشاء تقريبًا:'), [same('0.1'), same('0.3'), same('0.5'), same('0.7')], 1,
    o('Steel ν ≈ 0.3. Concrete is about 0.2, and 0.5 is the limit for an incompressible material.', 'نسبة بواسون للحديد ≈ 0.3، وللخرسانة حوالي 0.2، و0.5 هي حد المادة غير القابلة للانضغاط.')),
  Q('t8', 'strength', o('In a rectangular section the maximum shear stress is how many times the average V/A?', 'في المقطع المستطيل أقصى إجهاد قص يساوي كم مرة من المتوسط V/A؟'), [same('1.0'), same('1.33'), same('1.5'), same('2.0')], 2,
    o('τ_max = 1.5 V/A at the neutral axis for a rectangle (4/3 for a solid circle).', 'τ_max = 1.5 V/A عند المحور المحايد للمستطيل (و4/3 للدائرة المصمتة).')),
  Q('t9', 'strength', o('The shear stress in a circular shaft under torque T is:', 'إجهاد القص في عمود دائري تحت عزم التواء T:'), [same('τ = Tr/J'), same('τ = TJ/r'), same('τ = My/I'), same('τ = T/A')], 0,
    o('Torsion formula τ = Tr/J, where J is the polar moment of inertia.', 'معادلة الالتواء τ = Tr/J حيث J عزم القصور القطبي.')),
  Q('t10', 'strength', o('Steel (α = 12 × 10⁻⁶ /°C) is heated by 50 °C and free to expand. The thermal strain is:', 'حديد (α = 12 × 10⁻⁶ لكل °م) سُخّن 50 °م وهو حر التمدد. الانفعال الحراري:'), [same('6 × 10⁻⁴'), same('6 × 10⁻⁶'), same('2.4 × 10⁻⁷'), same('0.06')], 0,
    o('ε = α·ΔT = 12 × 10⁻⁶ × 50 = 6 × 10⁻⁴. Free expansion means no stress.', 'ε = α·ΔT = 12 × 10⁻⁶ × 50 = 6 × 10⁻⁴. التمدد الحر لا يسبب إجهادًا.')),

  // ── Fluid mechanics and hydraulics ──
  Q('f1', 'fluids', o('The gauge pressure at 10 m below a water surface is about:', 'الضغط المقيس على عمق 10 م تحت سطح الماء تقريبًا:'), [o('9.81 kPa', '9.81 كيلو باسكال'), o('98.1 kPa', '98.1 كيلو باسكال'), o('981 kPa', '981 كيلو باسكال'), o('10 kPa', '10 كيلو باسكال')], 1,
    o('p = ρgh = 1000 × 9.81 × 10 = 98 100 Pa ≈ 98.1 kPa (about 1 bar).', 'p = ρgh = 1000 × 9.81 × 10 = 98100 باسكال ≈ 98.1 كيلو باسكال (حوالي 1 بار).')),
  Q('f2', 'fluids', o('Water flows from a pipe into one with half the cross-sectional area. The velocity:', 'يتدفق الماء من ماسورة إلى أخرى مساحة مقطعها النصف. السرعة:'), [o('Halves', 'تقل للنصف'), o('Stays the same', 'تبقى ثابتة'), o('Doubles', 'تتضاعف'), o('Increases four times', 'تزيد أربع مرات')], 2,
    o('Continuity: Q = A₁V₁ = A₂V₂, so halving the area doubles the velocity.', 'معادلة الاستمرارية: Q = A₁V₁ = A₂V₂، فنصف المساحة يضاعف السرعة.')),
  Q('f3', 'fluids', o('Pipe flow is usually laminar when the Reynolds number is below about:', 'يكون السريان في المواسير عادة طبقيًا عندما يكون رقم رينولدز أقل من حوالي:'), [same('200'), same('2300'), same('23 000'), same('400 000')], 1,
    o('Below about 2000–2300 flow is laminar; above about 4000 it is turbulent.', 'أقل من حوالي 2000–2300 يكون السريان طبقيًا، وأعلى من حوالي 4000 يكون مضطربًا.')),
  Q('f4', 'fluids', o('Water flows at 2 m/s in a 200 mm pipe. The flow rate is about:', 'يتدفق الماء بسرعة 2 م/ث في ماسورة قطرها 200 مم. التصرف تقريبًا:'), [o('31 L/s', '31 لتر/ث'), o('63 L/s', '63 لتر/ث'), o('126 L/s', '126 لتر/ث'), o('400 L/s', '400 لتر/ث')], 1,
    o('A = π × 0.2²/4 = 0.0314 m²; Q = A·V = 0.0628 m³/s ≈ 63 L/s.', 'المساحة = π × 0.2²/4 = 0.0314 م²، والتصرف = A·V = 0.0628 م³/ث ≈ 63 لتر/ث.')),
  Q('f5', 'fluids', o('Bernoulli’s equation (ideal flow along a streamline) says the sum of which heads is constant?', 'تنص معادلة برنولي (سريان مثالي على خط انسياب) على ثبات مجموع أي ضواغط؟'), [o('Pressure and elevation only', 'الضغط والمنسوب فقط'), o('Pressure, velocity and elevation', 'الضغط والسرعة والمنسوب'), o('Velocity and friction', 'السرعة والاحتكاك'), o('Elevation and friction', 'المنسوب والاحتكاك')], 1,
    o('p/ρg + V²/2g + z = constant for steady, incompressible, frictionless flow.', 'p/ρg + V²/2g + z = ثابت للسريان المستقر غير القابل للانضغاط وبدون احتكاك.')),
  Q('f6', 'fluids', o('With the friction factor unchanged, doubling the velocity in a pipe makes the Darcy–Weisbach head loss:', 'مع ثبات معامل الاحتكاك، مضاعفة السرعة في الماسورة تجعل فاقد الضاغط (دارسي–وايسباخ):'), [o('Double', 'الضعف'), o('Four times', 'أربعة أضعاف'), o('Half', 'النصف'), o('Unchanged', 'بدون تغيير')], 1,
    o('h_f = f·(L/D)·V²/2g, so it rises with the square of the velocity.', 'h_f = f·(L/D)·V²/2g، فيزيد بمربع السرعة.')),
  Q('f7', 'fluids', o('The velocity head of water moving at 3 m/s is about:', 'ضاغط السرعة لماء يتحرك بسرعة 3 م/ث تقريبًا:'), [o('0.15 m', '0.15 م'), o('0.31 m', '0.31 م'), o('0.46 m', '0.46 م'), o('0.92 m', '0.92 م')], 2,
    o('V²/2g = 3² / (2 × 9.81) = 9 / 19.62 ≈ 0.46 m.', 'V²/2g = 3² / (2 × 9.81) = 9 / 19.62 ≈ 0.46 م.')),
  Q('f8', 'fluids', o('The specific weight of water is about:', 'الوزن النوعي للماء تقريبًا:'), [o('1 kN/m³', '1 كن/م³'), o('9.81 kN/m³', '9.81 كن/م³'), o('98.1 kN/m³', '98.1 كن/م³'), o('1000 kN/m³', '1000 كن/م³')], 1,
    o('γ = ρg = 1000 kg/m³ × 9.81 m/s² = 9810 N/m³ ≈ 9.81 kN/m³.', 'γ = ρg = 1000 كجم/م³ × 9.81 م/ث² = 9810 ن/م³ ≈ 9.81 كن/م³.')),
  Q('f9', 'fluids', o('For laminar pipe flow, the Darcy friction factor is:', 'في السريان الطبقي داخل المواسير، معامل احتكاك دارسي:'), [same('f = 64/Re'), same('f = 16/Re'), same('f = 0.316/Re^0.25'), same('f = 0.02')], 0,
    o('f = 64/Re (the Fanning factor would be 16/Re; 0.316/Re^0.25 is Blasius for smooth turbulent flow).', 'f = 64/Re (معامل فانينج يساوي 16/Re، و0.316/Re^0.25 معادلة بلازيوس للسريان المضطرب الأملس).')),
  Q('f10', 'fluids', o('Cavitation in a pump or pipe happens when the local pressure falls to:', 'يحدث التكهف في المضخة أو الماسورة عندما ينخفض الضغط الموضعي إلى:'), [o('Atmospheric pressure', 'الضغط الجوي'), o('The vapour pressure of the liquid', 'ضغط بخار السائل'), o('Zero gauge pressure', 'صفر ضغط مقيس'), o('Half the working pressure', 'نصف ضغط التشغيل')], 1,
    o('When the pressure reaches the vapour pressure, bubbles form and then collapse violently, damaging impellers and pipes.', 'عندما يصل الضغط إلى ضغط البخار تتكون فقاعات ثم تنهار بعنف فتتلف الريش والمواسير.')),

  // ── Thermodynamics ──
  Q('h1', 'thermo', o('The first law of thermodynamics is a statement of:', 'القانون الأول للديناميكا الحرارية هو تعبير عن:'), [o('Conservation of energy', 'حفظ الطاقة'), o('Increase of entropy', 'زيادة الإنتروبيا'), o('Absolute zero', 'الصفر المطلق'), o('Conservation of momentum', 'حفظ كمية الحركة')], 0,
    o('Energy is neither created nor destroyed: ΔU = Q − W.', 'الطاقة لا تفنى ولا تستحدث: ΔU = Q − W.')),
  Q('h2', 'thermo', o('0 K is equal to:', '0 كلفن يساوي:'), [o('0 °C', '0 °م'), o('−100 °C', '−100 °م'), o('−273.15 °C', '−273.15 °م'), o('−459.67 °C', '−459.67 °م')], 2,
    o('T(°C) = T(K) − 273.15. −459.67 is absolute zero in °F.', 'T(°م) = T(كلفن) − 273.15. أما −459.67 فهو الصفر المطلق بالفهرنهايت.')),
  Q('h3', 'thermo', o('A Carnot engine works between 600 K and 300 K. Its efficiency is:', 'محرك كارنو يعمل بين 600 كلفن و300 كلفن. كفاءته:'), [same('25%'), same('50%'), same('75%'), same('100%')], 1,
    o('η = 1 − T_cold/T_hot = 1 − 300/600 = 0.5 = 50%. Temperatures must be absolute.', 'η = 1 − T_cold/T_hot = 1 − 300/600 = 0.5 = 50٪. يجب استخدام درجات الحرارة المطلقة.')),
  Q('h4', 'thermo', o('An ideal gas is compressed at constant temperature to twice its pressure. Its volume:', 'غاز مثالي ضُغط عند درجة حرارة ثابتة إلى ضعف ضغطه. حجمه:'), [o('Doubles', 'يتضاعف'), o('Halves', 'يقل للنصف'), o('Stays the same', 'يبقى ثابتًا'), o('Falls to a quarter', 'يقل للربع')], 1,
    o('Boyle’s law: pV = constant at constant temperature, so doubling p halves V.', 'قانون بويل: pV = ثابت عند ثبات الحرارة، فمضاعفة الضغط تنصف الحجم.')),
  Q('h5', 'thermo', o('How much heat raises 2 kg of water by 10 K? (c = 4.18 kJ/kg·K)', 'كم حرارة ترفع درجة 2 كجم ماء بمقدار 10 كلفن؟ (c = 4.18 ك جول/كجم·كلفن)'), [o('8.36 kJ', '8.36 ك جول'), o('41.8 kJ', '41.8 ك جول'), o('83.6 kJ', '83.6 ك جول'), o('836 kJ', '836 ك جول')], 2,
    o('Q = m·c·ΔT = 2 × 4.18 × 10 = 83.6 kJ.', 'Q = m·c·ΔT = 2 × 4.18 × 10 = 83.6 ك جول.')),
  Q('h6', 'thermo', o('According to the second law, the entropy of an isolated system:', 'حسب القانون الثاني، إنتروبيا النظام المعزول:'), [o('Always decreases', 'تقل دائمًا'), o('Never decreases', 'لا تقل أبدًا'), o('Is always zero', 'دائمًا صفر'), o('Equals its energy', 'تساوي طاقته')], 1,
    o('ΔS ≥ 0 for an isolated system; it stays constant only for reversible processes.', 'ΔS ≥ 0 للنظام المعزول، وتبقى ثابتة فقط في العمليات الانعكاسية.')),
  Q('h7', 'thermo', o('A refrigerator removes 3 kW of heat using 1 kW of work. Its COP is:', 'ثلاجة تسحب 3 كيلووات حرارة باستخدام 1 كيلووات شغل. معامل أدائها COP:'), [same('0.33'), same('1'), same('3'), same('4')], 2,
    o('COP_R = Q_L / W = 3/1 = 3. (As a heat pump, COP_HP = Q_H/W = 4.)', 'COP = Q_L / W = 3/1 = 3. (وكمضخة حرارية COP = Q_H/W = 4).')),
  Q('h8', 'thermo', o('An isentropic process is:', 'العملية الأيزنتروبية هي:'), [o('Constant temperature', 'عند درجة حرارة ثابتة'), o('Constant pressure', 'عند ضغط ثابت'), o('Adiabatic and reversible', 'أديباتية وانعكاسية'), o('Constant volume', 'عند حجم ثابت')], 2,
    o('Isentropic = constant entropy, which an adiabatic reversible process achieves.', 'أيزنتروبية = إنتروبيا ثابتة، وتتحقق في العملية الأديباتية الانعكاسية.')),
  Q('h9', 'thermo', o('Heat conduction through a wall is described by:', 'التوصيل الحراري خلال جدار يوصف بـ:'), [o('Fourier’s law', 'قانون فورييه'), o('Newton’s law of cooling', 'قانون نيوتن للتبريد'), o('Stefan–Boltzmann law', 'قانون ستيفان–بولتزمان'), o('Bernoulli’s equation', 'معادلة برنولي')], 0,
    o('Fourier: q = −k·dT/dx. Newton’s law of cooling is convection, Stefan–Boltzmann is radiation.', 'فورييه: q = −k·dT/dx. قانون نيوتن للتبريد للحمل، وستيفان–بولتزمان للإشعاع.')),
  Q('h10', 'thermo', o('1 kWh is equal to:', '1 كيلووات ساعة يساوي:'), [o('1000 kJ', '1000 ك جول'), o('3600 kJ', '3600 ك جول'), o('60 kJ', '60 ك جول'), o('3.6 kJ', '3.6 ك جول')], 1,
    o('1 kW × 3600 s = 3600 kJ = 3.6 MJ.', '1 كيلووات × 3600 ثانية = 3600 ك جول = 3.6 ميجا جول.')),

  // ── Reinforced concrete basics ──
  Q('c1', 'concrete', o('The tensile strength of concrete is roughly what fraction of its compressive strength?', 'مقاومة الشد للخرسانة تساوي تقريبًا كم من مقاومة الضغط؟'), [o('About 10%', 'حوالي 10٪'), o('About 50%', 'حوالي 50٪'), o('About the same', 'تقريبًا نفس القيمة'), o('About twice', 'حوالي الضعف')], 0,
    o('Concrete is weak in tension (about 8–12% of its compressive strength), which is why steel carries the tension.', 'الخرسانة ضعيفة في الشد (حوالي 8–12٪ من مقاومة الضغط)، لذلك يتحمل الحديد قوى الشد.')),
  Q('c2', 'concrete', o('The main purpose of concrete cover to the reinforcement is to:', 'الغرض الأساسي من الغطاء الخرساني للحديد هو:'), [o('Save concrete', 'توفير الخرسانة'), o('Protect the steel from corrosion and fire and ensure bond', 'حماية الحديد من الصدأ والحريق وضمان التماسك'), o('Increase the section depth only', 'زيادة عمق المقطع فقط'), o('Make formwork easier', 'تسهيل الشدات')], 1,
    o('Cover protects steel against corrosion and fire and lets the bars develop bond with the concrete.', 'الغطاء يحمي الحديد من الصدأ والحريق ويسمح بتطوير التماسك بين الحديد والخرسانة.')),
  Q('c3', 'concrete', o('Grade 420 reinforcing steel has a yield strength of:', 'حديد التسليح رتبة 420 مقاومة خضوعه:'), [o('420 kPa', '420 كيلو باسكال'), o('42 MPa', '42 ميجا باسكال'), o('420 MPa', '420 ميجا باسكال'), o('4200 MPa', '4200 ميجا باسكال')], 2,
    o('The grade number is fy in MPa: Grade 420 means fy = 420 MPa (about Grade 60 in US units).', 'رقم الرتبة هو مقاومة الخضوع بالميجا باسكال: رتبة 420 تعني fy = 420 ميجا باسكال (تقريبًا Grade 60).')),
  Q('c4', 'concrete', o('The unit weight usually used for reinforced concrete is about:', 'الوزن الحجمي المعتاد للخرسانة المسلحة تقريبًا:'), [o('10 kN/m³', '10 كن/م³'), o('18 kN/m³', '18 كن/م³'), o('25 kN/m³', '25 كن/م³'), o('78.5 kN/m³', '78.5 كن/م³')], 2,
    o('About 24–25 kN/m³ for reinforced concrete. 78.5 kN/m³ is steel.', 'حوالي 24–25 كن/م³ للخرسانة المسلحة. أما 78.5 كن/م³ فهو للحديد.')),
  Q('c5', 'concrete', o('The slump test measures fresh concrete’s:', 'اختبار الهبوط يقيس في الخرسانة الطازجة:'), [o('Strength', 'المقاومة'), o('Workability (consistency)', 'القابلية للتشغيل (القوام)'), o('Air content', 'نسبة الهواء'), o('Setting time', 'زمن الشك')], 1,
    o('Slump is a quick check of consistency/workability. Strength needs cubes or cylinders.', 'الهبوط فحص سريع للقوام والقابلية للتشغيل. أما المقاومة فتحتاج مكعبات أو أسطوانات.')),
  Q('c6', 'concrete', o('In a simply supported beam under gravity load, the main tension steel at mid-span goes:', 'في كمرة بسيطة تحت أحمال الجاذبية، حديد الشد الرئيسي في منتصف البحر يوضع:'), [o('At the top', 'في الأعلى'), o('At the bottom', 'في الأسفل'), o('At mid-depth', 'في منتصف العمق'), o('Only at the supports', 'عند الركائز فقط')], 1,
    o('Positive moment puts the bottom fibres in tension, so the main bars go at the bottom.', 'العزم الموجب يجعل الألياف السفلية في شد، لذلك يوضع الحديد الرئيسي في الأسفل.')),
  Q('c7', 'concrete', o('In a cantilever beam, the main tension steel goes:', 'في الكمرة الكابولية، حديد الشد الرئيسي يوضع:'), [o('At the top', 'في الأعلى'), o('At the bottom', 'في الأسفل'), o('At mid-depth', 'في منتصف العمق'), o('Only at the free end', 'عند الطرف الحر فقط')], 0,
    o('A cantilever has negative moment: the top is in tension, so the main bars go at the top and are anchored into the support.', 'الكابولي عزمه سالب: الأعلى في شد، فيوضع الحديد الرئيسي في الأعلى ويُثبَّت داخل الركيزة.')),
  Q('c8', 'concrete', o('The weight of a 16 mm reinforcing bar is about:', 'وزن سيخ حديد قطر 16 مم تقريبًا:'), [o('0.89 kg/m', '0.89 كجم/م'), o('1.58 kg/m', '1.58 كجم/م'), o('2.47 kg/m', '2.47 كجم/م'), o('3.85 kg/m', '3.85 كجم/م')], 1,
    o('Weight ≈ d²/162 kg/m = 256/162 ≈ 1.58 kg/m. 0.89 is 12 mm, 2.47 is 20 mm, 3.85 is 25 mm.', 'الوزن ≈ d²/162 كجم/م = 256/162 ≈ 1.58 كجم/م. و0.89 لقطر 12 مم، و2.47 لقطر 20 مم، و3.85 لقطر 25 مم.')),

  // ── Soil mechanics ──
  Q('g1', 'soil', o('Atterberg limits describe the consistency of:', 'حدود أتربرج تصف قوام:'), [o('Gravels', 'الزلط'), o('Clean sands', 'الرمال النظيفة'), o('Fine-grained soils (silts and clays)', 'التربة الناعمة (الطمي والطين)'), o('Rock', 'الصخور')], 2,
    o('Liquid, plastic and shrinkage limits describe how the water content changes the behaviour of fine soils.', 'حد السيولة واللدونة والانكماش تصف تأثير المحتوى المائي على سلوك التربة الناعمة.')),
  Q('g2', 'soil', o('Terzaghi’s effective stress is:', 'الإجهاد الفعال حسب ترزاجي هو:'), [o('Total stress + pore water pressure', 'الإجهاد الكلي + ضغط ماء المسام'), o('Total stress − pore water pressure', 'الإجهاد الكلي − ضغط ماء المسام'), o('Pore water pressure only', 'ضغط ماء المسام فقط'), o('Total stress × void ratio', 'الإجهاد الكلي × نسبة الفراغات')], 1,
    o('σ′ = σ − u. Effective stress controls strength and settlement.', 'σ′ = σ − u. والإجهاد الفعال هو الذي يتحكم في المقاومة والهبوط.')),
  Q('g3', 'soil', o('The Proctor compaction test gives:', 'اختبار بروكتور للدمك يعطي:'), [o('Bearing capacity', 'قدرة التحمل'), o('Maximum dry density and optimum moisture content', 'أقصى كثافة جافة والمحتوى المائي الأمثل'), o('Permeability', 'النفاذية'), o('Shear strength', 'مقاومة القص')], 1,
    o('Compaction curves give the maximum dry density and the moisture content at which it occurs; site compaction is checked against it.', 'منحنى الدمك يعطي أقصى كثافة جافة والمحتوى المائي المناظر لها، ويُقارن به الدمك في الموقع.')),
  Q('g4', 'soil', o('Which soil usually has the highest permeability?', 'أي تربة لها عادة أعلى نفاذية؟'), [o('Clay', 'الطين'), o('Silt', 'الطمي'), o('Sand', 'الرمل'), o('Gravel', 'الزلط')], 3,
    o('Permeability falls with particle size: gravel > sand > silt > clay.', 'تقل النفاذية بصغر حجم الحبيبات: زلط > رمل > طمي > طين.')),
  Q('g5', 'soil', o('A soil has a void ratio e = 1.0. Its porosity is:', 'تربة نسبة الفراغات فيها e = 1.0. مساميتها:'), [same('0.25'), same('0.5'), same('1.0'), same('2.0')], 1,
    o('n = e/(1 + e) = 1/2 = 0.5.', 'المسامية من نسبة الفراغات: n = e/(1 + e) = 1/2 = 0.5.')),
  Q('g6', 'soil', o('The SPT N-value is the number of blows to drive the sampler:', 'قيمة N في اختبار الاختراق القياسي هي عدد الضربات لدفع العينة:'), [o('The first 150 mm', 'أول 150 مم'), o('The last 300 mm after a 150 mm seating drive', 'آخر 300 مم بعد 150 مم تثبيت'), o('450 mm in total', '450 مم كاملة'), o('1 m', '1 م')], 1,
    o('The first 150 mm is seating; N is the blow count for the next 300 mm.', 'أول 150 مم للتثبيت، و N هي عدد الضربات للـ300 مم التالية.')),
  Q('g7', 'soil', o('Long-term consolidation settlement is most important in:', 'هبوط الدمج طويل المدى يكون أكثر أهمية في:'), [o('Dense gravel', 'الزلط الكثيف'), o('Saturated clay', 'الطين المشبع'), o('Dry sand', 'الرمل الجاف'), o('Rock', 'الصخور')], 1,
    o('Saturated clays drain slowly, so they keep settling as excess pore pressure dissipates over months or years.', 'الطين المشبع بطيء التصريف، فيستمر الهبوط مع تبدد ضغط الماء الزائد على مدى شهور أو سنوات.')),
  Q('g8', 'soil', o('The total vertical stress 5 m below ground in a soil of unit weight 18 kN/m³ is:', 'الإجهاد الرأسي الكلي على عمق 5 م في تربة وزنها الحجمي 18 كن/م³:'), [o('3.6 kPa', '3.6 كيلو باسكال'), o('23 kPa', '23 كيلو باسكال'), o('90 kPa', '90 كيلو باسكال'), o('180 kPa', '180 كيلو باسكال')], 2,
    o('σ = γ·z = 18 × 5 = 90 kPa.', 'σ = γ·z = 18 × 5 = 90 كيلو باسكال.')),

  // ── Engineering economics ──
  Q('x1', 'economics', o('1000 is invested at 10% a year, compounded yearly. After 2 years it is worth:', 'استُثمر 1000 بفائدة 10٪ سنويًا مركبة. بعد سنتين تصبح:'), [same('1100'), same('1200'), same('1210'), same('1331')], 2,
    o('F = P(1 + i)ⁿ = 1000 × 1.1² = 1210. 1200 would be simple interest.', 'F = P(1 + i)ⁿ = 1000 × 1.1² = 1210. أما 1200 فهي فائدة بسيطة.')),
  Q('x2', 'economics', o('At 10% a year, what is 1100 received in one year worth today?', 'بمعدل 10٪ سنويًا، كم قيمة 1100 تُستلم بعد سنة اليوم؟'), [same('990'), same('1000'), same('1100'), same('1210')], 1,
    o('P = F/(1 + i) = 1100/1.1 = 1000.', 'القيمة الحالية: P = F/(1 + i) = 1100/1.1 = 1000.')),
  Q('x3', 'economics', o('A machine costs 50 000 and saves 10 000 a year. The simple payback period is:', 'ماكينة تكلف 50000 وتوفر 10000 سنويًا. فترة الاسترداد البسيطة:'), [o('2 years', 'سنتان'), o('5 years', '5 سنوات'), o('10 years', '10 سنوات'), o('50 years', '50 سنة')], 1,
    o('Payback = cost / annual saving = 50 000 / 10 000 = 5 years (ignoring the time value of money).', 'فترة الاسترداد = التكلفة / التوفير السنوي = 50000 / 10000 = 5 سنوات (بدون القيمة الزمنية للنقود).')),
  Q('x4', 'economics', o('Equipment costs 100 000 with a salvage value of 20 000 after 8 years. Straight-line depreciation per year is:', 'معدة تكلف 100000 وقيمة خردتها 20000 بعد 8 سنوات. الإهلاك الخطي السنوي:'), [same('12 500'), same('10 000'), same('8 000'), same('15 000')], 1,
    o('(100 000 − 20 000) / 8 = 10 000 a year.', '(100000 − 20000) / 8 = 10000 سنويًا.')),
  Q('x5', 'economics', o('Raising the discount rate makes the NPV of future positive cash flows:', 'رفع معدل الخصم يجعل صافي القيمة الحالية للتدفقات المستقبلية الموجبة:'), [o('Higher', 'أعلى'), o('Lower', 'أقل'), o('Unchanged', 'بدون تغيير'), o('Always negative', 'سالبة دائمًا')], 1,
    o('Each future amount is divided by (1 + i)ⁿ, so a higher i gives a smaller present value.', 'كل مبلغ مستقبلي يُقسم على (1 + i)ⁿ، فارتفاع i يقلل القيمة الحالية.')),
  Q('x6', 'economics', o('By the rule of 72, money growing at 8% a year doubles in about:', 'حسب قاعدة 72، المال الذي ينمو 8٪ سنويًا يتضاعف في حوالي:'), [o('6 years', '6 سنوات'), o('9 years', '9 سنوات'), o('12 years', '12 سنة'), o('16 years', '16 سنة')], 1,
    o('72 / 8 = 9 years. The exact value is ln 2 / ln 1.08 ≈ 9.01 years.', '72 / 8 = 9 سنوات. والقيمة الدقيقة ln 2 / ln 1.08 ≈ 9.01 سنة.')),
  Q('x7', 'economics', o('When choosing between alternatives, money already spent and not recoverable (sunk cost) should be:', 'عند المفاضلة بين البدائل، المبالغ التي صُرفت ولا يمكن استردادها (التكلفة الغارقة) يجب:'), [o('Added to every option', 'إضافتها لكل بديل'), o('Ignored', 'تجاهلها'), o('Doubled', 'مضاعفتها'), o('Spread over the project life', 'توزيعها على عمر المشروع')], 1,
    o('Only future costs and benefits that differ between options matter; sunk costs are the same whatever you choose.', 'المهم فقط التكاليف والمنافع المستقبلية التي تختلف بين البدائل، والتكلفة الغارقة واحدة أيًا كان الاختيار.')),
  Q('x8', 'economics', o('A nominal 12% a year compounded monthly gives an effective annual rate of about:', 'معدل اسمي 12٪ سنويًا مركب شهريًا يعطي معدلًا فعليًا سنويًا تقريبًا:'), [same('12.00%'), same('12.36%'), same('12.68%'), same('13.00%')], 2,
    o('(1 + 0.12/12)¹² − 1 = 1.01¹² − 1 ≈ 12.68%. 12.36% would be half-yearly compounding.', '(1 + 0.12/12)¹² − 1 = 1.01¹² − 1 ≈ 12.68٪. أما 12.36٪ فهي للتركيب نصف السنوي.')),

  // ── Ethics and safety ──
  Q('k1', 'ethics', o('An engineer’s first duty, in every major code of ethics, is to:', 'الواجب الأول للمهندس في كل مواثيق أخلاقيات المهنة الرئيسية هو:'), [o('The employer’s profit', 'ربح صاحب العمل'), o('The safety, health and welfare of the public', 'سلامة وصحة ورفاهية الجمهور'), o('Finishing on time', 'الإنجاز في الموعد'), o('Their own reputation', 'سمعته الشخصية')], 1,
    o('Codes such as NSPE’s put public safety, health and welfare first, above loyalty to clients and employers.', 'مواثيق مثل ميثاق NSPE تضع سلامة وصحة ورفاهية الجمهور أولًا، قبل الولاء للعملاء وأصحاب العمل.')),
  Q('k2', 'ethics', o('Your manager asks you to sign and stamp drawings you have not checked. You should:', 'مديرك يطلب منك توقيع وختم لوحات لم تراجعها. يجب عليك:'), [o('Sign: the manager is responsible', 'التوقيع، فالمدير هو المسؤول'), o('Sign only if the deadline is close', 'التوقيع فقط إذا كان الموعد قريبًا'), o('Refuse until you have checked them yourself', 'الرفض حتى تراجعها بنفسك'), o('Ask a colleague to sign instead', 'تطلب من زميل التوقيع بدلًا منك')], 2,
    o('Only sign work done or checked under your responsible charge. Your stamp means you take responsibility for it.', 'لا توقّع إلا على عمل نُفذ أو رُوجع تحت إشرافك المسؤول، فختمك يعني أنك تتحمل مسؤوليته.')),
  Q('k3', 'ethics', o('In the hierarchy of hazard controls, the most effective control is:', 'في هرم التحكم في المخاطر، أكثر الإجراءات فعالية هو:'), [o('Personal protective equipment', 'معدات الوقاية الشخصية'), o('Warning signs', 'لوحات التحذير'), o('Elimination of the hazard', 'إزالة الخطر'), o('Training', 'التدريب')], 2,
    o('Elimination > substitution > engineering controls > administrative controls > PPE (least effective).', 'الإزالة > الاستبدال > الضوابط الهندسية > الضوابط الإدارية > معدات الوقاية الشخصية (الأقل فعالية).')),
  Q('k4', 'ethics', o('Before anyone enters a confined space (tank, manhole), the first steps are:', 'قبل دخول أي شخص لمكان محصور (خزان، غرفة تفتيش) الخطوات الأولى هي:'), [o('Enter quickly to save time', 'الدخول بسرعة لتوفير الوقت'), o('A permit, isolation and testing the atmosphere', 'تصريح وعزل وقياس الغازات'), o('Wear a dust mask only', 'لبس كمامة غبار فقط'), o('Wait for the end of the shift', 'الانتظار لنهاية الوردية')], 1,
    o('Confined space entry needs a permit, isolation, gas testing (oxygen, flammables, toxics such as H₂S), ventilation and a standby person with a rescue plan.', 'دخول الأماكن المحصورة يتطلب تصريحًا وعزلًا وقياس الغازات (الأكسجين والقابلة للاشتعال والسامة مثل H₂S) وتهوية وشخصًا مراقبًا وخطة إنقاذ.')),
  Q('k5', 'ethics', o('You discover you have a financial interest in a supplier you are evaluating. You should:', 'اكتشفت أن لك مصلحة مالية في مورّد تقوم بتقييمه. يجب عليك:'), [o('Keep quiet if the supplier is good', 'السكوت إذا كان المورد جيدًا'), o('Disclose it to your employer or client', 'الإفصاح عنها لصاحب العمل أو العميل'), o('Give the supplier a lower score to be fair', 'إعطاء المورد درجة أقل لتكون عادلًا'), o('Ask the supplier for a discount', 'طلب خصم من المورد')], 1,
    o('Conflicts of interest must be disclosed so others can decide whether you should take part.', 'يجب الإفصاح عن تضارب المصالح حتى يقرر الآخرون هل تشارك في القرار أم لا.')),
  Q('k6', 'ethics', o('The purpose of lockout/tagout (LOTO) is to:', 'الغرض من إجراء القفل والتعليق (LOTO) هو:'), [o('Lock the site at night', 'قفل الموقع ليلًا'), o('Isolate energy sources so equipment cannot start during maintenance', 'عزل مصادر الطاقة حتى لا تعمل المعدة أثناء الصيانة'), o('Record working hours', 'تسجيل ساعات العمل'), o('Label spare parts', 'تمييز قطع الغيار')], 1,
    o('LOTO isolates and locks electrical, mechanical, hydraulic and stored energy, and the isolation is verified before work starts.', 'إجراء LOTO يعزل ويقفل مصادر الطاقة الكهربائية والميكانيكية والهيدروليكية والمخزنة، ويُتحقق من العزل قبل بدء العمل.')),
];

/** Rotate each question's options so the correct answer is spread evenly over the four positions
 *  (otherwise guessing one letter would pay). Explanations never refer to positions, so rotation is safe. */
export const PRACTICE: PracticeQ[] = RAW.map((q, i) => {
  const k = (((i % 4) - q.answer) % 4 + 4) % 4;
  const options = q.options.map((_, j) => q.options[(j - k + 4) % 4]);
  return { ...q, options, answer: (q.answer + k) % 4 };
});

export const trackQuestions = (id: TrackId) => PRACTICE.filter((q) => q.track === id);

/** Tracks for a discipline (all tracks stay reachable; these are shown first). */
export function tracksFor(d: Discipline) {
  return [...TRACKS].sort((a, b) => Number(b.disciplines === 'all' || b.disciplines.includes(d)) - Number(a.disciplines === 'all' || a.disciplines.includes(d)));
}

/** Shuffle with a seed so a session can be restored. */
export function shuffled<X>(xs: X[], seed: number) {
  const a = xs.slice();
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

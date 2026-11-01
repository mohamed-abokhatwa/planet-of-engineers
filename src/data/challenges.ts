import type { Discipline } from '../lib/types';

type T = { en: string; ar: string };
export interface Challenge {
  discipline: Discipline;
  q: T;
  options: T[];
  answer: number; // index into options
  explain: T;
}

const o = (en: string, ar: string): T => ({ en, ar });

// Exam-style questions (FE/PE level fundamentals). One is shown per day; the order repeats.
export const CHALLENGES: Challenge[] = [
  {
    discipline: 'civil',
    q: o('At what age is the standard compressive strength of concrete (fc) usually specified?', 'في أي عمر تُحدَّد عادةً مقاومة الضغط القياسية للخرسانة (fc)؟'),
    options: [o('7 days', '7 أيام'), o('14 days', '14 يومًا'), o('28 days', '28 يومًا'), o('90 days', '90 يومًا')],
    answer: 2,
    explain: o('Design codes specify concrete strength at 28 days; 7-day results are used only as an early indicator (~65–70%).', 'تحدد أكواد التصميم مقاومة الخرسانة عند 28 يومًا، ونتائج 7 أيام مؤشر مبكر فقط (حوالي 65–70٪).'),
  },
  {
    discipline: 'structural',
    q: o('Maximum bending moment of a simply supported beam with uniform load w over span L?', 'ما أقصى عزم انحناء لكمرة بسيطة الارتكاز تحت حمل منتظم w على بحر L؟'),
    options: [o('wL²/2', 'wL²/2'), o('wL²/8', 'wL²/8'), o('wL²/12', 'wL²/12'), o('wL/4', 'wL/4')],
    answer: 1,
    explain: o('For a simply supported beam M_max = wL²/8 at mid-span. wL²/12 is the fixed-end moment; wL²/2 is a cantilever.', 'للكمرة البسيطة M_max = wL²/8 في المنتصف. أما wL²/12 فهو عزم الطرف المثبت، وwL²/2 للكابولي.'),
  },
  {
    discipline: 'civil',
    q: o('Increasing the water–cement ratio of a concrete mix generally…', 'زيادة نسبة الماء إلى الأسمنت في الخلطة الخرسانية عمومًا…'),
    options: [o('Increases strength', 'تزيد المقاومة'), o('Decreases strength', 'تقلل المقاومة'), o('Has no effect on strength', 'لا تؤثر على المقاومة'), o('Decreases workability', 'تقلل القابلية للتشغيل')],
    answer: 1,
    explain: o('Abrams’ law: more water than needed for hydration leaves pores, so strength drops while workability rises.', 'قانون أبرامز: الماء الزائد عن حاجة الإماهة يترك فراغات فتقل المقاومة بينما تزيد القابلية للتشغيل.'),
  },
  {
    discipline: 'structural',
    q: o('Typical modulus of elasticity of structural steel?', 'ما معامل المرونة النموذجي لحديد الإنشاء؟'),
    options: [o('20 GPa', '20 جيجا باسكال'), o('70 GPa', '70 جيجا باسكال'), o('200 GPa', '200 جيجا باسكال'), o('2000 GPa', '2000 جيجا باسكال')],
    answer: 2,
    explain: o('E ≈ 200–210 GPa for steel. Aluminium is ~70 GPa; normal concrete roughly 25–35 GPa.', 'E ≈ 200–210 جيجا باسكال للحديد. الألومنيوم حوالي 70، والخرسانة العادية 25–35 تقريبًا.'),
  },
  {
    discipline: 'civil',
    q: o('The SPT "N" value is the number of blows to drive the sampler…', 'قيمة N في اختبار الاختراق القياسي هي عدد الضربات لدفع العينة…'),
    options: [o('The first 150 mm', 'أول 150 مم'), o('The last 300 mm of 450 mm', 'آخر 300 مم من 450 مم'), o('The full 450 mm', 'كامل 450 مم'), o('1 metre', 'مترًا واحدًا')],
    answer: 1,
    explain: o('The first 150 mm is a seating drive; N is the sum of blows for the next two 150 mm increments.', 'أول 150 مم للتثبيت، وN هو مجموع ضربات الـ 150 مم التاليتين.'),
  },
  {
    discipline: 'electrical',
    q: o('Active power of a balanced three-phase load is…', 'القدرة الفعالة لحمل ثلاثي الأطوار متزن هي…'),
    options: [o('V × I', 'V × I'), o('3 × V × I', '3 × V × I'), o('√3 × V_L × I_L × cos φ', '√3 × V_L × I_L × cos φ'), o('V² / R × cos φ', 'V² / R × cos φ')],
    answer: 2,
    explain: o('With line voltage and line current, P = √3·V_L·I_L·cos φ (or 3·V_ph·I_ph·cos φ).', 'باستخدام جهد وتيار الخط: P = √3·V_L·I_L·cos φ (أو 3·V_ph·I_ph·cos φ).'),
  },
  {
    discipline: 'electrical',
    q: o('Which device protects people against electric shock from earth leakage?', 'أي جهاز يحمي الأشخاص من الصدمة الكهربائية الناتجة عن التسرب الأرضي؟'),
    options: [o('MCB', 'قاطع MCB'), o('RCD / RCCB (30 mA)', 'جهاز RCD / RCCB بحساسية 30 مللي أمبير'), o('Surge arrester', 'مانعة الصواعق'), o('Contactor', 'كونتاكتور')],
    answer: 1,
    explain: o('An RCD trips when phase and neutral currents differ (leakage). 30 mA is the usual personal-protection rating; MCBs protect cables from overcurrent.', 'يفصل الـ RCD عند اختلاف تيار الفاز والنيوترال (تسرب). 30 مللي أمبير هي الحساسية المعتادة لحماية الأشخاص، أما MCB فيحمي الكابلات من زيادة التيار.'),
  },
  {
    discipline: 'electrical',
    q: o('The unit of reactive power is…', 'وحدة القدرة غير الفعالة هي…'),
    options: [o('W', 'W'), o('VA', 'VA'), o('VAr', 'VAr'), o('Wh', 'Wh')],
    answer: 2,
    explain: o('Active power: W. Apparent power: VA. Reactive power: VAr (volt-ampere reactive).', 'القدرة الفعالة: W، الظاهرية: VA، غير الفعالة: VAr.'),
  },
  {
    discipline: 'mechanical',
    q: o('Which is NOT an assumption of Bernoulli’s equation?', 'أي مما يلي ليس من فرضيات معادلة برنولي؟'),
    options: [o('Steady flow', 'سريان مستقر'), o('Incompressible fluid', 'مائع غير قابل للانضغاط'), o('Significant viscous losses', 'فواقد لزوجة كبيرة'), o('Along a streamline', 'على امتداد خط انسياب')],
    answer: 2,
    explain: o('Bernoulli assumes inviscid (frictionless) flow. Real losses are added separately, e.g. Darcy–Weisbach head loss.', 'تفترض برنولي سريانًا عديم اللزوجة، وتُضاف الفواقد الحقيقية منفصلة مثل فاقد دارسي–فايسباخ.'),
  },
  {
    discipline: 'mechanical',
    q: o('Flow in a circular pipe is normally laminar when the Reynolds number is below about…', 'يكون السريان في ماسورة دائرية رقائقيًا عادةً عندما يكون رقم رينولدز أقل من حوالي…'),
    options: [o('230', '230'), o('2300', '2300'), o('23,000', '23,000'), o('230,000', '230,000')],
    answer: 1,
    explain: o('Re < ~2300 laminar, 2300–4000 transitional, above ~4000 turbulent.', 'أقل من 2300 رقائقي، من 2300 إلى 4000 انتقالي، وأعلى من 4000 مضطرب.'),
  },
  {
    discipline: 'mechanical',
    q: o('Carnot efficiency of an engine working between 600 K and 300 K?', 'ما كفاءة كارنو لمحرك يعمل بين 600 كلفن و300 كلفن؟'),
    options: [o('25%', '25٪'), o('50%', '50٪'), o('67%', '67٪'), o('100%', '100٪')],
    answer: 1,
    explain: o('η = 1 − Tc/Th = 1 − 300/600 = 0.5. Temperatures must be absolute (kelvin).', 'η = 1 − Tc/Th = 1 − 300/600 = 0.5، ويجب استخدام درجات الحرارة المطلقة (كلفن).'),
  },
  {
    discipline: 'mechanical',
    q: o('One ton of refrigeration (TR) is approximately…', 'طن التبريد الواحد يساوي تقريبًا…'),
    options: [o('1 kW', '1 كيلوواط'), o('3.517 kW', '3.517 كيلوواط'), o('12 kW', '12 كيلوواط'), o('0.75 kW', '0.75 كيلوواط')],
    answer: 1,
    explain: o('1 TR = 12,000 BTU/h ≈ 3.517 kW: the heat to melt one short ton of ice in 24 hours.', '1 طن تبريد = 12,000 BTU/h ≈ 3.517 كيلوواط، وهي الحرارة اللازمة لإذابة طن قصير من الثلج في 24 ساعة.'),
  },
  {
    discipline: 'chemical',
    q: o('Which unit operation separates components mainly by differences in boiling point?', 'أي عملية تفصل المكونات أساسًا بناءً على اختلاف درجات الغليان؟'),
    options: [o('Filtration', 'الترشيح'), o('Distillation', 'التقطير'), o('Sedimentation', 'الترسيب'), o('Crystallization', 'التبلور')],
    answer: 1,
    explain: o('Distillation exploits relative volatility. Filtration and sedimentation separate by particle size and density.', 'يعتمد التقطير على اختلاف التطاير، بينما يفصل الترشيح والترسيب حسب الحجم والكثافة.'),
  },
  {
    discipline: 'chemical',
    q: o('What does BOD measure in wastewater?', 'ماذا يقيس BOD في مياه الصرف؟'),
    options: [o('Dissolved metals', 'المعادن الذائبة'), o('Oxygen consumed by microorganisms decomposing organic matter', 'الأكسجين الذي تستهلكه الكائنات الدقيقة لتحليل المواد العضوية'), o('Water hardness', 'عسر الماء'), o('Total suspended solids', 'إجمالي المواد العالقة')],
    answer: 1,
    explain: o('Biochemical Oxygen Demand (usually BOD5 at 20 °C) indicates biodegradable organic load.', 'الطلب البيوكيميائي على الأكسجين (عادة BOD5 عند 20 °م) يدل على الحمل العضوي القابل للتحلل.'),
  },
  {
    discipline: 'general',
    q: o('In the hierarchy of hazard controls, which is the MOST effective?', 'في هرم التحكم في المخاطر، ما الأكثر فاعلية؟'),
    options: [o('PPE', 'معدات الحماية الشخصية'), o('Administrative controls', 'الضوابط الإدارية'), o('Engineering controls', 'الضوابط الهندسية'), o('Elimination', 'إزالة الخطر')],
    answer: 3,
    explain: o('Elimination › substitution › engineering controls › administrative controls › PPE (the last line of defence).', 'الإزالة ثم الاستبدال ثم الضوابط الهندسية ثم الإدارية، ومعدات الحماية الشخصية هي آخر خط دفاع.'),
  },
  {
    discipline: 'general',
    q: o('The area under a velocity–time graph represents…', 'المساحة تحت منحنى السرعة–الزمن تمثل…'),
    options: [o('Acceleration', 'العجلة'), o('Displacement', 'الإزاحة'), o('Force', 'القوة'), o('Jerk', 'معدل تغير العجلة')],
    answer: 1,
    explain: o('Integrating velocity over time gives displacement; the slope of the graph gives acceleration.', 'تكامل السرعة على الزمن يعطي الإزاحة، وميل المنحنى يعطي العجلة.'),
  },
  {
    discipline: 'civil',
    q: o('An automatic (dumpy) level is mainly used to measure…', 'يُستخدم الميزان الأوتوماتيكي أساسًا لقياس…'),
    options: [o('Horizontal angles', 'الزوايا الأفقية'), o('Differences in height', 'فروق المناسيب'), o('Distances by laser only', 'المسافات بالليزر فقط'), o('Soil density', 'كثافة التربة')],
    answer: 1,
    explain: o('Levelling with a staff gives differences in elevation; theodolites and total stations measure angles.', 'الميزانية مع القامة تعطي فروق المناسيب، أما التيودوليت والتوتال ستيشن فلقياس الزوايا.'),
  },
  {
    discipline: 'architecture',
    q: o('The golden ratio, often used in architectural proportion, is approximately…', 'النسبة الذهبية المستخدمة غالبًا في النسب المعمارية تساوي تقريبًا…'),
    options: [o('1.414', '1.414'), o('1.618', '1.618'), o('2.718', '2.718'), o('3.142', '3.142')],
    answer: 1,
    explain: o('φ = (1 + √5)/2 ≈ 1.618. 1.414 is √2 (used in A-series paper), 2.718 is e, 3.142 is π.', 'φ = (1 + √5)/2 ≈ 1.618. أما 1.414 فهو √2 (مقاسات ورق A)، و2.718 هو e، و3.142 هو π.'),
  },
  {
    discipline: 'software',
    q: o('Time complexity of binary search on a sorted array?', 'ما التعقيد الزمني للبحث الثنائي في مصفوفة مرتبة؟'),
    options: [o('O(1)', 'O(1)'), o('O(log n)', 'O(log n)'), o('O(n)', 'O(n)'), o('O(n log n)', 'O(n log n)')],
    answer: 1,
    explain: o('Each step halves the search range, so about log₂ n comparisons are needed.', 'كل خطوة تقسم نطاق البحث نصفين، فنحتاج تقريبًا log₂ n مقارنة.'),
  },
  {
    discipline: 'software',
    q: o('Which Git command creates a new branch and switches to it?', 'أي أمر Git ينشئ فرعًا جديدًا وينتقل إليه؟'),
    options: [o('git branch new', 'git branch new'), o('git switch -c new', 'git switch -c new'), o('git merge new', 'git merge new'), o('git fetch new', 'git fetch new')],
    answer: 1,
    explain: o('git switch -c (or the older git checkout -b) creates and checks out the branch. git branch only creates it.', 'الأمر git switch -c (أو القديم git checkout -b) ينشئ الفرع وينتقل إليه، بينما git branch ينشئه فقط.'),
  },
  {
    discipline: 'civil',
    q: o('Superelevation on a highway curve mainly counteracts…', 'الميل الجانبي (الرفع) في منحنيات الطرق يقاوم أساسًا…'),
    options: [o('Rain runoff', 'جريان مياه الأمطار'), o('Centrifugal effect', 'تأثير القوة الطاردة المركزية'), o('Thermal expansion', 'التمدد الحراري'), o('Settlement', 'الهبوط')],
    answer: 1,
    explain: o('Banking the road lets a component of weight provide the centripetal force, reducing reliance on tyre friction.', 'إمالة الطريق تجعل مركبة من الوزن توفر القوة المركزية فيقل الاعتماد على احتكاك الإطارات.'),
  },
  {
    discipline: 'civil',
    q: o('Manning’s equation is used for…', 'تُستخدم معادلة مانينج في…'),
    options: [o('Pressurised pipe flow only', 'السريان في المواسير المضغوطة فقط'), o('Open-channel flow', 'السريان في القنوات المفتوحة'), o('Groundwater seepage', 'تسرب المياه الجوفية'), o('Pump selection', 'اختيار المضخات')],
    answer: 1,
    explain: o('V = (1/n)·R^(2/3)·S^(1/2): flow velocity in channels and gravity sewers from roughness n, hydraulic radius and slope.', 'V = (1/n)·R^(2/3)·S^(1/2) لحساب السرعة في القنوات والمجاري بالجاذبية من الخشونة ونصف القطر الهيدروليكي والميل.'),
  },
  {
    discipline: 'mechanical',
    q: o('Ductility of a metal is commonly measured by…', 'تُقاس مطيلية المعدن عادةً بـ…'),
    options: [o('Hardness number', 'رقم الصلادة'), o('Percentage elongation at fracture', 'نسبة الاستطالة عند الكسر'), o('Density', 'الكثافة'), o('Modulus of elasticity', 'معامل المرونة')],
    answer: 1,
    explain: o('Elongation (and reduction of area) in a tensile test show how much a metal deforms plastically before breaking.', 'الاستطالة ونسبة نقص المساحة في اختبار الشد توضح مقدار التشكل اللدن قبل الكسر.'),
  },
  {
    discipline: 'structural',
    q: o('Euler’s critical buckling load of a column is proportional to…', 'حمل الانبعاج الحرج لأويلر في العمود يتناسب مع…'),
    options: [o('L', 'L'), o('1/L', '1/L'), o('1/L²', '1/L²'), o('L²', 'L²')],
    answer: 2,
    explain: o('P_cr = π²EI/(KL)². Doubling the effective length cuts the buckling load to a quarter.', 'P_cr = π²EI/(KL)²، فمضاعفة الطول الفعال تخفض حمل الانبعاج إلى الربع.'),
  },
  {
    discipline: 'electrical',
    q: o('Why can’t a conventional transformer work on steady DC?', 'لماذا لا يعمل المحول التقليدي على تيار مستمر ثابت؟'),
    options: [o('DC voltage is too low', 'جهد المستمر منخفض جدًا'), o('No changing flux, so no induced voltage', 'لا يوجد فيض متغير فلا يتولد جهد مستحث'), o('Copper resists DC', 'النحاس يقاوم المستمر'), o('DC damages the core instantly', 'المستمر يتلف القلب فورًا')],
    answer: 1,
    explain: o('Transformers rely on mutual induction from a changing magnetic flux. Steady DC gives constant flux and only heats the winding.', 'يعتمد المحول على الحث المتبادل من فيض متغير، والتيار المستمر الثابت يعطي فيضًا ثابتًا ويسخن الملف فقط.'),
  },
  {
    discipline: 'mechanical',
    q: o('SI unit of dynamic viscosity?', 'ما وحدة اللزوجة الديناميكية في النظام الدولي؟'),
    options: [o('m²/s', 'm²/s'), o('Pa·s', 'Pa·s'), o('N/m', 'N/m'), o('kg/m³', 'kg/m³')],
    answer: 1,
    explain: o('Dynamic viscosity μ is in Pa·s; kinematic viscosity ν = μ/ρ is in m²/s.', 'اللزوجة الديناميكية μ بوحدة Pa·s، والكينماتيكية ν = μ/ρ بوحدة m²/s.'),
  },
  {
    discipline: 'civil',
    q: o('The slump test measures concrete’s…', 'اختبار الهبوط يقيس في الخرسانة…'),
    options: [o('Compressive strength', 'مقاومة الضغط'), o('Workability / consistency', 'القابلية للتشغيل / القوام'), o('Air content', 'نسبة الهواء'), o('Setting time', 'زمن الشك')],
    answer: 1,
    explain: o('The slump cone gives a quick site check of consistency of fresh concrete; strength needs cubes or cylinders.', 'مخروط الهبوط فحص موقعي سريع لقوام الخرسانة الطازجة، أما المقاومة فتحتاج مكعبات أو أسطوانات.'),
  },
  {
    discipline: 'electrical',
    q: o('A 5 V source is connected across a 10 Ω resistor. The current is…', 'مصدر جهده 5 فولت موصل بمقاومة 10 أوم. التيار يساوي…'),
    options: [o('0.5 A', '0.5 أمبير'), o('2 A', '2 أمبير'), o('50 A', '50 أمبير'), o('15 A', '15 أمبير')],
    answer: 0,
    explain: o('Ohm’s law: I = V/R = 5/10 = 0.5 A. Power dissipated: P = V·I = 2.5 W.', 'قانون أوم: I = V/R = 5/10 = 0.5 أمبير، والقدرة المبددة P = V·I = 2.5 واط.'),
  },
  {
    discipline: 'general',
    q: o('In project scheduling, the critical path is…', 'في جدولة المشروعات، المسار الحرج هو…'),
    options: [o('The shortest path', 'أقصر مسار'), o('The longest path, with zero total float', 'أطول مسار وبدون فائض كلي'), o('The most expensive activities', 'الأنشطة الأعلى تكلفة'), o('Activities done first', 'الأنشطة التي تُنفذ أولًا')],
    answer: 1,
    explain: o('Any delay on the critical path delays the whole project, because its activities have no float.', 'أي تأخير في المسار الحرج يؤخر المشروع كله لأن أنشطته بلا فائض.'),
  },
  {
    discipline: 'civil',
    q: o('Approximate mass of 1 metre of a 10 mm steel bar?', 'الوزن التقريبي لمتر واحد من سيخ حديد قطر 10 مم؟'),
    options: [o('0.222 kg', '0.222 كجم'), o('0.617 kg', '0.617 كجم'), o('1.578 kg', '1.578 كجم'), o('2.466 kg', '2.466 كجم')],
    answer: 1,
    explain: o('Rule of thumb: d²/162 kg/m → 100/162 ≈ 0.617 kg/m. Try the Rebar tool in the Toolbox.', 'القاعدة: d²/162 كجم/م ← 100/162 ≈ 0.617 كجم/م. جرّب أداة حديد التسليح في صندوق الأدوات.'),
  },
  {
    discipline: 'general',
    q: o('A safety factor of 1.5 means the design capacity is…', 'معامل أمان 1.5 يعني أن القدرة التصميمية…'),
    options: [o('1.5 times the expected load', '1.5 مرة من الحمل المتوقع'), o('Half the expected load', 'نصف الحمل المتوقع'), o('1.5 kN more than the load', 'أكبر من الحمل بـ 1.5 كيلونيوتن'), o('Exactly equal to the load', 'مساوية تمامًا للحمل')],
    answer: 0,
    explain: o('Factor of safety = capacity ÷ demand. It covers uncertainty in loads, materials and workmanship.', 'معامل الأمان = القدرة ÷ الحمل، ويغطي عدم اليقين في الأحمال والمواد والتنفيذ.'),
  },
  {
    discipline: 'architecture',
    q: o('In building physics, a lower U-value for a wall means…', 'في فيزياء المباني، قيمة U أقل للحائط تعني…'),
    options: [o('More heat loss', 'فقد حرارة أكبر'), o('Better thermal insulation', 'عزل حراري أفضل'), o('Higher sound transmission', 'نفاذية صوت أعلى'), o('A thinner wall', 'حائطًا أرق')],
    answer: 1,
    explain: o('U-value (W/m²·K) is the heat flow per degree of temperature difference; lower is better insulated.', 'قيمة U (واط/م²·كلفن) هي معدل انتقال الحرارة لكل درجة فرق، والأقل يعني عزلًا أفضل.'),
  },
];

/** Same question for everyone on a given UTC day. */
export function challengeIndexFor(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const days = Math.floor(Date.UTC(y, m - 1, d) / 864e5);
  return ((days % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length;
}

export const JOKES: T[] = [
  o('The world is engineers… and a few other people.', 'الدنيا عبارة عن مهندسين… وشوية ناس تانيين.'),
  o('“It’s a small change.” The four most expensive words on any project.', '«تعديل صغير بس» أغلى ثلاث كلمات في أي مشروع.'),
  o('Site weather forecast: 100% chance of a revised drawing.', 'نشرة الطقس في الموقع: احتمال 100٪ لنزول لوحة معدّلة.'),
  o('Engineers don’t sleep. We just wait for the concrete to cure.', 'المهندس ما بينامش… هو بس مستني الخرسانة تشد.'),
  o('As-built drawings: the fiction section of every project library.', 'لوحات التنفيذ الفعلي: قسم الروايات الخيالية في أرشيف أي مشروع.'),
  o('My safety factor is 1.5. My patience factor is 0.8.', 'معامل الأمان عندي 1.5… ومعامل الصبر 0.8.'),
  o('I asked for a simple box. The architect sent “a dialogue between light and void”.', 'طلبت صندوق بسيط… المعماري بعت «حوار بين الضوء والفراغ».'),
  o('Engineer’s love language: “I double-checked your calculations.”', 'لغة الحب عند المهندس: «راجعت لك الحسابات مرتين».'),
  o('Coffee: the only site material with zero tolerance for shortage.', 'القهوة: المادة الوحيدة في الموقع اللي ما لهاش أي سماحية في النقص.'),
  o('Deadline approaching: the moment “approximately” becomes “exactly”.', 'لما الديدلاين يقرب، كلمة «تقريبًا» بتتحول لـ«بالظبط».'),
  o('Units matter. Ask anyone who has ordered 30 metres instead of 30 feet of anything.', 'الوحدات مهمة… اسأل أي حد طلب 30 متر بدل 30 قدم.'),
  o('“Will it work?” Engineer: “It depends.” Client: “On what?” Engineer: “Everything.”', '«هيشتغل؟» المهندس: «يعتمد». العميل: «على إيه؟» المهندس: «على كل حاجة».'),
];

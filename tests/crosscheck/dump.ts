// Runs every tool on many input cases and writes the app's results for the independent Python check.
import { writeFileSync } from 'fs';
import { TOOLS } from '../../src/tools/defs';

type Vals = Record<string, number | string>;
const out: { id: string; vals: Vals; rows: { label: string; unit: string; value: number | string }[] | null }[] = [];
const scales = [1, 0.55, 1.37, 2.4];
for (const tool of TOOLS) {
  const base: Vals = Object.fromEntries(tool.inputs.map((i) => [i.key, i.default]));
  const variants: Vals[] = [];
  for (const s of scales) variants.push(Object.fromEntries(Object.entries(base).map(([k, v]) => [k, typeof v === 'number' ? v * s : v])));
  for (const inp of tool.inputs) if (inp.kind === 'select') for (const o of inp.options) for (const s of [1, 1.37]) {
    const v: Vals = Object.fromEntries(Object.entries(base).map(([k, x]) => [k, typeof x === 'number' ? x * s : x]));
    v[inp.key] = o.value;
    variants.push(v);
  }
  for (const vals of variants) {
    const r = tool.compute(vals);
    out.push({
      id: tool.id,
      vals: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, typeof v === 'number' && !Number.isFinite(v) ? 'NaN' : v])) as Vals,
      rows: r ? r.rows.map((x) => ({ label: x.label.en, unit: typeof x.unit === 'object' ? x.unit.en : (x.unit ?? ''), value: typeof x.value === 'object' ? x.value.en : x.value })) : null,
    });
  }
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(out.length, 'cases from', TOOLS.length, 'tools');

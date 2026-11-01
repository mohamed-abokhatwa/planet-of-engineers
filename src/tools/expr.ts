// Safe expression evaluator for the scientific calculator. No eval: a small recursive-descent parser.
//
// Grammar (lowest to highest precedence):
//   expr    := term (('+' | '-') term)*
//   term    := unary (('*' | '/') unary | implicit-multiplication unary)*
//   unary   := ('-' | '+') unary | power
//   power   := postfix ('^' unary)?            (right-associative; -2^2 = -4)
//   postfix := primary ('!' | '%')*            (x% = x/100; after + or −, it is a % of the left side)
//   primary := number | constant | function primary | '(' expr ')'

export type AngleMode = 'deg' | 'rad';

const FUNCS: Record<string, (x: number, mode: AngleMode) => number> = {
  sin: (x, m) => Math.sin(m === 'deg' ? (x * Math.PI) / 180 : x),
  cos: (x, m) => Math.cos(m === 'deg' ? (x * Math.PI) / 180 : x),
  tan: (x, m) => {
    // exact infinities at 90°, 270°… instead of 1.6e16
    if (m === 'deg' && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) return NaN;
    return Math.tan(m === 'deg' ? (x * Math.PI) / 180 : x);
  },
  asin: (x, m) => toMode(Math.asin(x), m),
  acos: (x, m) => toMode(Math.acos(x), m),
  atan: (x, m) => toMode(Math.atan(x), m),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  exp: (x) => Math.exp(x),
  abs: (x) => Math.abs(x),
};
const toMode = (rad: number, m: AngleMode) => (m === 'deg' ? (rad * 180) / Math.PI : rad);

const CONSTS: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E, g: 9.80665 };

// Every recognised name, longest first.
const NAMES = [...Object.keys(FUNCS), ...Object.keys(CONSTS), 'ans'].sort((a, b) => b.length - a.length);

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'id'; v: string };

export class CalcError extends Error {}

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/√/g, ' sqrt ')
    .replace(/∛/g, ' cbrt ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/sin⁻¹/g, 'asin')
    .replace(/cos⁻¹/g, 'acos')
    .replace(/tan⁻¹/g, 'atan');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
      if (!m) throw new CalcError('number');
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      if (s[i] === '.') throw new CalcError('number'); // "2..3" or "1.2.3"
      continue;
    }
    if ('+-*/^()!%'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    // Known names first (longest wins), so "sin30" is sin 30 and "log2" is a function.
    const rest = s.slice(i).toLowerCase();
    const name = NAMES.find((n) => rest.startsWith(n));
    if (name) { out.push({ t: 'id', v: name }); i += name.length; continue; }
    const word = s.slice(i).match(/^[A-Za-z]+/);
    throw new CalcError(word ? `unknown ${word[0]}` : `unexpected ${c}`);
  }
  return out;
}

function factorial(n: number) {
  if (!Number.isInteger(n) || n < 0) throw new CalcError('factorial');
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

export function evaluate(src: string, mode: AngleMode = 'deg', ans = 0): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const startsPrimary = () => {
    const k = peek();
    return !!k && (k.t === 'num' || k.t === 'id' || (k.t === 'op' && k.v === '('));
  };

  const expr = (): number => {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v;
      const start = p;
      let r = term();
      // "200 + 10%" means 200 + 10% of 200 (= 220), like phone and desk calculators.
      if (endsWithBarePercent(start, p)) r *= v;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  // The term toks[a..b) ends in % and has no × ÷ at its top level, e.g. "10%" or "(5+5)%".
  const endsWithBarePercent = (a: number, b: number) => {
    const last = toks[b - 1];
    if (!last || last.t !== 'op' || last.v !== '%') return false;
    let depth = 0;
    for (let i = a; i < b - 1; i++) {
      const k = toks[i];
      if (k.t !== 'op') continue;
      if (k.v === '(') depth++;
      else if (k.v === ')') depth--;
      else if (depth === 0 && (k.v === '*' || k.v === '/' || k.v === '^')) return false;
    }
    return true;
  };
  const term = (): number => {
    let v = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = toks[p++].v;
        const r = unary();
        v = op === '*' ? v * r : v / r;
      } else if (startsPrimary()) {
        v *= unary(); // implicit multiplication: 2π, 3(4), 2sin30
      } else break;
    }
    return v;
  };
  const unary = (): number => {
    if (isOp('-')) { p++; return -unary(); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  };
  const power = (): number => {
    const base = postfix();
    if (isOp('^')) { p++; return Math.pow(base, unary()); }
    return base;
  };
  const postfix = (): number => {
    let v = primary();
    while (isOp('!') || isOp('%')) {
      const op = toks[p++].v;
      v = op === '!' ? factorial(v) : v / 100;
    }
    return v;
  };
  const primary = (): number => {
    const k = toks[p++];
    if (!k) throw new CalcError('incomplete');
    if (k.t === 'num') return k.v;
    if (k.t === 'op' && k.v === '(') {
      const v = expr();
      if (isOp(')')) p++; // a missing closing bracket is forgiven, like most calculators
      return v;
    }
    if (k.t === 'id') {
      if (k.v === 'ans') return ans;
      if (k.v in CONSTS) return CONSTS[k.v];
      const f = FUNCS[k.v];
      // The function takes the next operand only, so sin(30)^2 = (sin 30)² and √9^2 = (√9)², like a scientific calculator.
      if (f) return f(postfix(), mode);
      throw new CalcError(`unknown ${k.v}`);
    }
    throw new CalcError('syntax');
  };

  const v = expr();
  if (p < toks.length) throw new CalcError('syntax');
  return v;
}

/** Display format: up to 12 significant digits, scientific for very large/small numbers. */
export function formatResult(v: number) {
  if (Number.isNaN(v)) return 'Error';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e12 || abs < 1e-9) return v.toExponential(8).replace(/\.?0+e/, 'e');
  return String(Number(v.toPrecision(12)));
}

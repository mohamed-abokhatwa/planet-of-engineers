"""Independent re-implementation of every Planet of Engineers tool, written from textbook formulas
(not translated from the app code). tests/crosscheck/dump.ts writes the app's results; this script
recomputes each case and reports any difference.

Run:  npx tsx tests/crosscheck/dump.ts /tmp/cases.json && python3 tests/crosscheck/reference.py /tmp/cases.json
"""
import json, math, re, sys

G = 9.80665
RHO_STEEL = 7850.0
SQ3 = math.sqrt(3)


def f(v, k):
    x = v.get(k)
    if x == 'NaN' or x is None:
        return float('nan')
    return float(x)


def ok(*xs):
    return all(math.isfinite(x) and x > 0 for x in xs)


def fin(*xs):
    return all(math.isfinite(x) for x in xs)


def dms(deg):
    d = math.floor(deg)
    m_float = (deg - d) * 60
    m = math.floor(m_float)
    s = round((m_float - m) * 60)
    if s == 60:
        s, m = 0, m + 1
    if m == 60:
        m, d = 0, d + 1
    return f"{d}° {m:02d}′ {s:02d}″"


# ───────────────────────── Structural ─────────────────────────

def beam(v):
    w = f(v, 'w') if v['load'] == 'udl' else f(v, 'P')
    L, E, I = f(v, 'L'), f(v, 'E') * 1e9, f(v, 'I') * 1e-8  # SI: m, Pa, m^4
    if not ok(w, L, E, I):
        return None
    sup, load = v['support'], v['load']
    W = w * 1e3  # N/m or N
    # Roark / steel handbook beam tables
    table = {
        ('simple', 'udl'): (W * L**2 / 8, None, W * L / 2, 5 * W * L**4 / (384 * E * I)),
        ('cantilever', 'udl'): (W * L**2 / 2, None, W * L, W * L**4 / (8 * E * I)),
        ('fixed', 'udl'): (W * L**2 / 12, W * L**2 / 24, W * L / 2, W * L**4 / (384 * E * I)),
        ('simple', 'point'): (W * L / 4, None, W / 2, W * L**3 / (48 * E * I)),
        ('cantilever', 'point'): (W * L, None, W, W * L**3 / (3 * E * I)),
        ('fixed', 'point'): (W * L / 8, W * L / 8, W / 2, W * L**3 / (192 * E * I)),
    }
    M, Mmid, V, d = table[(sup, load)]
    rows = {('Max bending moment', 'kN·m'): M / 1e3, ('Max shear', 'kN'): V / 1e3, ('Max deflection', 'mm'): d * 1e3,
            ('Span / deflection', ''): f"L / {round(L / d)}"}
    if Mmid is not None:
        rows[('Midspan moment', 'kN·m')] = Mmid / 1e3
    return rows


def buckling(v):
    K = {'pinned': 1.0, 'fixedPinned': 0.7, 'fixedFixed': 0.5, 'fixedFree': 2.0}[v['ends']]
    L, E, I, A = f(v, 'L'), f(v, 'E') * 1e9, f(v, 'I') * 1e-8, f(v, 'A') * 1e-4
    if not ok(L, E, I):
        return None
    Le = K * L
    rows = {('Effective length factor K', ''): K, ('Effective length KL', 'm'): Le, ('Euler critical load', 'kN'): math.pi**2 * E * I / Le**2 / 1e3}
    if ok(A):
        r = math.sqrt(I / A)
        rows[('Radius of gyration', 'mm')] = r * 1e3
        rows[('Slenderness KL/r', '')] = Le / r
    return rows


def section(v):
    s = v['shape']
    if s == 'rect':
        b, h = f(v, 'rb'), f(v, 'rh')
        if not ok(b, h): return None
        A, I, c = b * h, b * h**3 / 12, h / 2
    elif s == 'circle':
        d = f(v, 'cd')
        if not ok(d): return None
        A, I, c = math.pi * d**2 / 4, math.pi * d**4 / 64, d / 2
    elif s == 'tube':
        D, t = f(v, 'tD'), f(v, 'tt')
        if not ok(D, t) or 2 * t >= D: return None
        d = D - 2 * t
        A, I, c = math.pi * (D**2 - d**2) / 4, math.pi * (D**4 - d**4) / 64, D / 2
    elif s == 'box':
        B, H, t = f(v, 'bB'), f(v, 'bH'), f(v, 'bt')
        if not ok(B, H, t) or 2 * t >= min(B, H): return None
        A = B * H - (B - 2 * t) * (H - 2 * t)
        I = B * H**3 / 12 - (B - 2 * t) * (H - 2 * t)**3 / 12
        c = H / 2
    else:
        bf, h, tf, tw = f(v, 'ibf'), f(v, 'ih'), f(v, 'itf'), f(v, 'itw')
        if not ok(bf, h, tf, tw) or 2 * tf >= h or tw >= bf: return None
        hw = h - 2 * tf
        # parallel-axis theorem on flanges + web
        A = 2 * bf * tf + hw * tw
        I = tw * hw**3 / 12 + 2 * (bf * tf**3 / 12 + bf * tf * ((h - tf) / 2)**2)
        c = h / 2
    return {('Area A', 'cm²'): A / 100, ('Moment of inertia I (strong axis)', 'cm⁴'): I / 1e4, ('Elastic modulus Z', 'cm³'): I / c / 1e3,
            ('Radius of gyration r', 'mm'): math.sqrt(I / A), ('Weight in steel', 'kg/m'): A * 1e-6 * RHO_STEEL}


def rebarspacing(v):
    As, d = f(v, 'As'), f(v, 'd')
    if not ok(As, d): return None
    ab = math.pi * d * d / 4
    s = 1000 * ab / As
    sp = math.floor(s / 25) * 25
    if sp <= 0:
        return {('Exact spacing', 'mm'): s}
    return {('Bar area', 'mm²'): ab, ('Exact spacing', 'mm'): s, ('Use spacing', 'mm'): f"Ø{v['d']} @ {sp}", ('Bars per metre', ''): 1000 / sp,
            ('Area provided', 'mm²/m'): ab * 1000 / sp}


# ───────────────────────── Civil ─────────────────────────

def concrete(v):
    single = math.pi / 4 * f(v, 'D')**2 * f(v, 'HC') if v['shape'] == 'cyl' else f(v, 'L') * f(v, 'W') * f(v, 'H')
    n, bag, waste = f(v, 'count'), f(v, 'bag'), f(v, 'waste')
    if not ok(single, n, bag) or not (waste >= 0): return None
    c, s, g = [float(x) for x in v['mix'].split(':')]
    vol = single * n
    wet = vol * (1 + waste / 100)
    dry = wet * 1.54  # dry-volume factor for nominal mixes
    cement_kg = dry * c / (c + s + g) * 1440
    return {('Net volume', 'm³'): vol, ('Volume incl. waste', 'm³'): wet, ('Cement', 'bags'): math.ceil(cement_kg / bag), ('Cement (weight)', 'kg'): cement_kg,
            ('Sand', 'm³'): dry * s / (c + s + g), ('Gravel / aggregate', 'm³'): dry * g / (c + s + g), ('Water (w/c 0.5)', 'L'): 0.5 * cement_kg}


def rebar(v):
    d, n, L, lap = f(v, 'd'), f(v, 'bars'), f(v, 'len'), f(v, 'lap')
    if not ok(d, n, L): return None
    kgm = d * d / 162.2  # handbook rule: d²/162.2 = π/4·d²·7850e-6
    tot = kgm * n * L
    return {('Weight per metre', 'kg/m'): kgm, ('Bar area', 'mm²'): math.pi * d * d / 4, ('Total length', 'm'): n * L, ('Total weight', 'kg'): tot,
            ('Total weight', 't'): tot / 1000, ('Lap length', 'mm'): max(0, lap) * d}


def masonry(v):
    L, H, op, j, w = f(v, 'L'), f(v, 'H'), f(v, 'open'), f(v, 'joint'), f(v, 'waste')
    if not ok(L, H) or not fin(op, j, w) or j < 0: return None
    ul, uh, ut = [float(x) for x in v['unit'].split('x')]
    area = max(0, L * H - max(0, op))
    per = 1e6 / ((ul + j) * (uh + j))
    units = area * per
    mortar = area * ut / 1000 * (1 - ul * uh / ((ul + j) * (uh + j)))  # joint share of the wall face
    return {('Net wall area', 'm²'): area, ('Units per m²', ''): per, ('Units incl. waste', ''): math.ceil(units * (1 + max(0, w) / 100)), ('Mortar (wet)', 'm³'): mortar}


def tiles(v):
    A, w, h, j, ws, box = [f(v, k) for k in ('A', 'w', 'h', 'joint', 'waste', 'box')]
    if not ok(A, w, h) or not fin(j, ws): return None
    j, ws = max(0, j), max(0, ws)
    per = 1e6 / ((w + j) * (h + j))
    n = math.ceil(A * per * (1 + ws / 100))
    rows = {('Tiles per m²', ''): per, ('Tiles incl. waste', ''): n, ('Adhesive (≈ 5 kg/m²)', 'kg'): 5 * A}
    if ok(box): rows[('Boxes', '')] = math.ceil(n / box)
    return rows


def plaster(v):
    A, th, bag, w = f(v, 'A'), f(v, 'th'), f(v, 'bag'), f(v, 'waste')
    if not ok(A, th, bag) or not fin(w): return None
    c, s = [float(x) for x in v['mix'].split(':')]
    wet = A * th / 1000 * (1 + max(0, w) / 100)
    dry = 1.33 * wet
    ck = dry * c / (c + s) * 1440
    return {('Wet volume', 'm³'): wet, ('Cement', 'bags'): math.ceil(ck / bag), ('Cement (weight)', 'kg'): ck, ('Sand', 'm³'): dry * s / (c + s)}


def paint(v):
    A, n, cov, w, can = [f(v, k) for k in ('A', 'coats', 'cov', 'waste', 'can')]
    if not ok(A, n, cov) or not fin(w): return None
    L = A * n / cov * (1 + max(0, w) / 100)
    r = {('Paint needed', 'L'): L}
    if ok(can): r[('Buckets', '')] = math.ceil(L / can)
    return r


def earthwork(v):
    L, W, D, tr = f(v, 'L'), f(v, 'W'), f(v, 'D'), f(v, 'truck')
    if not ok(L, W, D, tr): return None
    bank = L * W * D
    loose = bank * (1 + float(v['soil']) / 100)
    return {('Bank volume', 'm³'): bank, ('Loose volume', 'm³'): loose, ('Truck loads', ''): math.ceil(loose / tr)}


def steelweight(v):
    s, q = v['shape'], f(v, 'qty')
    kgm = None
    if s == 'plate':
        L, W, t = f(v, 'pL'), f(v, 'pW'), f(v, 'pt')
        if not ok(L, W, t): return None
        kg = L * W * t / 1000 * RHO_STEEL
    else:
        if s in ('round', 'square'):
            d, L = f(v, 'd'), f(v, 'len')
            if not ok(d, L): return None
            a = math.pi * d * d / 4 if s == 'round' else d * d
        else:
            D, t, L = f(v, 'D'), f(v, 't'), f(v, 'len')
            if not ok(D, t, L) or 2 * t >= D: return None
            a = math.pi / 4 * (D**2 - (D - 2 * t)**2) if s == 'pipe' else D**2 - (D - 2 * t)**2
        kgm = a * 1e-6 * RHO_STEEL
        kg = kgm * L
    if not ok(q): return None
    r = {('Weight of one', 'kg'): kg, ('Total weight', 'kg'): kg * q, ('Total weight', 't'): kg * q / 1000}
    if kgm is not None: r[('Weight per metre', 'kg/m')] = kgm
    return r


def tank(v):
    s = v['shape']
    if s == 'rect':
        L, W, H = f(v, 'L'), f(v, 'W'), f(v, 'H')
        if not ok(L, W, H): return None
        V = L * W * H
    else:
        D, H = f(v, 'D'), f(v, 'CH')
        if not ok(D, H): return None
        V = math.pi * D * D / 4 * H
    return {('Volume', 'm³'): V, ('Volume', 'L'): V * 1000, ('US gallons', 'gal'): V * 1000 / 3.785411784, ('Imperial gallons', 'gal'): V * 1000 / 4.54609, ('Water weight', 't'): V}


def stairs(v):
    H, R, B = f(v, 'H'), f(v, 'R'), f(v, 'B')
    if not ok(H, R, B): return None
    n = math.ceil(H / R)
    r = H / n
    g = B - 2 * r
    if g <= 0: return None
    return {('Risers', ''): n, ('Riser height', 'mm'): r, ('Treads', ''): n - 1, ('Going (tread)', 'mm'): g, ('Horizontal run', 'm'): (n - 1) * g / 1000,
            ('Pitch', '°'): math.degrees(math.atan2(r, g))}


# ───────────────────────── Electrical ─────────────────────────

def power(v):
    k = SQ3 if v['phases'] == '3' else 1
    V, pf = f(v, 'V'), f(v, 'pf')
    if not ok(V, pf) or pf > 1: return None
    sinphi = math.sqrt(1 - pf * pf)
    if v['mode'] == 'p':
        P = f(v, 'P') * 1e3
        if not ok(P): return None
        S = P / pf
        return {('Current', 'A'): S / (k * V), ('Apparent power', 'kVA'): S / 1e3, ('Reactive power', 'kVAr'): S * sinphi / 1e3}
    I = f(v, 'I')
    if not ok(I): return None
    S = k * V * I
    return {('Active power', 'kW'): S * pf / 1e3, ('Apparent power', 'kVA'): S / 1e3, ('Reactive power', 'kVAr'): S * sinphi / 1e3}


SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630]


def vdrop(v):
    k = SQ3 if v['phases'] == '3' else 2
    rho = {'copper': 0.0225, 'aluminium': 0.036}[v['cond']]
    V, I, L, pf, A, mx = [f(v, x) for x in ('V', 'I', 'L', 'pf', 'A', 'max')]
    if not ok(V, I, L, pf, A, mx) or pf > 1: return None
    X = 0.08 / 1000  # Ω/m
    drop = lambda a: k * I * L * (rho / a * pf + X * math.sqrt(1 - pf * pf))
    dv = drop(A)
    pct = dv / V * 100
    best = next((a for a in SIZES if drop(a) / V * 100 <= mx), None)
    return {('Voltage drop', 'V'): dv, ('Voltage drop', '%'): pct, ('Within limit?', ''): 'Yes' if pct <= mx else 'No',
            ('Smallest size for limit', 'mm²'): best if best is not None else '—'}


def ohm(v):
    V, I, R, P = f(v, 'V'), f(v, 'I'), f(v, 'R'), f(v, 'P')
    g = lambda x: math.isfinite(x) and x > 0
    if g(V) and g(I): R, P = V / I, V * I
    elif g(V) and g(R): I = V / R; P = V * I
    elif g(V) and g(P): I = P / V; R = V / I
    elif g(I) and g(R): V = I * R; P = V * I
    elif g(I) and g(P): V = P / I; R = V / I
    elif g(R) and g(P): V = math.sqrt(P * R); I = V / R
    else: return None
    return {('Voltage', 'V'): V, ('Current', 'A'): I, ('Resistance', 'Ω'): R, ('Power', 'W'): P}


def resistors(v):
    rs = [f(v, k) for k in ('r1', 'r2', 'r3', 'r4', 'r5', 'r6')]
    rs = [r for r in rs if math.isfinite(r) and r > 0]
    if not rs: return None
    eq = sum(rs) if v['mode'] == 'series' else 1 / sum(1 / r for r in rs)
    return {('Equivalent resistance', 'Ω'): eq, ('Resistors used', ''): len(rs)}


def pf(v):
    three = v['phases'] == '3'
    P, a, b, V, fr = f(v, 'P'), f(v, 'pf1'), f(v, 'pf2'), f(v, 'V'), f(v, 'f')
    if not ok(P, a, b, V) or a > 1 or b > 1 or b <= a: return None
    Q = P * (math.sqrt(1 - a * a) / a - math.sqrt(1 - b * b) / b)  # kVAr
    # delta-connected bank: each of 3 capacitors sees line voltage
    C = (Q * 1e3 / (3 if three else 1)) / (2 * math.pi * fr * V * V)
    k = SQ3 if three else 1
    I1, I2 = P * 1e3 / (k * V * a), P * 1e3 / (k * V * b)
    return {('Capacitor bank', 'kVAr'): Q, ('Capacitance per phase (delta)' if three else 'Capacitance', 'µF'): C * 1e6, ('Current before', 'A'): I1,
            ('Current after', 'A'): I2, ('Current reduction', '%'): (I1 - I2) / I1 * 100}


def motor(v):
    three = v['phases'] == '3'
    kW, V, p, e = f(v, 'kW'), f(v, 'V'), f(v, 'pf'), f(v, 'eff')
    if not ok(kW, V, p, e) or p > 1 or e > 100: return None
    Pin = kW / (e / 100)
    I = Pin * 1e3 / ((SQ3 if three else 1) * V * p)
    r = {('Full-load current', 'A'): I, ('Input power', 'kW'): Pin, ('Starting current, DOL (≈ 6–7×)', 'A'): f"{I * 6:.0f} – {I * 7:.0f}"}
    if three: r[('Starting current, star-delta (≈ ⅓ DOL)', 'A')] = f"{I * 2:.0f} – {I * 7 / 3:.0f}"
    return r


def energy(v):
    kW, h, d, t = f(v, 'kW'), f(v, 'h'), f(v, 'd'), f(v, 'tariff')
    if not ok(kW, h, d) or not fin(t) or h > 24: return None
    e = kW * h * d
    return {('Energy', 'kWh'): e, ('Cost', 'currency'): e * t, ('Cost per day', 'currency'): e * t / d}


TX = [25, 50, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 1600, 2000, 2500, 3150]


def transformer(v):
    P, p, g, V, z = [f(v, k) for k in ('P', 'pf', 'g', 'V', 'z')]
    if not ok(P, p, V, z) or p > 1 or not fin(g): return None
    req = P / p * (1 + max(0, g) / 100)
    std = next((s for s in TX if s >= req), None)
    kva = std if std else req
    In = kva * 1e3 / (SQ3 * V)
    return {('Required', 'kVA'): req, ('Standard size', 'kVA'): std if std else '> 3150', ('Rated secondary current', 'A'): In,
            ('Fault current at terminals', 'kA'): In / (z / 100) / 1e3}


def lighting(v):
    A, E, lm, W, uf, mf = [f(v, k) for k in ('A', 'lux', 'lm', 'W', 'uf', 'mf')]
    if not ok(A, E, lm, uf, mf) or uf > 1 or mf > 1: return None
    N = E * A / (lm * uf * mf)
    n = math.ceil(N)
    r = {('Luminaires (exact)', ''): N, ('Luminaires', ''): n, ('Achieved illuminance', 'lux'): n * lm * uf * mf / A}
    if ok(W): r[('Power density', 'W/m²')] = n * W / A
    return r


def ups(v):
    Ah, V, W, dod, e = [f(v, k) for k in ('Ah', 'V', 'W', 'dod', 'eff')]
    if not ok(Ah, V, W, dod, e) or dod > 100 or e > 100: return None
    Wh = Ah * V
    h = Wh * dod / 100 * e / 100 / W
    return {('Backup time', 'h'): h, ('Backup time', 'min'): h * 60, ('Stored energy', 'kWh'): Wh / 1000}


def solar(v):
    E, sun, pw, loss, days, bv = [f(v, k) for k in ('E', 'sun', 'pw', 'loss', 'days', 'bv')]
    if not ok(E, sun, pw) or not fin(loss) or loss < 0 or loss >= 100: return None
    kwp = E / sun / (1 - loss / 100)
    n = math.ceil(kwp * 1000 / pw)
    r = {('Array size', 'kWp'): kwp, ('Panels', ''): n, ('Installed', 'kWp'): n * pw / 1000}
    if ok(days, bv): r[('Battery (80% DoD, 90% inverter)', 'Ah')] = E * 1000 * days / 0.9 / 0.8 / bv
    return r


# ───────────────────────── Mechanical ─────────────────────────

EPS = {'steel': 0.045, 'galvanized': 0.15, 'castIron': 0.26, 'concrete': 0.3, 'pvc': 0.0015, 'copper': 0.0015, 'hdpe': 0.007}


def colebrook(re_, rr):
    if re_ < 2300: return 64 / re_
    x = 0.02
    for _ in range(100):  # fixed-point on 1/√f
        x = (-2 * math.log10(rr / 3.7 + 2.51 / (re_ * math.sqrt(x)))) ** -2
    return x


def pipe(v):
    Q, D, L = f(v, 'Q') / 3600, f(v, 'D') / 1000, f(v, 'L')
    if not ok(Q, D, L): return None
    vel = Q / (math.pi * D * D / 4)
    re_ = vel * D / 1.004e-6
    fr = colebrook(re_, EPS[v['mat']] / 1000 / D)
    dp = fr * L / D * 998 * vel**2 / 2
    reg = 'Laminar' if re_ < 2300 else 'Transitional' if re_ < 4000 else 'Turbulent'
    return {('Velocity', 'm/s'): vel, ('Pressure drop', 'kPa'): dp / 1e3, ('Pressure drop', 'bar'): dp / 1e5, ('Head loss', 'm'): dp / (998 * G),
            ('Reynolds number', ''): re_, ('Friction factor', ''): fr, ('Flow regime', ''): reg}


MOTORS = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400]


def pump(v):
    Q, H, e = f(v, 'Q') / 3600, f(v, 'H'), f(v, 'eff')
    if not ok(Q, H, e) or e > 100: return None
    hyd = 998 * G * Q * H
    sh = hyd / (e / 100)
    m = next((x for x in MOTORS if x >= sh / 1e3 * 1.15), None)
    return {('Hydraulic power', 'kW'): hyd / 1e3, ('Shaft power', 'kW'): sh / 1e3, ('Shaft power', 'hp'): sh / 745.69987, ('Suggested motor (+15%)', 'kW'): m if m else '—'}


def cooling(v):
    A = f(v, 'A')
    if not ok(A): return None
    kw = A * float(v['use']) / 1000
    return {('Cooling load', 'kW'): kw, ('Cooling load', 'TR'): kw * 1000 / 3516.8528, ('Cooling load', 'BTU/h'): kw * 1000 / 0.29307107}


def duct(v):
    Q, vel, h = f(v, 'Q'), f(v, 'vel'), f(v, 'h')
    if not ok(Q, vel): return None
    A = Q / 3600 / vel
    r = {('Airflow', 'cfm'): Q / 3600 / 0.000471947443, ('Cross-section area', 'm²'): A, ('Round duct diameter', 'mm'): 2000 * math.sqrt(A / math.pi)}
    if ok(h):
        w = A * 1e6 / h
        r[('Rectangular width', 'mm')] = f"{round(w)} × {v['h']}"
        r[('Aspect ratio', ': 1')] = max(w, h) / min(w, h)
        r[('Equivalent round (friction)', 'mm')] = 1.30 * (w * h) ** 0.625 / (w + h) ** 0.25  # ASHRAE (Huebscher)
    return r


SCH40 = [(15, '½″', 21.3, 2.77), (20, '¾″', 26.7, 2.87), (25, '1″', 33.4, 3.38), (32, '1¼″', 42.2, 3.56), (40, '1½″', 48.3, 3.68), (50, '2″', 60.3, 3.91),
         (65, '2½″', 73.0, 5.16), (80, '3″', 88.9, 5.49), (100, '4″', 114.3, 6.02), (125, '5″', 141.3, 6.55), (150, '6″', 168.3, 7.11), (200, '8″', 219.1, 8.18),
         (250, '10″', 273.0, 9.27), (300, '12″', 323.8, 10.31)]


def pipesize(v):
    Q, vel = f(v, 'Q') / 3600, f(v, 'vel')
    if not ok(Q, vel): return None
    d = math.sqrt(4 * Q / (math.pi * vel)) * 1000
    p = next((x for x in SCH40 if x[2] - 2 * x[3] >= d), None)
    r = {('Required internal diameter', 'mm'): d, ('Steel pipe Sch 40', ''): f"DN {p[0]} ({p[1]})" if p else 'Larger than DN 300'}
    if p:
        bore = p[2] - 2 * p[3]
        r[('Bore of that pipe', 'mm')] = bore
        r[('Actual velocity', 'm/s')] = Q / (math.pi * (bore / 1000) ** 2 / 4)
    return r


def heat(v):
    Q, dT = f(v, 'Q') / 3600, f(v, 'dT')
    if not ok(Q, dT): return None
    kw = (1.2 * 1.006 if v['medium'] == 'air' else 998 * 4.186) * Q * dT
    r = {('Heat', 'kW'): kw, ('Heat', 'TR'): kw * 1000 / 3516.8528, ('Heat', 'BTU/h'): kw * 1000 / 0.29307107}
    if v['medium'] == 'water': r[('Flow', 'L/s')] = Q * 1000
    return r


def drive(v):
    n, a, b, kw = f(v, 'rpm'), f(v, 'a'), f(v, 'b'), f(v, 'kW')
    if not ok(n, a, b): return None
    n2 = n * a / b
    r = {('Ratio', ''): f"{b / a:.3f} : 1", ('Output speed', 'rpm'): n2}
    if ok(kw): r[('Output torque (no losses)', 'N·m')] = kw * 1000 * 60 / (2 * math.pi * n2)
    return r


BOLT = {'M6': (6, 20.1, 10), 'M8': (8, 36.6, 13), 'M10': (10, 58.0, 16), 'M12': (12, 84.3, 18), 'M16': (16, 157, 24), 'M20': (20, 245, 30),
        'M24': (24, 353, 36), 'M30': (30, 561, 46), 'M36': (36, 817, 55)}


def bolt(v):
    d, As, sp = BOLT[v['size']]
    pct = f(v, 'pct')
    if not ok(pct) or pct > 100: return None
    Sp = {'8.8': 580 if d <= 16 else 600, '10.9': 830, '12.9': 970}[v['grade']]  # ISO 898-1 proof stress
    proof = Sp * As / 1000
    F = proof * pct / 100
    T = float(v['K']) * F * 1000 * d / 1000
    return {('Tensile stress area', 'mm²'): As, ('Proof load', 'kN'): proof, ('Preload', 'kN'): F, ('Tightening torque', 'N·m'): T,
            ('Tightening torque', 'lbf·ft'): T / 1.3558179483, ('Spanner size', 'mm'): sp}


def hydrostatic(v):
    h = f(v, 'h')
    if not ok(h): return None
    rho = {'water': 998, 'seawater': 1025, 'diesel': 840, 'oil': 870, 'mercury': 13546}[v['fluid']]
    p = rho * G * h
    return {('Pressure', 'kPa'): p / 1e3, ('Pressure', 'bar'): p / 1e5, ('Pressure', 'psi'): p / 6894.757, ('Absolute (+1 atm)', 'bar(a)'): (p + 101325) / 1e5}


def filltime(v):
    V, Q = f(v, 'V'), f(v, 'Q')
    if not ok(V, Q): return None
    m = V / Q * 60
    hh = math.floor(m / 60)
    mm = round(m - 60 * hh)
    return {('Time', ''): f"{hh} h {mm:02d} min", ('Time', 'min'): m, ('Flow', 'L/s'): Q * 1000 / 3600}


ALPHA = {'steel': 12, 'stainless': 17.3, 'concrete': 10, 'aluminium': 23, 'copper': 17, 'pvc': 52, 'hdpe': 180, 'glass': 9}
E_GPA = {'steel': 200, 'stainless': 193, 'aluminium': 69, 'copper': 117, 'concrete': 30}


def expansion(v):
    L, dT = f(v, 'L'), f(v, 'dT')
    if not ok(L) or not fin(dT): return None
    a = ALPHA[v['mat']] * 1e-6
    r = {('Change in length', 'mm'): a * L * dT * 1000, ('Coefficient α', '×10⁻⁶ /K'): ALPHA[v['mat']]}
    if v['mat'] in E_GPA: r[('Stress if fully restrained', 'MPa')] = E_GPA[v['mat']] * 1000 * a * abs(dT)
    return r


# ───────────────────────── Process ─────────────────────────

def dilution(v):
    xs = {k: f(v, k) for k in ('C1', 'V1', 'C2', 'V2')}
    blank = [k for k, x in xs.items() if not math.isfinite(x)]
    if len(blank) != 1 or any(x <= 0 for x in xs.values() if math.isfinite(x)): return None
    k = blank[0]
    C1, V1, C2, V2 = xs['C1'], xs['V1'], xs['C2'], xs['V2']
    if k == 'C1': C1 = C2 * V2 / V1
    if k == 'V1': V1 = C2 * V2 / C1
    if k == 'C2': C2 = C1 * V1 / V2
    if k == 'V2': V2 = C1 * V1 / C2
    r = {('C₁', ''): C1, ('V₁', ''): V1, ('C₂', ''): C2, ('V₂', ''): V2}
    if k == 'V1': r[('Solvent to add', '')] = V2 - V1
    return r


def gas(v):
    P, V, T, M = f(v, 'P') * 1000, f(v, 'V'), f(v, 'T') + 273.15, float(v['gas'])
    if not ok(P, V) or not (T > 0): return None
    n = P * V / (8.314462618 * T)
    return {('Amount', 'mol'): n, ('Mass', 'kg'): n * M / 1000, ('Density', 'kg/m³'): n * M / 1000 / V}


# ───────────────────────── Surveying ─────────────────────────

def bearing(v):
    e1, n1, e2, n2 = [f(v, k) for k in ('e1', 'n1', 'e2', 'n2')]
    if not fin(e1, n1, e2, n2): return None
    dE, dN = e2 - e1, n2 - n1
    d = math.hypot(dE, dN)
    if d == 0: return None
    # quadrant method, independent of atan2
    if dN == 0: b = 90.0 if dE > 0 else 270.0
    else:
        q = math.degrees(math.atan(abs(dE) / abs(dN)))
        b = q if dE >= 0 and dN > 0 else 180 - q if dN < 0 and dE >= 0 else 180 + q if dN < 0 else 360 - q
    b %= 360
    return {('Distance', 'm'): d, ('Bearing A → B', ''): dms(b), ('Bearing A → B', '°'): b, ('Back bearing B → A', ''): dms((b + 180) % 360),
            ('ΔE', 'm'): dE, ('ΔN', 'm'): dN}


def height(v):
    d, a, hi = f(v, 'd'), f(v, 'a'), f(v, 'hi')
    if not ok(d) or not fin(a, hi) or not (-90 < a < 90): return None
    return {('Height of object', 'm'): d * math.tan(math.radians(a)) + hi, ('Slope distance to top', 'm'): d / math.cos(math.radians(a))}


def dmsconv(v):
    if v['mode'] == 'dec':
        deg = f(v, 'x')
        if not fin(deg): return None
    else:
        D, M, S = f(v, 'D'), f(v, 'M'), f(v, 'S')
        M = M if math.isfinite(M) else 0
        S = S if math.isfinite(S) else 0
        if not fin(D) or M < 0 or S < 0 or M >= 60 or S >= 60: return None
        deg = (abs(D) + M / 60 + S / 3600) * (-1 if D < 0 else 1)
    return {('Decimal degrees', '°'): deg, ('D° M′ S″', ''): ('−' if deg < 0 else '') + dms(abs(deg)), ('Radians', 'rad'): math.radians(deg), ('Gradians', 'gon'): deg * 400 / 360}


# ───────────────────────── General ─────────────────────────

def slope(v):
    rise, run = f(v, 'rise'), f(v, 'run')
    if not ok(run) or not fin(rise) or rise < 0: return None
    return {('Gradient', '%'): rise / run * 100, ('Angle', '°'): math.degrees(math.atan(rise / run)), ('Ratio 1 : n', ''): f"1 : {run / rise:.1f}" if rise else '—',
            ('Per mille', '‰'): rise / run * 1000}


def area(v):
    s = v['shape']
    a, b, h, d = f(v, 'a'), f(v, 'b'), f(v, 'h'), f(v, 'd')
    A = {'rect': a * b, 'circle': math.pi * (d / 2) ** 2, 'tri': a * h / 2, 'trap': (a + b) * h / 2}[s]
    need = {'rect': (a, b), 'circle': (d,), 'tri': (a, h), 'trap': (a, b, h)}[s]
    if not ok(*need): return None
    return {('Area', 'm²'): A, ('Area', 'ft²'): A / 0.09290304, ('Area', 'feddan'): A / 4200.83}


def interp(v):
    x1, y1, x2, y2, x = [f(v, k) for k in ('x1', 'y1', 'x2', 'y2', 'x')]
    if not fin(x1, y1, x2, y2, x) or x1 == x2: return None
    t = (x - x1) / (x2 - x1)
    r = {('y', ''): (1 - t) * y1 + t * y2}
    if x < min(x1, x2) or x > max(x1, x2): r[('Note', '')] = 'Extrapolated (outside x₁–x₂)'
    return r


def quadratic(v):
    a, b, c = f(v, 'a'), f(v, 'b'), f(v, 'c')
    if not fin(a, b, c) or (a == 0 and b == 0): return None
    D = b * b - 4 * a * c
    if a == 0: return {('Discriminant', ''): D, ('x₁', ''): -c / b, ('x₂', ''): -c / b}
    if D >= 0:
        return {('Discriminant', ''): D, ('x₁', ''): (-b + math.sqrt(D)) / (2 * a), ('x₂', ''): (-b - math.sqrt(D)) / (2 * a)}
    re_, im = -b / (2 * a), abs(math.sqrt(-D) / (2 * a))
    return {('Discriminant', ''): D, ('x₁', ''): f"{re_:.6g} + {im:.6g}i", ('x₂', ''): f"{re_:.6g} − {im:.6g}i"}


def triangle(v):
    a, b = f(v, 'a'), f(v, 'b')
    if not ok(a, b): return None
    c = math.sqrt(a * a + b * b)
    A = math.degrees(math.asin(a / c))
    return {('Hypotenuse c', 'm'): c, ('Angle A', '°'): A, ('Angle B', '°'): 90 - A, ('Area', 'm²'): a * b / 2, ('Perimeter', 'm'): a + b + c}


def percent(v):
    a, b = f(v, 'a'), f(v, 'b')
    if not fin(a, b): return None
    r = {('Difference (new − old)', ''): b - a, ('Old value + 15% (e.g. VAT)', ''): a * 1.15}
    if a != 0: r[('Change from old to new', '%')] = (b - a) / abs(a) * 100
    if b != 0: r[('Part as % of whole', '%')] = a / b * 100
    return r


REF = {k: g for k, g in globals().items() if callable(g) and not k.startswith('_')}
REF['dms'] = dmsconv

# Relative tolerance per row. Most formulas are exact, so 1e-6. Swamee–Jain (app) vs Colebrook (here) agree within ~1.5%.
TOL = {('rebar', 'Weight per metre'): 1e-4, ('rebar', 'Total weight'): 1e-4,  # d²/162.2 is a rounded handbook rule
       ('pipe', 'Friction factor'): 0.02, ('pipe', 'Pressure drop'): 0.02, ('pipe', 'Head loss'): 0.02}


def num_in(s):
    return [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', s.replace(',', ''))]


def main(path):
    cases = json.load(open(path))
    compared = rows = 0
    problems = []
    covered = set()
    for c in cases:
        tid, vals, app = c['id'], c['vals'], c['rows']
        fn = REF.get(tid)
        if fn is None:
            problems.append(f"{tid}: no reference implementation")
            continue
        try:
            exp = fn(vals)
        except (ValueError, ZeroDivisionError, OverflowError):
            exp = None
        if (app is None) != (exp is None):
            problems.append(f"{tid} {vals}: app {'gave no result' if app is None else 'gave a result'}, reference {'none' if exp is None else 'computed'}")
            continue
        if app is None:
            continue
        compared += 1
        appkeys = {}
        for r in app:
            appkeys.setdefault((r['label'], r['unit']), []).append(r['value'])
        for key in set(appkeys) | set(exp):
            if key not in exp:
                problems.append(f"{tid}: row {key} not checked by reference")
                continue
            if key not in appkeys:
                problems.append(f"{tid}: reference row {key} missing in app")
                continue
            for got in appkeys[key]:
                rows += 1
                covered.add((tid, key))
                want = exp[key]
                tol = TOL.get((tid, key[0]), 1e-6)
                if isinstance(want, str) or isinstance(got, str):
                    if str(got) == str(want):
                        continue
                    g, w = num_in(str(got)), num_in(str(want))
                    if g and len(g) == len(w) and all(abs(x - y) <= max(1e-9, abs(y) * 1e-6) for x, y in zip(g, w)) and re.sub(r'[\d.,\-]', '', str(got)) == re.sub(r'[\d.,\-]', '', str(want)):
                        continue
                    problems.append(f"{tid} {key[0]}: app '{got}' vs reference '{want}'  inputs={vals}")
                else:
                    if not (math.isfinite(got) and abs(got - want) <= abs(want) * tol + 1e-9):
                        problems.append(f"{tid} {key[0]} [{key[1]}]: app {got} vs reference {want}  inputs={vals}")
    tools = {c['id'] for c in cases}
    print(f"{len(tools)} tools, {len(cases)} cases, {compared} with results, {rows} result lines compared, {len(covered)} distinct result lines")
    seen = set()
    for p in problems:
        if p not in seen:
            print('MISMATCH', p)
            seen.add(p)
    print('OK: app and independent reference agree on every case' if not problems else f'{len(seen)} problems')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))

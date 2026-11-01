# Toolbox verification

Every calculator in the app was rechecked in three independent ways. Run them yourself:

```bash
npm test          # 1,403 checks: formulas, published handbook values, every tool and option
npm run crosscheck   # app vs an independent Python implementation, 518 input cases
```

## How it was checked

1. **Formula review.** Each equation was compared line by line with the standard reference in the table below, including unit conversions (kN ↔ N, cm⁴ ↔ mm⁴, GPa ↔ N/mm², m³/h ↔ m³/s).
2. **Independent re-implementation.** `tests/crosscheck/reference.py` re-derives all 47 tools in Python from textbook formulas. It deliberately uses different methods where possible: Colebrook instead of Swamee–Jain, parallel-axis theorem for I-beams, quadrant method for bearings, d²/162.2 for rebar, `asin` instead of `atan2`. Each tool runs with its defaults, every select option, and inputs scaled ×0.55, ×1.37 and ×2.4. **Result: all 1,927 result lines agree**, and both sides agree on which inputs are invalid.
3. **Published values.** Results are compared with numbers printed in handbooks and standards (see "Anchors").
4. **Scientific calculator.** 33 expressions compared with Python's `math` library (precedence, right-associative powers, −2² = −4, implicit multiplication, factorial, hyperbolic functions, scientific notation). Invalid input (`2..3`, `(-3)!`) is rejected.

## Corrections made during the recheck

| Tool | Issue | Fix |
|---|---|---|
| Voltage drop & cable size | Cable reactance was ignored. That is fine for small cables but underestimates the drop by up to ~50% on 240 mm² and above. | ΔV = k·I·L·(R cosφ + X sinφ) with X = 0.08 Ω/km (IEC 60364 method). |
| Beam | Cantilevers were graded with span limits L/360 and L/250. | Cantilevers now use L/180 and L/125. |
| Solar PV | Battery size ignored inverter losses. | Divides by 90% inverter efficiency (label says so). |
| Motor current | Star-delta upper value used 2.33 instead of 7/3, so it could read 1 A low. | Uses exactly ⅓ of 7 × FLC. |
| Calculator | 200 + 10% gave 200.1. | Now 220, like phone and desk calculators. 200 × 10% is still 20. |
| Column buckling | The note did not say K is theoretical. | Note added: codes use 0.65–0.8 for fixed ends. |

## Formulas and sources

| Tool | Formula | Source |
|---|---|---|
| Concrete | dry = 1.54·V; cement = dry·c/(c+s+g)·1440 kg/m³ | Nominal-mix method (IS 456 practice) |
| Rebar | kg/m = π/4·d²·7850 = d²/162.2 | BS 4449 / ASTM A615 tables |
| Power & current | I = P/(√3·V·cosφ) | IEC 60038 three-phase relations |
| Voltage drop | ΔV = √3·I·L·(R cosφ + X sinφ), ρ_Cu 0.0225, ρ_Al 0.036 Ω·mm²/m | IEC 60364-5-52 Annex G |
| Pipe pressure drop | Darcy–Weisbach, Swamee–Jain friction factor | Moody chart, Colebrook (within 2%) |
| Pump | P = ρ·g·Q·H/η | Hydraulic Institute |
| Beam | wL²/8, 5wL⁴/384EI, wL²/2, wL⁴/8EI, wL²/12, wL⁴/384EI, PL/4, PL³/48EI, PL, PL³/3EI, PL/8, PL³/192EI | Roark / steel handbook beam tables |
| Euler buckling | Pcr = π²EI/(KL)², K = 1, 0.7, 0.5, 2 | Timoshenko |
| Section properties | bh³/12, πd⁴/64, hollow and I-sections by subtraction | Standard mechanics |
| Rebar spacing | s = 1000·(πd²/4)/As, rounded down to 25 mm | Detailing practice |
| Blocks & bricks | units/m² = 1/((L+j)(H+j)) | Quantity surveying practice |
| Plaster | dry factor 1.33 | Quantity surveying practice |
| Ohm's law, resistors | V = IR, P = VI, 1/R = Σ1/Rᵢ | — |
| PF correction | Q = P(tanφ₁ − tanφ₂); C = Q/(3·2πf·V²) delta | Capacitor multiplier tables |
| Transformer fault | Isc = S/(√3·V·Z%) | IEC 60909 (infinite source) |
| Lighting | N = E·A/(Φ·UF·MF) | CIBSE lumen method |
| Duct | Huebscher De = 1.30(ab)^0.625/(a+b)^0.25 | ASHRAE Fundamentals |
| Heat | Q = ρ·cp·V̇·ΔT (water 998 × 4.186; air 1.2 × 1.006) | ASHRAE |
| Bolt torque | T = K·F·d; F = % × proof stress × As | ISO 898-1, VDI 2230 |
| Thermal expansion | ΔL = α·L·ΔT; σ = E·α·ΔT | Material data |
| Ideal gas | PV = nRT, R = 8.314462618 | CODATA |
| Bearing | θ = atan2(ΔE, ΔN) | Surveying |
| Stairs | 2R + G = 630 mm | Blondel rule |

## Anchors: published values the app reproduces

| Check | Expected | Source |
|---|---|---|
| Equivalent round duct, 300 × 600 mm | 457 mm | ASHRAE duct table |
| kVAr multiplier, pf 0.75 → 0.95 | 0.553 | Capacitor manufacturers' tables |
| Air density, 15 °C, 1 atm | 1.225 kg/m³ | ISA |
| Friction factor, Re 10⁵, ε/D 0.001 | 0.0222 | Moody chart |
| Cement for 1 m³ of 1:2:4 | 6.34 bags | Nominal-mix tables |
| Rebar Ø16 / Ø25 | 1.58 / 3.85 kg/m | BS 4449 |
| Fault level, 630 kVA, 400 V, 6% | 15.2 kA | Transformer data sheets |
| 1 TR | 12,000 BTU/h | Definition |
| IPE 100–600 area and Iy | within 6% of the sharp-corner formula (root radii) | EN 10365 |
| IPE kg/m | = A × 0.785 | EN 10365 |
| Concrete fcm | = fck + 8 | EN 1992-1-1 |
| AWG 10 / 4/0 | 5.26 / 107.2 mm² | ASTM B258 |

All results remain estimates. The app reminds users to check them against the applicable code and a licensed engineer.

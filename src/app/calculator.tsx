import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackHeader } from '../components/BackHeader';
import { BlueprintGrid, Row, haptic } from '../components/ui';
import { column, fonts, radius, space, useColors, makeStyles } from '../theme';
import { useApp } from '../lib/store';
import { evaluate, formatResult, type AngleMode } from '../tools/expr';

const KEY = 'poe.calc.v1';

type K = { label: string; insert?: string; kind?: 'num' | 'op' | 'fn' | 'eq' | 'ac' | 'del' | 'mode'; wide?: boolean };
const ROWS: K[][] = [
  [{ label: 'DEG', kind: 'mode' }, { label: '(', kind: 'op' }, { label: ')', kind: 'op' }, { label: '%', kind: 'op' }, { label: 'AC', kind: 'ac' }],
  [{ label: 'sin', insert: 'sin(', kind: 'fn' }, { label: 'cos', insert: 'cos(', kind: 'fn' }, { label: 'tan', insert: 'tan(', kind: 'fn' }, { label: 'xʸ', insert: '^', kind: 'op' }, { label: '⌫', kind: 'del' }],
  [{ label: 'sin⁻¹', insert: 'asin(', kind: 'fn' }, { label: 'cos⁻¹', insert: 'acos(', kind: 'fn' }, { label: 'tan⁻¹', insert: 'atan(', kind: 'fn' }, { label: '√', insert: '√(', kind: 'fn' }, { label: '÷', kind: 'op' }],
  [{ label: 'ln', insert: 'ln(', kind: 'fn' }, { label: '7', kind: 'num' }, { label: '8', kind: 'num' }, { label: '9', kind: 'num' }, { label: '×', kind: 'op' }],
  [{ label: 'log', insert: 'log(', kind: 'fn' }, { label: '4', kind: 'num' }, { label: '5', kind: 'num' }, { label: '6', kind: 'num' }, { label: '−', kind: 'op' }],
  [{ label: 'x²', insert: '²', kind: 'fn' }, { label: '1', kind: 'num' }, { label: '2', kind: 'num' }, { label: '3', kind: 'num' }, { label: '+', kind: 'op' }],
  [{ label: 'π', kind: 'fn' }, { label: 'Ans', kind: 'fn' }, { label: '0', kind: 'num' }, { label: '.', kind: 'num' }, { label: '=', kind: 'eq' }],
];
const EXTRA: K[] = [
  { label: 'e', kind: 'fn' },
  { label: 'x!', insert: '!', kind: 'fn' },
  { label: 'EE', insert: 'e', kind: 'fn' },
  { label: '∛', insert: '∛(', kind: 'fn' },
  { label: '|x|', insert: 'abs(', kind: 'fn' },
  { label: 'eˣ', insert: 'exp(', kind: 'fn' },
  { label: 'sinh', insert: 'sinh(', kind: 'fn' },
  { label: 'cosh', insert: 'cosh(', kind: 'fn' },
  { label: 'tanh', insert: 'tanh(', kind: 'fn' },
  { label: 'g', kind: 'fn' },
];

export default function CalculatorScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { tr } = useApp();
  const insets = useSafeAreaInsets();
  const [expr, setExpr] = useState('');
  const [mode, setMode] = useState<AngleMode>('deg');
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<{ e: string; r: string }[]>([]);
  const [copied, setCopied] = useState(false);
  // true right after '=': a digit or function then starts a new expression, an operator continues from the result
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw);
        setMode(s.mode ?? 'deg');
        setAns(s.ans ?? 0);
        setHistory(s.history ?? []);
      })
      .catch(() => {});
  }, []);

  const save = (next: { mode?: AngleMode; ans?: number; history?: { e: string; r: string }[] }) =>
    AsyncStorage.setItem(KEY, JSON.stringify({ mode, ans, history, ...next })).catch(() => {});

  // live preview while typing
  const preview = useMemo(() => {
    if (!expr.trim()) return '';
    try {
      return formatResult(evaluate(expr, mode, ans));
    } catch {
      return '';
    }
  }, [expr, mode, ans]);

  const press = (k: K) => {
    haptic.select();
    const wasFresh = fresh;
    setFresh(false);
    if (k.kind === 'ac') return setExpr('');
    if (k.kind === 'del') return setExpr((e) => e.slice(0, -1));
    if (k.kind === 'mode') {
      const m = mode === 'deg' ? 'rad' : 'deg';
      setMode(m);
      save({ mode: m });
      return;
    }
    if (k.kind === 'eq') {
      if (!expr.trim()) return;
      let r: number;
      try {
        r = evaluate(expr, mode, ans);
      } catch {
        haptic.error();
        setHistory((h) => [{ e: expr, r: 'Error' }, ...h].slice(0, 30));
        return;
      }
      const text = formatResult(r);
      const h = [{ e: expr, r: text }, ...history].slice(0, 30);
      setHistory(h);
      if (Number.isFinite(r)) {
        setAns(r);
        save({ ans: r, history: h });
        setExpr(text.replace('−', '-'));
        setFresh(true);
      } else {
        save({ history: h });
      }
      return;
    }
    const add = k.insert ?? k.label;
    const continues = k.kind === 'op' && add !== '(' ;
    const postfixFn = add === '!' || add === '²' || add === '%';
    setExpr((e) => (wasFresh && !continues && !postfixFn ? add : e + add));
  };

  const copy = async () => {
    const value = preview || expr;
    if (!value) return;
    await Clipboard.setStringAsync(value).catch(() => {});
    haptic.light();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const keyStyle = (k: K) => [styles.key, k.kind === 'num' && styles.keyNum, k.kind === 'op' && styles.keyOp, k.kind === 'eq' && styles.keyEq, k.kind === 'ac' && styles.keyAc];
  const keyText = (k: K) => [styles.keyText, k.kind === 'fn' && styles.keyFnText, k.kind === 'eq' && { color: colors.onAccent }, k.kind === 'ac' && { color: colors.bad }, k.kind === 'op' && { color: colors.accent }];

  return (
    <View style={styles.fill}>
      <BlueprintGrid />
      <View style={[{ flex: 1, paddingTop: insets.top + space.md, paddingHorizontal: space.md, paddingBottom: insets.bottom + space.md }, column]}>
        <BackHeader title={tr({ en: 'Scientific calculator', ar: 'الآلة الحاسبة العلمية' })} />

        {/* Display */}
        <View style={styles.display}>
          <Row style={{ justifyContent: 'space-between', flexDirection: 'row' }}>
            <View style={styles.modeTag}>
              <Text style={styles.modeText}>{mode.toUpperCase()}</Text>
            </View>
            <Pressable onPress={copy} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr({ en: 'Copy', ar: 'نسخ' })}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? colors.good : colors.textMuted} />
            </Pressable>
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <Text selectable style={styles.expr} accessibilityLabel="Expression">
              {expr || ' '}
            </Text>
          </ScrollView>
          <Text style={styles.preview} numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite">
            {preview && !(fresh && preview === expr.replace('-', '−')) ? `= ${preview}` : ' '}
          </Text>
        </View>

        {/* History */}
        <ScrollView style={{ maxHeight: 74, marginTop: 6, flexGrow: 0 }} showsVerticalScrollIndicator={false}>
          {history.slice(0, 6).map((h, i) => (
            <Pressable key={i} onPress={() => setExpr(h.r === 'Error' ? h.e : h.r)} accessibilityRole="button">
              <Text numberOfLines={1} style={styles.hist}>
                {h.e} = <Text style={{ color: colors.text }}>{h.r}</Text>
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Extra functions */}
        <ScrollView horizontal style={{ flexGrow: 0, flexShrink: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          {EXTRA.map((k) => (
            <Pressable key={k.label} onPress={() => press(k)} style={styles.extra} accessibilityRole="button" accessibilityLabel={k.label}>
              <Text style={styles.keyFnText}>{k.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Keypad: always left-to-right, like any calculator */}
        <View style={{ flex: 1, gap: 6 }}>
          {ROWS.map((row, ri) => (
            <View key={ri} style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
              {row.map((k) => (
                <Pressable
                  key={k.label}
                  onPress={() => press(k)}
                  style={({ pressed }) => [keyStyle(k), pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={k.label === 'DEG' ? mode.toUpperCase() : k.label}
                >
                  <Text style={keyText(k)}>{k.kind === 'mode' ? (mode === 'deg' ? 'DEG' : 'RAD') : k.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { flex: 1, backgroundColor: colors.bg },
  display: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, backgroundColor: colors.display, padding: space.md, minHeight: 130 },
  modeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.cyanSoft },
  modeText: { fontFamily: fonts.monoSemi, fontSize: 11, color: colors.cyan },
  expr: { fontFamily: fonts.mono, fontSize: 26, lineHeight: 36, color: colors.text, textAlign: 'right', marginTop: space.sm },
  preview: { fontFamily: fonts.monoSemi, fontSize: 30, lineHeight: 40, color: colors.accent, textAlign: 'right' },
  hist: { fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'right' },
  extra: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  key: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, minHeight: 44 },
  keyNum: { backgroundColor: colors.surfaceRaised },
  keyOp: { backgroundColor: colors.accentTint },
  keyEq: { backgroundColor: colors.accent, borderColor: colors.accent },
  keyAc: { backgroundColor: colors.badSoft },
  keyText: { fontFamily: fonts.monoSemi, fontSize: 20, color: colors.text },
  keyFnText: { fontFamily: fonts.mono, fontSize: 14.5, color: colors.cyan },
}));

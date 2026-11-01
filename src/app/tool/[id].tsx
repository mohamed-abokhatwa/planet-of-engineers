import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { NumberField } from '../../components/NumberField';
import { Card, Chip, Row, Screen, Txt, haptic } from '../../components/ui';
import { fonts, space, useColors, makeStyles } from '../../theme';
import { useApp } from '../../lib/store';
import { fmtNum } from '../../lib/format';
import { findTool } from '../../tools/defs';
import { clearInputs, loadInputs, saveInputs, toggleFavourite, useFavourites } from '../../lib/toolPrefs';

export default function ToolScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = findTool(String(id));
  const { t, tr, rtl } = useApp();
  const defaults = useMemo(() => Object.fromEntries((tool?.inputs ?? []).map((i) => [i.key, i.default])) as Record<string, number | string>, [tool]);
  const [vals, setVals] = useState<Record<string, number | string>>(defaults);
  // Bumped when values are replaced from outside (restore, reset) so the text fields re-read them.
  const [gen, setGen] = useState(0);
  const [copied, setCopied] = useState(false);
  const favs = useFavourites();
  const fav = !!tool && favs.includes(tool.id);

  // Restore the last inputs used on this device.
  useEffect(() => {
    if (!tool) return;
    let alive = true;
    loadInputs(tool.id).then((saved) => {
      if (!alive || !saved) return;
      // keep only keys the tool still has, and select values that are still valid
      const next = { ...defaults };
      for (const inp of tool.inputs) {
        const x = saved[inp.key];
        if (x === undefined) continue;
        if (inp.kind === 'select' ? inp.options.some((o) => o.value === x) : typeof x === 'number') next[inp.key] = x;
      }
      setVals(next);
      setGen((g) => g + 1);
    });
    return () => {
      alive = false;
    };
  }, [tool, defaults]);

  const update = (key: string, value: number | string) =>
    setVals((v) => {
      const next = { ...v, [key]: value };
      if (tool) saveInputs(tool.id, next);
      return next;
    });

  const reset = () => {
    if (!tool) return;
    haptic.select();
    clearInputs(tool.id);
    setVals(defaults);
    setGen((g) => g + 1);
  };
  const result = useMemo(() => {
    try {
      return tool?.compute(vals) ?? null;
    } catch {
      return null;
    }
  }, [tool, vals]);

  if (!tool) return <Screen><BackHeader /></Screen>;

  const show = (v: string | number | { en: string; ar: string } | undefined, digits?: number) =>
    v === undefined ? '' : typeof v === 'number' ? fmtNum(v, digits ?? 2) : typeof v === 'string' ? v : tr(v);

  const summary = () => {
    if (!result) return '';
    const inputs = tool.inputs
      .filter((inp) => !inp.showIf || inp.showIf(vals))
      .map((inp) => {
        const x = vals[inp.key];
        const shown = inp.kind === 'select' ? tr(inp.options.find((o) => o.value === x)?.label ?? { en: String(x), ar: String(x) }) : Number.isFinite(Number(x)) ? `${x}${inp.unit ? ` ${inp.unit}` : ''}` : '—';
        return `  ${tr(inp.label)}: ${shown}`;
      });
    const rows = result.rows.map((r) => `  ${tr(r.label)}: ${show(r.value, r.digits)}${r.unit ? ` ${show(r.unit)}` : ''}`);
    return [tr(tool.title), `${t('inputs')}:`, ...inputs, `${t('results')}:`, ...rows, '', t('verifyNote'), '— Planet of Engineers'].join('\n');
  };
  const copy = async () => {
    const text = summary();
    if (!text) return;
    await Clipboard.setStringAsync(text).catch(() => {});
    haptic.light();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const share = () => {
    const text = summary();
    if (text) Share.share({ message: text }).catch(() => {});
  };

  return (
    <Screen>
      <BackHeader
        title={tr(tool.title)}
        right={
          <Pressable
            onPress={() => {
              haptic.select();
              toggleFavourite(tool.id);
            }}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityState={{ selected: fav }}
            accessibilityLabel={tr(fav ? { en: 'Remove from favourites', ar: 'إزالة من المفضلة' } : { en: 'Add to favourites', ar: 'إضافة إلى المفضلة' })}
          >
            <Ionicons name={fav ? 'star' : 'star-outline'} size={19} color={fav ? colors.accent : colors.textMuted} />
          </Pressable>
        }
      />
      <Txt v="small" style={{ marginBottom: space.md }}>
        {tr(tool.desc)}
      </Txt>

      {/* Results first, so they stay visible above the keyboard while typing */}
      <Card accent>
        <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
          <Txt v="label" color={colors.accent}>
            {t('results')}
          </Txt>
          {result ? (
            <Row gap={14}>
              <Pressable onPress={copy} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr({ en: 'Copy results', ar: 'نسخ النتائج' })}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={copied ? colors.good : colors.textMuted} />
              </Pressable>
              <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr({ en: 'Share results', ar: 'مشاركة النتائج' })}>
                <Ionicons name="share-outline" size={17} color={colors.textMuted} />
              </Pressable>
            </Row>
          ) : null}
        </Row>
        {result ? (
          result.rows.map((r, i) => {
            const toneColor = r.tone === 'good' ? colors.good : r.tone === 'bad' ? colors.bad : r.tone === 'warn' ? colors.warn : r.highlight ? colors.text : colors.textMuted;
            return (
              <Row key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Txt v="small" style={{ flex: 1, color: r.highlight ? colors.text : colors.textMuted }}>
                  {tr(r.label)}
                </Txt>
                <Txt style={{ fontFamily: r.highlight ? fonts.monoSemi : fonts.mono, fontSize: r.highlight ? 17 : 14.5, color: toneColor, writingDirection: 'ltr' }}>
                  {show(r.value, r.digits)}
                  {r.unit ? <Txt v="mono" style={{ color: colors.cyan, fontSize: 12.5 }}> {show(r.unit)}</Txt> : null}
                </Txt>
              </Row>
            );
          })
        ) : (
          <Txt v="small">—</Txt>
        )}
        {result?.note ? (
          <Row gap={8} style={{ marginTop: space.md, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Txt v="small" style={{ flex: 1, fontSize: 12 }}>
              {tr(result.note)}
            </Txt>
          </Row>
        ) : null}
      </Card>

      <Row style={{ marginTop: space.lg, marginBottom: space.md, justifyContent: 'space-between' }}>
        <Txt v="label">{t('inputs')}</Txt>
        <Pressable onPress={reset} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr({ en: 'Reset inputs', ar: 'إعادة ضبط المدخلات' })}>
          <Row gap={4}>
            <Ionicons name="refresh" size={14} color={colors.textMuted} />
            <Txt v="small" style={{ fontSize: 12 }}>
              {tr({ en: 'Reset', ar: 'إعادة ضبط' })}
            </Txt>
          </Row>
        </Pressable>
      </Row>
      {tool.inputs
        .filter((inp) => !inp.showIf || inp.showIf(vals))
        .map((inp) =>
          inp.kind === 'number' ? (
            <NumberField key={`${inp.key}-${gen}`} label={tr(inp.label)} unit={inp.unit} value={Number(vals[inp.key])} onChange={(n) => update(inp.key, n)} />
          ) : (
            <View key={inp.key} style={{ marginBottom: space.md }}>
              <Txt v="small" style={{ marginBottom: 6, color: colors.text }}>
                {tr(inp.label)}
              </Txt>
              <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                {inp.options.map((o) => (
                  <Chip key={o.value} small label={tr(o.label)} active={vals[inp.key] === o.value} onPress={() => update(inp.key, o.value)} />
                ))}
              </View>
            </View>
          ),
        )}

      <Txt v="small" center style={{ marginTop: space.md, fontSize: 11.5, color: colors.textFaint }}>
        {t('verifyNote')}
      </Txt>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { paddingVertical: 8, justifyContent: 'space-between' },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  wrap: { flexWrap: 'wrap', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
}));

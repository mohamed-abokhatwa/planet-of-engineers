import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { NumberField } from '../../components/NumberField';
import { Card, Chip, Row, Screen, Txt } from '../../components/ui';
import { colors, fonts, space } from '../../theme';
import { useApp } from '../../lib/store';
import { fmtNum } from '../../lib/format';
import { findTool } from '../../tools/defs';

export default function ToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tool = findTool(String(id));
  const { t, tr, rtl } = useApp();
  const [vals, setVals] = useState<Record<string, number | string>>(() => Object.fromEntries((tool?.inputs ?? []).map((i) => [i.key, i.default])));
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

  return (
    <Screen>
      <BackHeader title={tr(tool.title)} />
      <Txt v="small" style={{ marginBottom: space.md }}>
        {tr(tool.desc)}
      </Txt>

      {/* Results first, so they stay visible above the keyboard while typing */}
      <Card accent>
        <Txt v="label" color={colors.accent} style={{ marginBottom: space.sm }}>
          {t('results')}
        </Txt>
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

      <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.md }}>
        {t('inputs')}
      </Txt>
      {tool.inputs
        .filter((inp) => !inp.showIf || inp.showIf(vals))
        .map((inp) =>
          inp.kind === 'number' ? (
            <NumberField key={inp.key} label={tr(inp.label)} unit={inp.unit} value={Number(vals[inp.key])} onChange={(n) => setVals((v) => ({ ...v, [inp.key]: n }))} />
          ) : (
            <View key={inp.key} style={{ marginBottom: space.md }}>
              <Txt v="small" style={{ marginBottom: 6, color: colors.text }}>
                {tr(inp.label)}
              </Txt>
              <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                {inp.options.map((o) => (
                  <Chip key={o.value} small label={tr(o.label)} active={vals[inp.key] === o.value} onPress={() => setVals((v) => ({ ...v, [inp.key]: o.value }))} />
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

const styles = StyleSheet.create({
  row: { paddingVertical: 8, justifyContent: 'space-between' },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  wrap: { flexWrap: 'wrap', gap: 8 },
});

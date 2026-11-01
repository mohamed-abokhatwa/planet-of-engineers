import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { NumberField } from '../components/NumberField';
import { Card, Chip, Row, Screen, Txt, haptic } from '../components/ui';
import { colors, fonts, radius, space } from '../theme';
import { useApp } from '../lib/store';
import { fmtNum } from '../lib/format';
import { UNIT_CATEGORIES, convert } from '../tools/calc';

const CAT_LABEL: Record<string, { en: string; ar: string }> = {
  length: { en: 'Length', ar: 'الطول' },
  area: { en: 'Area', ar: 'المساحة' },
  volume: { en: 'Volume', ar: 'الحجم' },
  mass: { en: 'Mass', ar: 'الكتلة' },
  force: { en: 'Force', ar: 'القوة' },
  pressure: { en: 'Pressure / stress', ar: 'الضغط / الإجهاد' },
  power: { en: 'Power', ar: 'القدرة' },
  energy: { en: 'Energy', ar: 'الطاقة' },
  flow: { en: 'Flow rate', ar: 'معدل السريان' },
  speed: { en: 'Speed', ar: 'السرعة' },
  torque: { en: 'Torque / moment', ar: 'العزم' },
  density: { en: 'Density', ar: 'الكثافة' },
  lineload: { en: 'Line load', ar: 'الحمل الخطي' },
  inertia: { en: 'Moment of inertia', ar: 'عزم القصور' },
  angle: { en: 'Angle', ar: 'الزوايا' },
  illuminance: { en: 'Illuminance', ar: 'شدة الإضاءة' },
  temperature: { en: 'Temperature', ar: 'الحرارة' },
};

export default function ConverterScreen() {
  const { t, tr, rtl } = useApp();
  const [cat, setCat] = useState('pressure');
  const units = UNIT_CATEGORIES.find((c) => c.id === cat)!.units;
  const [from, setFrom] = useState('MPa');
  const [value, setValue] = useState(1);
  const pick = (c: string) => {
    setCat(c);
    setFrom(UNIT_CATEGORIES.find((x) => x.id === c)!.units[0].id);
  };
  const rows = useMemo(() => units.map((u) => ({ u, v: convert(value, cat, from, u.id) })), [units, value, cat, from]);

  return (
    <Screen>
      <BackHeader title={tr({ en: 'Unit converter', ar: 'محوّل الوحدات' })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: rtl ? 'row-reverse' : 'row' }} style={{ marginBottom: space.md }}>
        {UNIT_CATEGORIES.map((c) => (
          <Chip key={c.id} small label={tr(CAT_LABEL[c.id])} active={cat === c.id} onPress={() => pick(c.id)} />
        ))}
      </ScrollView>

      <NumberField key={`${cat}-${from}`} label={t('value')} value={value} unit={units.find((u) => u.id === from)?.label} onChange={setValue} />

      <Txt v="small" style={{ marginBottom: 6, color: colors.text }}>
        {t('from')}
      </Txt>
      <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {units.map((u) => (
          <Chip key={u.id} small label={u.label} active={from === u.id} onPress={() => setFrom(u.id)} />
        ))}
      </View>

      <Card style={{ marginTop: space.lg }}>
        <Txt v="label" style={{ marginBottom: space.sm }}>
          {t('to')}
        </Txt>
        {rows.map(({ u, v }, i) => (
          <Pressable
            key={u.id}
            onPress={() => {
              haptic.select();
              setFrom(u.id);
              setValue(Number(v.toPrecision(10)));
            }}
            style={[styles.row, i > 0 && styles.border, u.id === from && styles.current]}
            accessibilityRole="button"
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="mono" style={{ color: u.id === from ? colors.accent : colors.cyan, fontSize: 13 }}>
                {u.label}
              </Txt>
              <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 16, writingDirection: 'ltr', color: u.id === from ? colors.accent : colors.text }}>{fmtNum(v, 6)}</Txt>
            </Row>
          </Pressable>
        ))}
      </Card>
      <Row gap={6} style={{ marginTop: space.sm, justifyContent: 'center' }}>
        <Ionicons name="hand-left-outline" size={13} color={colors.textFaint} />
        <Txt v="small" style={{ fontSize: 11.5, color: colors.textFaint }}>
          {tr({ en: 'Tap a result to convert from it', ar: 'اضغط على نتيجة للتحويل منها' })}
        </Txt>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexWrap: 'wrap', gap: 8 },
  row: { paddingVertical: 11, paddingHorizontal: 8, borderRadius: radius.sm },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  current: { backgroundColor: colors.accentSoft },
});

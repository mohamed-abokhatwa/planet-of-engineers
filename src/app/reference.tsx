import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { Card, Chip, Screen, Txt } from '../components/ui';
import { colors, fonts, space } from '../theme';
import { useApp } from '../lib/store';
import { fmtNum } from '../lib/format';
import { AWG, BOLTS, CONCRETE, DENSITIES, IPE, PIPES, REBAR_SIZES, pipeId, rebarRow, unitWeight } from '../tools/tables';

type T = { en: string; ar: string };
type Table = { id: string; title: T; note: T; head: T[]; widths: number[]; rows: (string | number)[][] };

const t = (en: string, ar: string): T => ({ en, ar });
const f = (x: number, d: number) => fmtNum(x, d);

const TABLES: Table[] = [
  {
    id: 'rebar',
    title: t('Rebar', 'حديد التسليح'),
    note: t('Steel 7850 kg/m³. Area per metre width for bars at 100, 150 and 200 mm.', 'كثافة الحديد 7850 كجم/م³. المساحة لكل متر عرض لأسياخ على 100 و150 و200 مم.'),
    head: [t('Ø mm', 'Ø مم'), t('Area mm²', 'المساحة مم²'), t('kg/m', 'كجم/م'), t('@100 mm²/m', '@100 مم²/م'), t('@150', '@150'), t('@200', '@200')],
    widths: [52, 78, 66, 92, 66, 66],
    rows: REBAR_SIZES.map((d) => {
      const r = rebarRow(d);
      return [d, f(r.area, 1), f(r.kgPerM, 3), f(r.at100, 0), f(r.at150, 0), f(r.at200, 0)];
    }),
  },
  {
    id: 'ipe',
    title: t('IPE beams', 'قطاعات IPE'),
    note: t('EN 10365. Iy and Wy about the strong axis.', 'حسب EN 10365. Iy و Wy حول المحور القوي.'),
    head: [t('Section', 'القطاع'), t('h', 'h'), t('b', 'b'), t('tw', 'tw'), t('tf', 'tf'), t('A cm²', 'A سم²'), t('Iy cm⁴', 'Iy سم⁴'), t('Wy cm³', 'Wy سم³'), t('kg/m', 'كجم/م')],
    widths: [72, 44, 44, 44, 44, 60, 70, 64, 56],
    rows: IPE.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]]),
  },
  {
    id: 'concrete',
    title: t('Concrete grades', 'رتب الخرسانة'),
    note: t('EN 1992-1-1 Table 3.1. MPa except Ecm in GPa.', 'حسب EN 1992-1-1 جدول 3.1. بالميجاباسكال عدا Ecm بالجيجاباسكال.'),
    head: [t('Class', 'الرتبة'), t('fck', 'fck'), t('fck,cube', 'fck,cube'), t('fcm', 'fcm'), t('fctm', 'fctm'), t('Ecm', 'Ecm')],
    widths: [72, 48, 72, 48, 52, 48],
    rows: CONCRETE.map((r) => [...r]),
  },
  {
    id: 'bolts',
    title: t('Metric bolts', 'المسامير المترية'),
    note: t('Coarse thread. Proof load for class 8.8 (ISO 898-1). Spanner per ISO 4032.', 'سن خشن. حمل الإثبات للرتبة 8.8 (ISO 898-1). المفتاح حسب ISO 4032.'),
    head: [t('Size', 'المقاس'), t('Pitch', 'الخطوة'), t('As mm²', 'As مم²'), t('Spanner', 'المفتاح'), t('8.8 proof kN', 'إثبات 8.8 كن')],
    widths: [52, 56, 70, 70, 92],
    rows: BOLTS.map((b) => [b[0], b[2], b[3], b[4], f(((b[1] <= 16 ? 580 : 600) * b[3]) / 1000, 1)]),
  },
  {
    id: 'pipes',
    title: t('Steel pipes Sch 40', 'مواسير حديد Sch 40'),
    note: t('ASME B36.10. Dimensions in mm.', 'حسب ASME B36.10. الأبعاد بالمليمتر.'),
    head: [t('DN', 'DN'), t('NPS', 'NPS'), t('OD', 'OD'), t('Wall', 'السمك'), t('ID', 'ID'), t('kg/m', 'كجم/م')],
    widths: [48, 52, 58, 52, 58, 56],
    rows: PIPES.map((p) => [p[0], p[1], p[2], p[3], f(pipeId(p), 1), f(Math.PI * (p[2] - p[3]) * p[3] * 7850 / 1e6, 2)]),
  },
  {
    id: 'awg',
    title: t('Wire gauge AWG', 'مقاسات الأسلاك AWG'),
    note: t('Solid conductor. Nearest metric sizes: 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95 mm².', 'موصل مصمت. أقرب مقاسات مترية: 1.5، 2.5، 4، 6، 10، 16، 25، 35، 50، 70، 95 مم².'),
    head: [t('AWG', 'AWG'), t('Ø mm', 'Ø مم'), t('Area mm²', 'المساحة مم²')],
    widths: [64, 72, 92],
    rows: AWG.map((a) => [a.gauge, f(a.d, 3), f(a.area, a.area < 1 ? 3 : 2)]),
  },
  {
    id: 'density',
    title: t('Densities', 'الكثافات'),
    note: t('Typical values; check the actual material.', 'قيم معتادة؛ راجع المادة الفعلية.'),
    head: [t('Material', 'المادة'), t('kg/m³', 'كجم/م³'), t('kN/m³', 'كن/م³')],
    widths: [170, 72, 72],
    rows: [],
  },
];

export default function ReferenceScreen() {
  const { tr, rtl } = useApp();
  const ar = rtl ? { fontFamily: fonts.arabicMedium } : null;
  const [id, setId] = useState('rebar');
  const table = TABLES.find((x) => x.id === id)!;
  const rows = id === 'density' ? DENSITIES.map(([name, rho]) => [tr(name), rho, f(unitWeight(rho), 1)]) : table.rows;

  return (
    <Screen>
      <BackHeader title={tr({ en: 'Reference tables', ar: 'الجداول المرجعية' })} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space.md }}>
        {TABLES.map((x) => (
          <Chip key={x.id} small label={tr(x.title)} active={x.id === id} onPress={() => setId(x.id)} />
        ))}
      </ScrollView>

      <Card style={{ paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }}>
        {/* Tables read left to right in both languages, like the printed standards */}
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flexGrow: 1 }}>
            <View style={[styles.tr, styles.head]}>
              {table.head.map((h, i) => (
                <Text key={i} style={[styles.th, ar, { width: table.widths[i] }]} numberOfLines={2}>
                  {tr(h)}
                </Text>
              ))}
            </View>
            {rows.map((r, ri) => (
              <View key={ri} style={[styles.tr, ri % 2 === 1 && styles.zebra]}>
                {r.map((c, ci) => (
                  <Text key={ci} style={[styles.td, ci === 0 && styles.first, id === 'density' && ci === 0 && (ar ?? { fontFamily: fonts.sansMedium }), { width: table.widths[ci] }]} numberOfLines={1}>
                    {String(c)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>
      <Txt v="small" style={{ marginTop: space.md, fontSize: 12 }}>
        {tr(table.note)}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tr: { flexDirection: 'row', paddingHorizontal: 10, alignItems: 'center' },
  head: { backgroundColor: 'rgba(255,122,26,0.10)', borderBottomWidth: 1, borderBottomColor: colors.lineStrong, paddingVertical: 8 },
  zebra: { backgroundColor: 'rgba(255,255,255,0.025)' },
  th: { fontFamily: fonts.monoSemi, fontSize: 11.5, color: colors.accent, paddingHorizontal: 4 },
  td: { fontFamily: fonts.mono, fontSize: 13, color: colors.text, paddingHorizontal: 4, paddingVertical: 8 },
  first: { fontFamily: fonts.monoSemi, color: colors.cyan },
});

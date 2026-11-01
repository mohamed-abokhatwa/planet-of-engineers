import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Loader, Row, Screen, Txt } from '../../components/ui';
import { CountrySheet, SelectField, SheetList } from '../../components/Pickers';
import { Sheet } from '../../components/Sheet';
import { colors, fonts, radius, space } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { countryName, flag } from '../../lib/countries';
import { fmtMoney } from '../../lib/format';
import { MIN_SALARY_COUNT } from '../../data/api';
import { DISCIPLINES, type Discipline } from '../../lib/types';

export default function SalaryScreen() {
  const { t, locale, disc, prefs, rtl } = useApp();
  const [country, setCountry] = useState(prefs.profile.country);
  const [discipline, setDiscipline] = useState<Discipline>(prefs.profile.discipline);
  const [countryOpen, setCountryOpen] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const stats = useLoad((a) => a.salaryStats(country, discipline), `${country}|${discipline}`);
  const mine = useLoad((a) => a.mySalary());

  const s = stats.data;
  const visible = s?.bands.filter((b) => b.median != null) ?? [];
  const max = Math.max(1, ...visible.map((b) => b.p75 ?? 0));

  return (
    <Screen>
      <Txt v="label">{t('tabSalary')}</Txt>
      <Txt v="title" style={{ marginTop: 4 }}>
        {t('salaryTitle')}
      </Txt>
      <Txt v="small" style={{ marginTop: 4 }}>
        {t('salarySub')}
      </Txt>

      <Row gap={space.sm} style={{ marginTop: space.md }}>
        <View style={{ flex: 1 }}>
          <SelectField label={t('pickCountry')} value={`${flag(country)} ${countryName(country, locale)}`} onPress={() => setCountryOpen(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <SelectField label={t('pickDiscipline')} value={disc(discipline)} onPress={() => setDiscOpen(true)} />
        </View>
      </Row>

      <Card style={{ marginTop: space.md }}>
        {stats.loading && !s ? (
          <Loader />
        ) : s ? (
          <>
            <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
              <Txt v="label">{t('years')}</Txt>
              <Txt v="mono" style={{ fontSize: 11.5 }}>
                {s.currency} · {t('basedOn', { n: s.total })}
              </Txt>
            </Row>
            {s.bands.map((b, i) => (
              <View key={b.band} style={[styles.band, i > 0 && styles.bandBorder]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 13.5 }}>{t('yearsShort', { band: b.band })}</Txt>
                  {b.median != null ? (
                    <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 15, color: colors.accent, writingDirection: 'ltr' }}>{fmtMoney(b.median, s.currency)}</Txt>
                  ) : (
                    <Row gap={4}>
                      <Ionicons name="lock-closed-outline" size={12} color={colors.textFaint} />
                      <Txt v="small" style={{ fontSize: 11.5, color: colors.textFaint }}>
                        {t('notEnough', { n: b.count })}
                      </Txt>
                    </Row>
                  )}
                </Row>
                {b.median != null && b.p25 != null && b.p75 != null ? (
                  <>
                    {/* range bar: middle 50% with the median marked */}
                    <View style={[styles.track, { transform: rtl ? [{ scaleX: -1 }] : undefined }]}>
                      <View style={[styles.range, { left: `${(b.p25 / max) * 100}%`, width: `${Math.max(2, ((b.p75 - b.p25) / max) * 100)}%` }]} />
                      <View style={[styles.median, { left: `${(b.median / max) * 100}%` }]} />
                    </View>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt v="small" style={{ fontSize: 11 }}>
                        {t('range')}
                      </Txt>
                      <Txt v="mono" style={{ fontSize: 11.5, writingDirection: 'ltr' }}>
                        {fmtMoney(b.p25, null)} – {fmtMoney(b.p75, null)}
                      </Txt>
                    </Row>
                  </>
                ) : null}
              </View>
            ))}
          </>
        ) : null}
      </Card>

      <Card accent style={{ marginTop: space.md }}>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Txt v="heading">{mine.data ? t('yourEntry') : t('shareSalary')}</Txt>
            {mine.data ? (
              <Txt v="mono" style={{ marginTop: 4, writingDirection: 'ltr' }}>
                {flag(mine.data.country)} {disc(mine.data.discipline)} · {mine.data.years}y · {fmtMoney(mine.data.monthlyGross, mine.data.currency)}
              </Txt>
            ) : null}
            <Txt v="small" style={{ marginTop: 4 }}>
              {t('shareSalarySub', { n: MIN_SALARY_COUNT })}
            </Txt>
          </View>
        </Row>
        <Button label={mine.data ? t('updateEntry') : t('shareSalary')} variant={mine.data ? 'outline' : 'solid'} onPress={() => router.push('/salary-share')} style={{ marginTop: space.md }} />
      </Card>

      <CountrySheet visible={countryOpen} onClose={() => setCountryOpen(false)} onPick={setCountry} selected={country} />
      <Sheet visible={discOpen} onClose={() => setDiscOpen(false)} title={t('pickDiscipline')}>
        <SheetList
          items={DISCIPLINES.map((d) => ({ key: d, label: disc(d), active: d === discipline }))}
          onPick={(k) => {
            setDiscipline(k as Discipline);
            setDiscOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { paddingVertical: 12, gap: 8 },
  bandBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  range: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.pill, backgroundColor: 'rgba(92,200,255,0.45)' },
  median: { position: 'absolute', top: -1, width: 3, height: 12, marginLeft: -1.5, backgroundColor: colors.accent },
});

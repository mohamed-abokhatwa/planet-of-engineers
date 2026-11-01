import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { NumberField } from '../components/NumberField';
import { CountrySheet, SelectField, SheetList } from '../components/Pickers';
import { Sheet } from '../components/Sheet';
import { Button, Card, Row, Screen, Txt, haptic } from '../components/ui';
import { colors, radius, space } from '../theme';
import { useApp } from '../lib/store';
import { CURRENCIES, countryName, findCountry, flag } from '../lib/countries';
import { DISCIPLINES, type Discipline } from '../lib/types';

export default function SalaryShareScreen() {
  const { t, api, prefs, locale, disc, touch } = useApp();
  const [country, setCountry] = useState(prefs.profile.country);
  const [discipline, setDiscipline] = useState<Discipline>(prefs.profile.discipline);
  const [years, setYears] = useState(prefs.profile.years);
  const [amount, setAmount] = useState(NaN);
  const [currency, setCurrency] = useState(findCountry(prefs.profile.country).currency);
  const [open, setOpen] = useState<null | 'country' | 'disc' | 'cur'>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.mySalary().then((m) => {
      if (!m) return;
      setCountry(m.country);
      setDiscipline(m.discipline);
      setYears(m.years);
      setAmount(m.monthlyGross);
      setCurrency(m.currency);
    }).catch(() => {});
  }, [api]);

  const submit = async () => {
    setBusy(true);
    const r = await api.submitSalary({ country, discipline, years, monthlyGross: amount, currency }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return haptic.error();
    haptic.success();
    touch();
    setDone(true);
  };

  if (done) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={36} color={colors.bgDeep} />
          </View>
          <Txt v="title" center style={{ marginTop: space.lg }}>
            {t('thanksSalary')}
          </Txt>
          <Button label={t('back')} variant="outline" onPress={() => router.back()} style={{ marginTop: space.xl, alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title={t('shareSalary')} />
      <Card>
        <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
          <Ionicons name="eye-off-outline" size={18} color={colors.cyan} />
          <Txt v="small" style={{ flex: 1 }}>
            {t('shareSalarySub')}
          </Txt>
        </Row>
      </Card>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        <SelectField
          label={t('country')}
          value={`${flag(country)} ${countryName(country, locale)}`}
          onPress={() => setOpen('country')}
        />
        <SelectField label={t('discipline')} value={disc(discipline)} onPress={() => setOpen('disc')} />
        <View>
          <Txt v="small" style={{ marginBottom: 6, color: colors.text }}>
            {t('years')}
          </Txt>
          <Row gap={space.md}>
            <Pressable onPress={() => setYears((y) => Math.max(0, y - 1))} style={styles.stepBtn} accessibilityLabel="−">
              <Ionicons name="remove" size={20} color={colors.text} />
            </Pressable>
            <Txt v="number" style={{ minWidth: 56, textAlign: 'center' }}>
              {years}
            </Txt>
            <Pressable onPress={() => setYears((y) => Math.min(50, y + 1))} style={styles.stepBtn} accessibilityLabel="+">
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </Row>
        </View>
      </View>

      <View style={{ marginTop: space.lg }}>
        <NumberField key={String(Number.isFinite(amount))} label={t('monthlyGross')} value={amount} unit={currency} onChange={setAmount} />
        <SelectField label={t('currency')} value={currency} onPress={() => setOpen('cur')} />
      </View>

      <Button label={t('submit')} onPress={submit} loading={busy} disabled={!(amount > 0)} style={{ marginTop: space.lg }} />

      <CountrySheet
        visible={open === 'country'}
        onClose={() => setOpen(null)}
        onPick={(c) => {
          setCountry(c);
          setCurrency(findCountry(c).currency);
        }}
        selected={country}
      />
      <Sheet visible={open === 'disc'} onClose={() => setOpen(null)} title={t('discipline')}>
        <SheetList items={DISCIPLINES.map((d) => ({ key: d, label: disc(d), active: d === discipline }))} onPick={(k) => { setDiscipline(k as Discipline); setOpen(null); }} />
      </Sheet>
      <Sheet visible={open === 'cur'} onClose={() => setOpen(null)} title={t('currency')} scroll>
        <SheetList items={CURRENCIES.map((c) => ({ key: c, label: c, active: c === currency }))} onPick={(k) => { setCurrency(k); setOpen(null); }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  doneIcon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.good, alignItems: 'center', justifyContent: 'center' },
});

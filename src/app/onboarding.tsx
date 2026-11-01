import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlueprintGrid, Button, Chip, Row, Txt, haptic } from '../components/ui';
import { PlanetMark } from '../components/PlanetMark';
import { CountrySheet, SelectField } from '../components/Pickers';
import { ExternalLink } from '../components/ExternalLink';
import { colors, column, fonts, radius, space } from '../theme';
import { useApp } from '../lib/store';
import { LANGUAGES } from '../lib/i18n';
import { COUNTRIES, countryName, flag } from '../lib/countries';
import { DISCIPLINES, ROLES, type Discipline, type Role } from '../lib/types';
import { isValidHandle } from '../lib/moderation';
import { LINKS } from '../lib/links';

const STEPS = 3; // language · welcome · profile

export default function Onboarding() {
  const { t, prefs, setProfile, completeOnboarding, locale, rtl, disc, roleName, api } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(prefs.profile.handle);
  const [discipline, setDiscipline] = useState<Discipline>(prefs.profile.discipline);
  const [country, setCountry] = useState(COUNTRIES.some((c) => c.code === prefs.profile.country) ? prefs.profile.country : 'XX');
  const [years, setYears] = useState(prefs.profile.years);
  const [role, setRole] = useState<Role>(prefs.profile.role);
  const [countryOpen, setCountryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fade = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [step, fade]);

  const next = async () => {
    if (step < STEPS - 1) return setStep(step + 1);
    const h = handle.trim();
    if (!isValidHandle(h)) return setError(t('handleInvalid'));
    setBusy(true);
    try {
      if (!(await api.handleAvailable(h))) {
        setError(t('handleTaken'));
        setBusy(false);
        return;
      }
      await completeOnboarding({ handle: h, discipline, country, years, role, locale });
      haptic.success();
      router.replace('/(tabs)');
    } catch {
      setError(t('errNetwork'));
      setBusy(false);
    }
  };

  const inputStyle = { fontFamily: fonts.mono, textAlign: 'left' as const };

  return (
    <View style={styles.fill}>
      <BlueprintGrid />
      <View style={[styles.top, column, { paddingTop: insets.top + space.md }]}>
        <Pressable onPress={() => step > 0 && setStep(step - 1)} disabled={step === 0} style={[styles.iconBtn, step === 0 && { opacity: 0 }]} accessibilityLabel={t('back')} hitSlop={8}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={18} color={colors.text} />
        </Pressable>
        <Row gap={6}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </Row>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={[{ flexGrow: 1, padding: space.lg }, column]} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ flex: 1, justifyContent: 'center', opacity: fade }}>
          {step === 0 && (
            <View style={{ alignItems: 'center' }}>
              <PlanetMark size={150} />
              <Txt v="title" center style={{ marginTop: space.md }}>
                {t('appName')}
              </Txt>
              <Txt v="small" center style={{ marginTop: 4, fontFamily: fonts.arabic }}>
                {t('sloganAr')}
              </Txt>
              <Txt v="label" center style={{ marginTop: space.xl, marginBottom: space.md }}>
                {t('chooseLanguage')}
              </Txt>
              <Row gap={space.sm} style={{ alignSelf: 'stretch' }}>
                {LANGUAGES.map((l) => {
                  const active = l.code === locale;
                  return (
                    <Pressable
                      key={l.code}
                      onPress={() => {
                        haptic.select();
                        setProfile({ locale: l.code });
                      }}
                      style={[styles.lang, active && styles.langActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Txt center style={{ fontFamily: l.rtl ? fonts.arabicBold : fonts.sansSemi, fontSize: 18, lineHeight: 28, color: active ? colors.bgDeep : colors.text }}>
                        {l.native}
                      </Txt>
                    </Pressable>
                  );
                })}
              </Row>
            </View>
          )}

          {step === 1 && (
            <View>
              <Txt v="label">{t('appName')}</Txt>
              <Txt v="display" style={{ marginTop: space.sm }}>
                {t('slogan')}
              </Txt>
              <Txt style={{ marginTop: space.md, color: colors.textMuted }}>{t('welcomeBody')}</Txt>
              <View style={{ marginTop: space.lg, gap: space.sm }}>
                {(
                  [
                    ['construct-outline', 'feat1'],
                    ['help-buoy-outline', 'feat2'],
                    ['compass-outline', 'feat3'],
                    ['flash-outline', 'feat4'],
                  ] as const
                ).map(([icon, key]) => (
                  <Row key={key} gap={space.md} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={icon} size={20} color={colors.accent} />
                    </View>
                    <Txt style={{ flex: 1 }}>{t(key)}</Txt>
                  </Row>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: space.md }}>
              <Txt v="title">{t('profileTitle')}</Txt>
              <View>
                <Txt v="label" style={{ marginBottom: space.sm }}>
                  {t('handle')}
                </Txt>
                <Row style={[styles.input, { flexDirection: 'row' }]} gap={4}>
                  <Txt v="mono" style={{ color: colors.accent, fontSize: 16 }}>@</Txt>
                  <TextInput
                    value={handle}
                    onChangeText={(v) => {
                      setHandle(v.replace(/\s/g, ''));
                      setError(null);
                    }}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="eng_ahmed"
                    placeholderTextColor={colors.textFaint}
                    style={[{ flex: 1, color: colors.text, fontSize: 16, height: 48 }, inputStyle]}
                    accessibilityLabel={t('handle')}
                  />
                </Row>
                <Txt v="small" style={{ marginTop: 6, color: error ? colors.bad : colors.textMuted }}>
                  {error ?? t('handleHint')}
                </Txt>
              </View>

              <View>
                <Txt v="label" style={{ marginBottom: space.sm }}>
                  {t('discipline')}
                </Txt>
                <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                  {DISCIPLINES.map((d) => (
                    <Chip key={d} label={disc(d)} active={discipline === d} onPress={() => setDiscipline(d)} />
                  ))}
                </View>
              </View>

              <SelectField label={t('country')} value={`${flag(country)}  ${countryName(country, locale)}`} onPress={() => setCountryOpen(true)} />

              <View>
                <Txt v="label" style={{ marginBottom: space.sm }}>
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

              <View>
                <Txt v="label" style={{ marginBottom: space.sm }}>
                  {t('role')}
                </Txt>
                <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                  {ROLES.map((r) => (
                    <Chip key={r} label={roleName(r)} active={role === r} onPress={() => setRole(r)} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[{ padding: space.lg, paddingBottom: insets.bottom + space.lg }, column]}>
        {step === STEPS - 1 && (
          <View style={{ marginBottom: space.md }}>
            <Txt v="small" center style={{ fontSize: 12 }}>
              {t('agree')}
            </Txt>
            <Row gap={space.lg} style={{ justifyContent: 'center', marginTop: 4 }}>
              <ExternalLink href={LINKS.terms} label={t('terms')}>
                <Txt v="small" style={{ fontSize: 12, color: colors.accent, textDecorationLine: 'underline' }}>{t('terms')}</Txt>
              </ExternalLink>
              <ExternalLink href={LINKS.privacy} label={t('privacy')}>
                <Txt v="small" style={{ fontSize: 12, color: colors.accent, textDecorationLine: 'underline' }}>{t('privacy')}</Txt>
              </ExternalLink>
            </Row>
          </View>
        )}
        <Button label={step === STEPS - 1 ? t('start') : t('continue')} onPress={next} loading={busy} disabled={step === STEPS - 1 && handle.trim().length < 3} />
      </View>

      <CountrySheet visible={countryOpen} onClose={() => setCountryOpen(false)} onPick={setCountry} selected={country} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong },
  dotActive: { width: 22, backgroundColor: colors.accent },
  lang: { flex: 1, paddingVertical: 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  langActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  feature: { padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, backgroundColor: 'rgba(12,26,44,0.85)' },
  featureIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md, backgroundColor: 'rgba(255,255,255,0.02)' },
  wrap: { flexWrap: 'wrap', gap: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

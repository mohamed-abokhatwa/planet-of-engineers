import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Avatar, LevelBadge } from '../../components/People';
import { ExternalLink } from '../../components/ExternalLink';
import { Sheet } from '../../components/Sheet';
import { Button, Card, Divider, Loader, Row, Screen, Txt, haptic } from '../../components/ui';
import { fonts, radius, space, useColors, makeStyles, type ThemeMode } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { LANGUAGES, levelFor } from '../../lib/i18n';
import { countryName, flag } from '../../lib/countries';
import { scheduleChallengeReminder } from '../../lib/notifications';
import { LINKS, SUPPORT_EMAIL } from '../../lib/links';

const THEMES: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: { en: string; ar: string } }[] = [
  { mode: 'dark', icon: 'moon-outline', label: { en: 'Dark', ar: 'داكن' } },
  { mode: 'light', icon: 'sunny-outline', label: { en: 'Light', ar: 'فاتح' } },
  { mode: 'system', icon: 'phone-portrait-outline', label: { en: 'Auto', ar: 'تلقائي' } },
];

export default function MeScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t, tr, rtl, prefs, setPrefs, setProfile, locale, disc, roleName, reset, api } = useApp();
  const stats = useLoad((a) => a.meStats());
  const [confirm, setConfirm] = useState(false);
  const p = prefs.profile;
  const lv = levelFor(stats.data?.reputation ?? 0);

  return (
    <Screen>
      <Txt v="label">{t('tabMe')}</Txt>
      <Txt v="title" style={{ marginTop: 4, marginBottom: space.md }}>
        {t('meTitle')}
      </Txt>

      <Card>
        <Row gap={space.md}>
          <Avatar handle={p.handle || 'PE'} discipline={p.discipline} size={60} />
          <View style={{ flex: 1 }}>
            <Txt v="heading" style={{ writingDirection: 'ltr' }}>@{p.handle}</Txt>
            <Txt v="small">
              {flag(p.country)} {countryName(p.country, locale)} · {disc(p.discipline)}
            </Txt>
            <Txt v="small">
              {roleName(p.role)} · {p.years} {locale === 'ar' ? 'سنة خبرة' : 'yrs'}
            </Txt>
          </View>
        </Row>
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <LevelBadge reputation={stats.data?.reputation ?? 0} />
          <Txt v="mono" style={{ fontSize: 12, writingDirection: 'ltr' }}>
            {stats.data?.reputation ?? 0}
            {lv.next ? ` / ${lv.next.min}` : ''}
          </Txt>
        </Row>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${Math.round(lv.progress * 100)}%` }]} />
        </View>
        {lv.next ? (
          <Txt v="small" style={{ marginTop: 6, fontSize: 11.5 }}>
            {rtl ? '←' : '→'} {lv.next[locale]}
          </Txt>
        ) : null}
      </Card>

      {stats.data ? (
        <Row gap={space.sm} style={{ marginTop: space.sm, flexWrap: 'wrap' }}>
          {(
            [
              ['questionsCount', stats.data.questions, 'help-buoy-outline'],
              ['answersCount', stats.data.answers, 'chatbubbles-outline'],
              ['acceptedCount', stats.data.accepted, 'checkmark-done-outline'],
              ['challengesCount', stats.data.challengesCorrect, 'flash-outline'],
            ] as const
          ).map(([k, n, icon]) => (
            <Card key={k} style={styles.stat}>
              <Ionicons name={icon} size={18} color={colors.accent} />
              <Txt v="number" style={{ fontSize: 22, lineHeight: 28, marginTop: 4 }}>
                {n}
              </Txt>
              <Txt v="small" style={{ fontSize: 11.5 }}>
                {t(k)}
              </Txt>
            </Card>
          ))}
        </Row>
      ) : (
        <Loader />
      )}

      <Button
        label={t('idCard')}
        variant="outline"
        icon={<Ionicons name="id-card-outline" size={18} color={colors.accent} />}
        onPress={() => router.push('/card')}
        style={{ marginTop: space.md }}
      />

      <Txt v="label" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        {t('settings')}
      </Txt>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={10}>
            <Ionicons name="globe-outline" size={18} color={colors.cyan} />
            <Txt>{t('language')}</Txt>
          </Row>
          <Row gap={6}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => {
                  haptic.select();
                  setProfile({ locale: l.code });
                  scheduleChallengeReminder(l.code, prefs.reminders).catch(() => {});
                }}
                style={[styles.lang, locale === l.code && styles.langActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: locale === l.code }}
              >
                <Txt style={{ fontFamily: l.rtl ? fonts.arabicMedium : fonts.sansMedium, fontSize: 13, color: locale === l.code ? colors.onAccent : colors.text }}>{l.native}</Txt>
              </Pressable>
            ))}
          </Row>
        </Row>
        <Divider />
        <Row gap={10}>
          <Ionicons name="contrast-outline" size={18} color={colors.cyan} />
          <Txt style={{ flex: 1 }}>{tr({ en: 'Appearance', ar: 'المظهر' })}</Txt>
        </Row>
        <View style={[styles.segment, { flexDirection: rtl ? 'row-reverse' : 'row' }]} accessibilityRole="radiogroup">
          {THEMES.map((o) => {
            const on = (prefs.theme ?? 'dark') === o.mode;
            return (
              <Pressable
                key={o.mode}
                onPress={() => {
                  haptic.select();
                  setPrefs({ theme: o.mode });
                }}
                style={[styles.segBtn, on && styles.segOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tr(o.label)}
              >
                <Ionicons name={o.icon} size={15} color={on ? colors.onAccent : colors.textMuted} />
                <Txt style={{ fontSize: 13, lineHeight: 18, color: on ? colors.onAccent : colors.text }}>{tr(o.label)}</Txt>
              </Pressable>
            );
          })}
        </View>
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={10} style={{ flex: 1 }}>
            <Ionicons name="alarm-outline" size={18} color={colors.cyan} />
            <Txt style={{ flex: 1 }}>{t('reminders')}</Txt>
          </Row>
          <Switch
            value={prefs.reminders}
            onValueChange={(v) => {
              setPrefs({ reminders: v });
              scheduleChallengeReminder(locale, v).catch(() => {});
            }}
            trackColor={{ true: colors.accentDeep, false: colors.surfaceRaised }}
            thumbColor={prefs.reminders ? colors.accent : colors.textMuted}
          />
        </Row>
        <Divider />
        <Txt v="label" style={{ marginBottom: 6 }}>
          {t('about')}
        </Txt>
        <Txt v="small">{t('aboutBody')}</Txt>
        <Row gap={space.lg} style={{ marginTop: space.sm, flexWrap: 'wrap' }}>
          <ExternalLink href={LINKS.privacy} label={t('privacy')}>
            <Txt v="small" style={{ color: colors.accent, textDecorationLine: 'underline' }}>{t('privacy')}</Txt>
          </ExternalLink>
          <ExternalLink href={LINKS.terms} label={t('terms')}>
            <Txt v="small" style={{ color: colors.accent, textDecorationLine: 'underline' }}>{t('terms')}</Txt>
          </ExternalLink>
        </Row>
        <Divider />
        <Txt v="label" style={{ marginBottom: 6 }}>
          {t('support')}
        </Txt>
        <Txt v="small">{t('supportBody')}</Txt>
        <Txt selectable v="mono" style={{ marginTop: 4, color: colors.text }}>
          {SUPPORT_EMAIL}
        </Txt>
      </Card>

      <Pressable onPress={() => setConfirm(true)} style={{ paddingVertical: space.lg }} accessibilityRole="button">
        <Txt v="small" center color={colors.bad}>
          {t('deleteAccount')}
        </Txt>
      </Pressable>
      <Txt v="mono" center style={{ fontSize: 10.5, color: colors.textFaint }}>
        {t('appName')} · v1.0 · {api.mode}
      </Txt>

      {/* In-app confirmation (works everywhere, including the web preview) */}
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={t('deleteAccount')}>
        <Txt v="small" center style={{ marginBottom: space.lg }}>
          {t('deleteConfirm')}
        </Txt>
        <Button
          label={t('deleteYes')}
          onPress={async () => {
            setConfirm(false);
            await reset();
            router.replace('/onboarding');
          }}
          style={{ backgroundColor: colors.bad, borderRadius: radius.md }}
        />
        <Button label={t('cancel')} variant="ghost" onPress={() => setConfirm(false)} style={{ marginTop: space.sm }} />
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  segment: { marginTop: 10, padding: 3, gap: 3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.field },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.sm },
  segOn: { backgroundColor: colors.accent },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, marginTop: space.sm, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  stat: { flexBasis: '47%', flexGrow: 1, padding: space.md },
  lang: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  langActive: { backgroundColor: colors.accent, borderColor: colors.accent },
}));

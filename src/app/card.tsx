import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { BackHeader } from '../components/BackHeader';
import { Avatar, useDiscColors } from '../components/People';
import { PlanetMark } from '../components/PlanetMark';
import { BlueprintGrid, Button, Row, Screen, Txt, haptic } from '../components/ui';
import { fonts, radius, space, useColors, makeStyles } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { levelFor } from '../lib/i18n';
import { countryName, flag } from '../lib/countries';

/** Decorative "barcode" derived from the username, so every card looks unique. */
function bars(handle: string) {
  let h = 2166136261;
  for (const ch of handle) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Array.from({ length: 34 }, (_, i) => 1 + ((h >>> (i % 28)) & 3));
}

export default function CardScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t, prefs, locale, disc, roleName } = useApp();
  const stats = useLoad((a) => a.meStats());
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const p = prefs.profile;
  const lv = levelFor(stats.data?.reputation ?? 0);
  const accent = useDiscColors()[p.discipline];

  const share = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      // view-shot's types predate React Native's new element refs; the ref is a valid host view.
      const uri = await captureRef(ref as unknown as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
      haptic.success();
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('idCard') });
    } catch {
      haptic.error();
    }
    setBusy(false);
  };

  return (
    <Screen>
      <BackHeader title={t('idCard')} />
      <View ref={ref} collapsable={false} style={styles.card}>
        <BlueprintGrid />
        <View style={[styles.stripe, { backgroundColor: accent }]} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 11, letterSpacing: 2, color: colors.cyan, textAlign: 'left' }}>PLANET OF ENGINEERS</Txt>
            <Txt style={{ fontFamily: fonts.arabicBold, fontSize: 13, color: colors.textMuted, textAlign: 'left' }}>كوكب المهندسين</Txt>
          </View>
          <PlanetMark size={54} />
        </Row>

        <Row gap={space.md} style={{ marginTop: space.lg, flexDirection: 'row' }}>
          <Avatar handle={p.handle || 'PE'} discipline={p.discipline} size={72} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: fonts.sansBold, fontSize: 22, color: colors.text, textAlign: 'left' }} numberOfLines={1}>
              @{p.handle}
            </Txt>
            <Txt style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: accent, textAlign: 'left' }}>{disc(p.discipline)}</Txt>
            <Txt style={{ fontFamily: locale === 'ar' ? fonts.arabic : fonts.sans, fontSize: 13, color: colors.textMuted, textAlign: 'left' }}>
              {flag(p.country)} {countryName(p.country, locale)} · {roleName(p.role)}
            </Txt>
          </View>
        </Row>

        <Row style={{ marginTop: space.lg, gap: space.lg, flexDirection: 'row' }}>
          {[
            ['LEVEL', lv.level[locale]],
            ['REP', String(stats.data?.reputation ?? 0)],
            ['EXP', `${p.years}y`],
          ].map(([k, v]) => (
            <View key={k}>
              <Txt style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: colors.textFaint, textAlign: 'left' }}>{k}</Txt>
              <Txt style={{ fontFamily: locale === 'ar' && k === 'LEVEL' ? fonts.arabicBold : fonts.monoSemi, fontSize: 15, color: colors.text, textAlign: 'left' }}>{v}</Txt>
            </View>
          ))}
        </Row>

        <Row style={{ marginTop: space.lg, justifyContent: 'space-between', alignItems: 'flex-end', flexDirection: 'row' }}>
          <Txt style={{ fontFamily: fonts.arabicMedium, fontSize: 12.5, color: colors.accent, flex: 1, textAlign: 'left' }}>الدنيا عبارة عن مهندسين وشوية ناس تانيين</Txt>
          <Row gap={1.5} style={{ flexDirection: 'row', alignItems: 'flex-end', height: 28 }}>
            {bars(p.handle || 'pe').map((w, i) => (
              <View key={i} style={{ width: w, height: i % 5 === 0 ? 28 : 22, backgroundColor: colors.text, opacity: 0.85 }} />
            ))}
          </Row>
        </Row>
      </View>

      {Platform.OS !== 'web' ? (
        <Button label={t('share')} icon={<Ionicons name="share-outline" size={18} color={colors.onAccent} />} onPress={share} loading={busy} style={{ marginTop: space.lg }} />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    borderRadius: radius.xl,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
}));

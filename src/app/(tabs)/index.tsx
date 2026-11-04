import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlueprintGrid, Card, Loader, PressableScale, Row, SectionTitle, Txt, haptic } from '../../components/ui';
import { ChallengeCard } from '../../components/ChallengeCard';
import { QuestionCard } from '../../components/QuestionCard';
import { Avatar, LevelBadge } from '../../components/People';
import { PlanetMark } from '../../components/PlanetMark';
import { column, fonts, radius, space, useColors, makeStyles } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { countryName, flag } from '../../lib/countries';
import { fmtNum } from '../../lib/format';
import { JOKES } from '../../data/challenges';
import { findTool } from '../../tools/defs';
import { MenuCard } from '../../components/Campus';
import { NoticeBanner } from '../../components/NoticeBanner';

const QUICK = [
  { id: 'calculator', href: '/calculator' as const, icon: 'calculator-outline' as const, title: { en: 'Calculator', ar: 'الحاسبة' } },
  { id: 'converter', href: '/converter' as const, icon: 'swap-horizontal-outline' as const, title: { en: 'Units', ar: 'الوحدات' } },
  ...['concrete', 'beam'].map((id) => {
    const x = findTool(id)!;
    return { id, href: `/tool/${id}` as const, icon: x.icon, title: x.title };
  }),
];

export default function PlanetScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t, tr, locale, disc, prefs, api, touch, rtl } = useApp();
  const insets = useSafeAreaInsets();
  const planet = useLoad((a) => a.planet());
  const today = useLoad((a) => a.todayChallenge());
  const me = useLoad((a) => a.meStats());
  const sos = useLoad((a) => a.listQuestions('new', null));
  const leaders = useLoad((a) => a.leaderboard(null));
  const [joke, setJoke] = useState(() => new Date().getDate() % JOKES.length);
  const p = prefs.profile;

  return (
    <View style={styles.fill}>
      <BlueprintGrid />
      <ScrollView
        contentContainerStyle={[{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 120, paddingHorizontal: space.md + 4 }, column]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl tintColor={colors.accent} refreshing={false} onRefresh={touch} />}
      >
        {api.mode === 'demo' && (
          <View style={styles.demo}>
            <Txt v="small" center style={{ fontSize: 11, lineHeight: 16 }}>
              {t('demoBanner')}
            </Txt>
          </View>
        )}

        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt v="small">{t('hello', { name: p.handle })}</Txt>
            <Txt v="title" style={{ marginTop: 2 }}>
              {t('appName')}
            </Txt>
          </View>
          <Pressable onPress={() => router.navigate('/(tabs)/me')} accessibilityLabel={t('tabMe')}>
            <Avatar handle={p.handle || 'PE'} discipline={p.discipline} size={44} />
          </Pressable>
        </Row>

        {/* Your place on the planet */}
        <Card style={{ marginTop: space.md, overflow: 'hidden' }}>
          <Row gap={space.md}>
            <PlanetMark size={86} />
            <View style={{ flex: 1 }}>
              {planet.data ? (
                <>
                  <Txt v="number" color={colors.accent}>
                    {fmtNum(planet.data.total, 0)}
                  </Txt>
                  <Txt v="small" style={{ marginTop: -2 }}>{t('onPlanet')}</Txt>
                  <Txt style={{ marginTop: space.sm, fontSize: 14 }}>
                    {flag(p.country)} {t('youAreOne', { n: fmtNum(planet.data.myCountryCount, 0), country: countryName(p.country, locale) })}
                  </Txt>
                  <Txt v="small" style={{ marginTop: 2 }}>
                    {fmtNum(planet.data.myDisciplineCount, 0)} {t('inDiscipline', { discipline: disc(p.discipline) })}
                  </Txt>
                </>
              ) : (
                <Loader />
              )}
            </View>
          </Row>
          {me.data ? (
            <Row style={{ marginTop: space.md, justifyContent: 'space-between' }}>
              <LevelBadge reputation={me.data.reputation} />
              <Txt v="mono" style={{ fontSize: 12 }}>
                {t('reputation')} · {me.data.reputation}
              </Txt>
            </Row>
          ) : null}
        </Card>

        <NoticeBanner />

        {/* Students first see their campus */}
        {p.role === 'student' ? (
          <View style={{ marginTop: space.md }}>
            <MenuCard icon="school-outline" title={t('campus')} sub={p.universityName ?? t('campusCardBody')} onPress={() => router.push('/campus')} />
          </View>
        ) : null}

        {/* Daily challenge */}
        <View style={{ marginTop: space.md }}>
          {today.data ? <ChallengeCard key={today.data.day} today={today.data} streak={me.data?.streak ?? 0} onAnswered={() => me.reload()} /> : <Loader />}
        </View>

        {p.role !== 'student' ? (
          <View style={{ marginTop: space.md }}>
            <MenuCard
              icon="school-outline"
              title={t('campus')}
              sub={p.mentor && me.data?.askedToMe ? t('askedToMeSub', { n: me.data.askedToMe }) : t('campusCardBody')}
              badge={p.mentor ? me.data?.askedToMe : undefined}
              onPress={() => router.push('/campus')}
            />
          </View>
        ) : null}

        {/* Quick tools */}
        <SectionTitle title={t('quickTools')} action={t('seeAll')} onAction={() => router.navigate('/(tabs)/tools')} />
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {QUICK.map((tool) => (
            <PressableScale
              key={tool.id}
              containerStyle={{ flexBasis: '23%', flexGrow: 1 }}
              onPress={() => router.push(tool.href)}
              accessibilityLabel={tr(tool.title)}
            >
              <View style={styles.quick}>
                <Ionicons name={tool.icon} size={22} color={colors.accent} />
                <Txt v="small" center numberOfLines={2} style={{ marginTop: 6, fontSize: 11.5, lineHeight: 16, color: colors.text }}>
                  {tr(tool.title)}
                </Txt>
              </View>
            </PressableScale>
          ))}
        </Row>

        {/* Latest SOS */}
        <SectionTitle title={t('latestSos')} action={t('seeAll')} onAction={() => router.navigate('/(tabs)/sos')} />
        {sos.data ? sos.data.slice(0, 2).map((q) => <QuestionCard key={q.id} q={q} />) : <Loader />}

        {/* Leaderboard */}
        <SectionTitle title={t('leaderboard')} action={t('seeAll')} onAction={() => router.push('/leaderboard')} />
        <Card>
          {(leaders.data ?? []).slice(0, 3).map((r, i) => (
            <Row key={r.handle} gap={space.md} style={[styles.leader, i > 0 && styles.leaderBorder]}>
              <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 16, width: 22, color: i === 0 ? colors.accent : colors.textMuted }}>{i + 1}</Txt>
              <Avatar handle={r.handle} discipline={r.discipline} size={30} />
              <Txt numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, writingDirection: 'ltr' }}>
                @{r.handle} {flag(r.country)}
              </Txt>
              <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 14 }}>
                {r.points} <Txt v="small" style={{ fontSize: 11 }}>{t('points')}</Txt>
              </Txt>
            </Row>
          ))}
        </Card>

        {/* Where engineers are */}
        <SectionTitle title={t('topCountries')} />
        <Card>
          {(planet.data?.countries ?? []).slice(0, 6).map((c, i, arr) => (
            <View key={c.country} style={{ marginBottom: i < arr.length - 1 ? 10 : 0 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Txt style={{ fontSize: 13.5 }}>
                  {flag(c.country)} {countryName(c.country, locale)}
                </Txt>
                <Txt v="mono" style={{ fontSize: 12 }}>{fmtNum(c.count, 0)}</Txt>
              </Row>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(c.count / arr[0].count) * 100}%`, alignSelf: rtl ? 'flex-end' : 'flex-start' }]} />
              </View>
            </View>
          ))}
        </Card>

        {/* Coffee break */}
        <SectionTitle title={t('coffeeBreak')} />
        <Card>
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="cafe-outline" size={26} color={colors.accent} />
            <Txt style={{ flex: 1, fontSize: 16, lineHeight: 26 }}>{tr(JOKES[joke])}</Txt>
          </Row>
          <Pressable
            onPress={() => {
              haptic.light();
              setJoke((j) => (j + 1) % JOKES.length);
            }}
            style={{ marginTop: space.sm, alignSelf: rtl ? 'flex-start' : 'flex-end' }}
            accessibilityRole="button"
          >
            <Txt v="small" color={colors.accent}>
              {t('nextJoke')} →
            </Txt>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { flex: 1, backgroundColor: colors.bg },
  demo: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, marginBottom: space.md },
  quick: { height: 88, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center', padding: 6 },
  leader: { paddingVertical: 9 },
  leaderBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.cyan },
}));

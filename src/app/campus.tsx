import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { MenuCard } from '../components/Campus';
import { Button, Card, Loader, Row, Screen, Txt } from '../components/ui';
import { space, useColors } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { countryName, flag } from '../lib/countries';

export default function CampusScreen() {
  const colors = useColors();
  const { t, prefs, locale } = useApp();
  const p = prefs.profile;
  const uni = useLoad((a) => (p.universityId ? a.universityInfo(p.universityId) : Promise.resolve(null)), String(p.universityId ?? ''));
  const me = useLoad((a) => a.meStats());
  const asked = me.data?.askedToMe ?? 0;

  return (
    <Screen>
      <BackHeader title={t('campus')} />
      <Txt v="title">{t('campusTitle')}</Txt>
      <Txt v="small" style={{ marginTop: 4, marginBottom: space.md }}>
        {t('campusSub')}
      </Txt>

      <Card accent style={{ marginBottom: space.md }}>
        <Txt v="label" style={{ marginBottom: 6 }}>
          {t('myUniversity')}
        </Txt>
        {p.universityId && uni.loading && !uni.data ? (
          <Loader />
        ) : uni.data ? (
          <>
            <Txt v="heading" auto>
              {uni.data.name}
            </Txt>
            <Txt v="small" style={{ marginTop: 2 }}>
              {flag(uni.data.country)} {countryName(uni.data.country, locale)} · {t('membersN', { n: uni.data.members })} · {t('studentsN', { n: uni.data.students })}
            </Txt>
            {uni.data.status === 'pending' ? (
              <Txt v="small" style={{ marginTop: 4, color: colors.warn }}>
                {t('pendingApproval')}
              </Txt>
            ) : null}
            <Row gap={space.sm} style={{ marginTop: space.md }}>
              <Button label={t('openCommunity')} onPress={() => router.push(`/community/${uni.data!.id}`)} style={{ flex: 1 }} />
              <Button label={t('changeUniversity')} variant="outline" onPress={() => router.push('/university')} style={{ flex: 1 }} />
            </Row>
          </>
        ) : (
          <>
            <Row gap={space.md}>
              <Ionicons name="school-outline" size={28} color={colors.accent} />
              <Txt v="small" style={{ flex: 1 }}>
                {t('pickUniversityBody')}
              </Txt>
            </Row>
            <Button label={t('pickUniversity')} onPress={() => router.push('/university')} style={{ marginTop: space.md }} />
          </>
        )}
      </Card>

      {p.mentor ? (
        <MenuCard icon="mail-unread-outline" title={t('askedToMe')} sub={t('askedToMeSub', { n: asked })} badge={asked} onPress={() => router.push('/feed?scope=for_me')} tint={colors.cyan} />
      ) : null}
      <MenuCard icon="school-outline" title={t('practice')} sub={t('practiceSub')} onPress={() => router.push('/practice')} />
      <MenuCard icon="people-outline" title={t('mentors')} sub={t('mentorsSub')} onPress={() => router.push('/mentors')} tint={colors.cyan} />
      <MenuCard icon="briefcase-outline" title={t('board')} sub={t('boardSub')} onPress={() => router.push('/opportunities')} tint={colors.good} />
      <MenuCard icon="ribbon-outline" title={t('graduation')} sub={t('graduationSub')} onPress={() => router.push('/feed?category=graduation')} tint={colors.warn} />
      <MenuCard icon="trophy-outline" title={t('studentBoard')} onPress={() => router.push('/leaderboard?scope=students')} />
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

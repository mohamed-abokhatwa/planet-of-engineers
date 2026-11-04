// A university community: members, moderators, and its questions (pinned first).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { EmptyCard } from '../../components/Campus';
import { QuestionCard } from '../../components/QuestionCard';
import { Button, Card, Chip, Loader, Row, Screen, Txt, haptic } from '../../components/ui';
import { space, useColors } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { countryName, flag } from '../../lib/countries';
import { MIN_COMMUNITY } from '../../data/api';
import type { QuestionFilter } from '../../lib/types';

export default function CommunityScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = Number(id);
  const { t, locale, prefs, setProfile, touch } = useApp();
  const [filter, setFilter] = useState<QuestionFilter>('new');
  const info = useLoad((a) => a.universityInfo(uid), String(uid));
  const feed = useLoad((a) => a.feed({ filter, discipline: null, scope: 'university', universityId: uid }), `${uid}|${filter}`);
  const u = info.data;
  const small = !!u && u.members < MIN_COMMUNITY;
  const students = useLoad((a) => (small && u ? a.feed({ filter: 'new', discipline: null, scope: 'students', country: u.country }) : Promise.resolve([])), `${small}|${u?.country ?? ''}`);

  if (info.loading && !u) return <Screen><BackHeader /><Loader /></Screen>;
  if (!u) return <Screen><BackHeader /><EmptyCard text="—" /></Screen>;

  return (
    <Screen>
      <BackHeader title={t('campus')} />
      <Card accent>
        <Txt v="heading" auto style={{ fontSize: 19, lineHeight: 26 }}>
          {u.name}
        </Txt>
        <Txt v="small" style={{ marginTop: 4 }}>
          {flag(u.country)} {countryName(u.country, locale)}
        </Txt>
        <Row gap={space.md} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
          <Txt v="mono">{t('membersN', { n: u.members })}</Txt>
          <Txt v="mono">{t('studentsN', { n: u.students })}</Txt>
          <Txt v="mono">{t('mentorsN', { n: u.mentors })}</Txt>
        </Row>
        {u.moderators.length ? (
          <Txt v="small" style={{ marginTop: 6, writingDirection: 'ltr' }}>
            {t('moderatorsLabel')}: {u.moderators.map((h) => `@${h}`).join(', ')}
          </Txt>
        ) : null}
        {u.isMember ? (
          <Row gap={space.sm} style={{ marginTop: space.md }}>
            <Button label={t('askCommunity')} onPress={() => router.push(`/ask?universityId=${u.id}`)} style={{ flex: 1 }} />
          </Row>
        ) : (
          <Button
            label={t('joinUniversity')}
            onPress={async () => {
              haptic.success();
              await setProfile({ universityId: u.id, universityName: u.name });
              touch();
            }}
            style={{ marginTop: space.md }}
          />
        )}
        {u.isMember ? (
          <Txt v="small" style={{ marginTop: 6, color: colors.good }}>
            {t('youAreMember')}
          </Txt>
        ) : (
          <Txt v="small" style={{ marginTop: 6 }}>
            {t('joinToPost')}
          </Txt>
        )}
      </Card>

      {small ? (
        <Card style={{ marginTop: space.md }}>
          <Txt v="small">{t('communityStarting', { n: MIN_COMMUNITY, country: countryName(u.country, locale) })}</Txt>
        </Card>
      ) : null}

      <Row gap={8} style={{ marginTop: space.lg, marginBottom: space.md }}>
        {(['new', 'unanswered', 'top'] as QuestionFilter[]).map((f) => (
          <Chip key={f} small label={t(f === 'new' ? 'filterNew' : f === 'unanswered' ? 'filterUnanswered' : 'filterTop')} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </Row>
      {feed.loading && !feed.data ? <Loader /> : null}
      {feed.data && !feed.data.length ? <EmptyCard text={t('emptySos')} /> : null}
      {(feed.data ?? []).map((q) => (
        <QuestionCard key={q.id} q={q} />
      ))}

      {small && (students.data ?? []).length ? (
        <View style={{ marginTop: space.lg }}>
          <Txt v="label" style={{ marginBottom: space.sm }}>
            {t('studentsIn', { country: countryName(u.country, locale) })}
          </Txt>
          {(students.data ?? []).map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </View>
      ) : null}
      {prefs.profile.universityId === u.id ? null : <View style={{ height: space.md }} />}
    </Screen>
  );
}

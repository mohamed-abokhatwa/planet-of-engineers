import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { EmptyCard } from '../components/Campus';
import { Avatar } from '../components/People';
import { Card, Chip, Loader, Row, Screen, Txt } from '../components/ui';
import { fonts, radius, space, useColors, makeStyles } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { flag } from '../lib/countries';
import type { LeaderScope } from '../lib/types';

type Tab = LeaderScope | 'universities';

export default function LeaderboardScreen() {
  const colors = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{ scope?: string }>();
  const { t, prefs, disc } = useApp();
  const [tab, setTab] = useState<Tab>(params.scope === 'students' ? 'students' : 'all');
  const [mineOnly, setMineOnly] = useState(false);
  const noUni = tab === 'university' && !prefs.profile.universityId;
  const rows = useLoad(
    (a) => (tab === 'universities' || noUni ? Promise.resolve([]) : a.leaderboard2(mineOnly ? prefs.profile.discipline : null, tab)),
    `${tab}|${mineOnly}|${noUni}`,
  );
  const unis = useLoad((a) => (tab === 'universities' ? a.universityRanking(null) : Promise.resolve([])), tab);

  return (
    <Screen>
      <BackHeader title={t('leaderboard')} />
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: space.sm }}>
        {(['all', 'students', 'university', 'universities'] as Tab[]).map((k) => (
          <Chip key={k} small label={t(k === 'all' ? 'scopeAll' : k === 'students' ? 'scopeStudents' : k === 'university' ? 'scopeUniversity' : 'universitiesTab')} active={tab === k} onPress={() => setTab(k)} />
        ))}
      </Row>
      {tab !== 'universities' ? (
        <Row gap={8} style={{ marginBottom: space.md }}>
          <Chip small label={t('allDisciplines')} active={!mineOnly} onPress={() => setMineOnly(false)} />
          <Chip small label={disc(prefs.profile.discipline)} active={mineOnly} onPress={() => setMineOnly(true)} />
        </Row>
      ) : null}
      {noUni ? <EmptyCard text={t('joinUniversityFirst')} /> : null}
      {tab === 'universities' ? (
        <Card>
          {unis.loading && !unis.data ? (
            <Loader />
          ) : (unis.data ?? []).length === 0 ? (
            <Txt v="small" center>—</Txt>
          ) : (
            (unis.data ?? []).map((u, i) => (
              <Row key={u.universityId} gap={space.md} style={[styles.row, i > 0 && styles.border, u.universityId === prefs.profile.universityId && styles.me]}>
                <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 16, width: 26, color: i < 3 ? colors.accent : colors.textMuted }}>{i + 1}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt numberOfLines={2} auto style={{ fontFamily: fonts.sansMedium, fontSize: 14 }}>
                    {flag(u.country)} {u.name}
                  </Txt>
                  <Txt v="small" style={{ fontSize: 11.5 }}>
                    {t('membersN', { n: u.members })}
                  </Txt>
                </View>
                <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 14 }}>
                  {u.points} <Txt v="small" style={{ fontSize: 11 }}>{t('points')}</Txt>
                </Txt>
              </Row>
            ))
          )}
        </Card>
      ) : noUni ? null : (
        <Card>
          {rows.loading && !rows.data ? (
            <Loader />
          ) : (rows.data ?? []).length === 0 ? (
            <Txt v="small" center>—</Txt>
          ) : (
            (rows.data ?? []).map((r, i) => (
              <Row key={r.handle} gap={space.md} style={[styles.row, i > 0 && styles.border, r.isMe && styles.me]}>
                <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 16, width: 26, color: i < 3 ? colors.accent : colors.textMuted }}>{i + 1}</Txt>
                <Avatar handle={r.handle} discipline={r.discipline} size={32} />
                <View style={{ flex: 1 }}>
                  <Txt numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 14, writingDirection: 'ltr' }}>
                    @{r.handle} {flag(r.country)}
                  </Txt>
                  {tab === 'students' && r.universityName ? (
                    <Txt v="small" numberOfLines={1} style={{ fontSize: 11.5 }}>
                      {r.universityName}
                    </Txt>
                  ) : null}
                </View>
                <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 14 }}>
                  {r.points} <Txt v="small" style={{ fontSize: 11 }}>{t('points')}</Txt>
                </Txt>
              </Row>
            ))
          )}
        </Card>
      )}
      <Txt v="small" center style={{ marginTop: space.md, fontSize: 11.5 }}>
        {t('dailyChallenge')} · {t('correct')} = 1 {t('points')}
      </Txt>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { paddingVertical: 10, paddingHorizontal: 4, borderRadius: radius.sm },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  me: { backgroundColor: colors.accentSoft },
}));

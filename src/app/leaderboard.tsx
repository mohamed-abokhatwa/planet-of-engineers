import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { Avatar } from '../components/People';
import { Card, Chip, Loader, Row, Screen, Txt } from '../components/ui';
import { fonts, radius, space, useColors, makeStyles } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { flag } from '../lib/countries';

export default function LeaderboardScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t, prefs, disc } = useApp();
  const [mineOnly, setMineOnly] = useState(false);
  const rows = useLoad((a) => a.leaderboard(mineOnly ? prefs.profile.discipline : null), String(mineOnly));
  return (
    <Screen>
      <BackHeader title={t('leaderboard')} />
      <Row gap={8} style={{ marginBottom: space.md }}>
        <Chip small label={t('allDisciplines')} active={!mineOnly} onPress={() => setMineOnly(false)} />
        <Chip small label={disc(prefs.profile.discipline)} active={mineOnly} onPress={() => setMineOnly(true)} />
      </Row>
      <Card>
        {rows.loading && !rows.data ? (
          <Loader />
        ) : (
          (rows.data ?? []).map((r, i) => (
            <Row key={r.handle} gap={space.md} style={[styles.row, i > 0 && styles.border, r.isMe && styles.me]}>
              <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 16, width: 26, color: i < 3 ? colors.accent : colors.textMuted }}>{i + 1}</Txt>
              <Avatar handle={r.handle} discipline={r.discipline} size={32} />
              <Txt numberOfLines={1} style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, writingDirection: 'ltr' }}>
                @{r.handle} {flag(r.country)}
              </Txt>
              <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 14 }}>
                {r.points} <Txt v="small" style={{ fontSize: 11 }}>{t('points')}</Txt>
              </Txt>
            </Row>
          ))
        )}
      </Card>
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

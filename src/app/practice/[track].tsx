// A practice session: every question in the subject, shuffled, with the explanation after each answer.
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { Button, Card, Row, Screen, Txt, haptic } from '../../components/ui';
import { fonts, radius, space, useColors, makeStyles } from '../../theme';
import { useApp } from '../../lib/store';
import { TRACKS, shuffled, trackQuestions, type TrackId } from '../../data/practice';
import { saveBest } from '../../lib/practiceStore';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function PracticeSession() {
  const colors = useColors();
  const styles = useStyles();
  const { track } = useLocalSearchParams<{ track: string }>();
  const { t, tr, rtl } = useApp();
  const info = TRACKS.find((x) => x.id === track);
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const qs = useMemo(() => shuffled(trackQuestions(track as TrackId), seed), [track, seed]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!info || !qs.length) return <Screen><BackHeader /><Txt v="small" center>—</Txt></Screen>;
  const q = qs[i];

  const check = () => {
    if (pick === null) return;
    setChecked(true);
    if (pick === q.answer) {
      haptic.success();
      setScore((s) => s + 1);
    } else haptic.error();
  };
  const next = () => {
    if (i + 1 >= qs.length) {
      const final = score;
      setDone(true);
      saveBest(info.id, Math.round((final / qs.length) * 100)).catch(() => {});
      return;
    }
    setI(i + 1);
    setPick(null);
    setChecked(false);
  };

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <Screen>
        <BackHeader title={tr(info.title)} />
        <Card accent style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Txt v="number" color={pct >= 80 ? colors.good : colors.accent}>
            {pct}%
          </Txt>
          <Txt style={{ marginTop: space.sm }}>{t('scoreLine', { score, total: qs.length })}</Txt>
        </Card>
        <Button
          label={t('tryAgain')}
          onPress={() => {
            setSeed((s) => s + 1);
            setI(0);
            setPick(null);
            setChecked(false);
            setScore(0);
            setDone(false);
          }}
          style={{ marginTop: space.md }}
        />
        <Button label={t('backToTracks')} variant="ghost" onPress={() => router.back()} style={{ marginTop: space.sm }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title={tr(info.title)} />
      <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
        <Txt v="label">{t('questionN', { n: i + 1, total: qs.length })}</Txt>
        <Txt v="mono" style={{ fontSize: 12 }}>
          {score}/{i + (checked ? 1 : 0)}
        </Txt>
      </Row>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${Math.round(((i + (checked ? 1 : 0)) / qs.length) * 100)}%` }]} />
      </View>
      <Card style={{ marginTop: space.md }}>
        <Txt v="heading" style={{ fontSize: 17, lineHeight: 26 }}>
          {tr(q.q)}
        </Txt>
      </Card>
      <View style={{ marginTop: space.md, gap: 8 }}>
        {q.options.map((op, k) => {
          const isRight = checked && k === q.answer;
          const isWrong = checked && k === pick && k !== q.answer;
          return (
            <Pressable
              key={k}
              onPress={() => !checked && (haptic.select(), setPick(k))}
              accessibilityRole="radio"
              accessibilityState={{ selected: pick === k }}
              style={[styles.opt, { flexDirection: rtl ? 'row-reverse' : 'row' }, pick === k && !checked && styles.optPick, isRight && styles.optRight, isWrong && styles.optWrong]}
            >
              <Txt style={{ fontFamily: fonts.monoSemi, width: 22, color: colors.textMuted }}>{LETTERS[k]}</Txt>
              <Txt style={{ flex: 1, fontSize: 15 }}>{tr(op)}</Txt>
              {isRight ? <Ionicons name="checkmark-circle" size={20} color={colors.good} /> : isWrong ? <Ionicons name="close-circle" size={20} color={colors.bad} /> : null}
            </Pressable>
          );
        })}
      </View>
      {checked ? (
        <Card style={{ marginTop: space.md }}>
          <Txt v="label" color={pick === q.answer ? colors.good : colors.bad}>
            {pick === q.answer ? t('correct') : t('wrong')}
          </Txt>
          <Txt v="small" style={{ marginTop: 6 }}>
            {tr(q.explain)}
          </Txt>
        </Card>
      ) : null}
      <Button label={checked ? (i + 1 >= qs.length ? t('finish') : t('next')) : t('checkAnswer')} onPress={checked ? next : check} disabled={pick === null} style={{ marginTop: space.md }} />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  opt: { alignItems: 'center', gap: 10, padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  optPick: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optRight: { borderColor: colors.good, backgroundColor: colors.goodSoft },
  optWrong: { borderColor: colors.bad, backgroundColor: colors.badSoft },
}));

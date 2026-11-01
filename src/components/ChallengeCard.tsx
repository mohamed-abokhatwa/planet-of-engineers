import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Row, Txt, haptic } from './ui';
import { DisciplineTag } from './People';
import { colors, fonts, radius, space } from '../theme';
import { useApp } from '../lib/store';
import { CHALLENGES } from '../data/challenges';
import type { TodayChallenge } from '../lib/types';

const LETTERS = ['A', 'B', 'C', 'D'];

export function ChallengeCard({ today, streak, onAnswered }: { today: TodayChallenge; streak: number; onAnswered: () => void }) {
  const { t, tr, api, rtl } = useApp();
  const q = CHALLENGES[today.index];
  const [picked, setPicked] = useState<number | null>(today.answered?.choice ?? null);
  const [busy, setBusy] = useState(false);
  const done = picked !== null;
  const correct = done && picked === q.answer;

  const choose = async (i: number) => {
    if (done || busy) return;
    setBusy(true);
    setPicked(i);
    if (i === q.answer) haptic.success();
    else haptic.error();
    await api.answerChallenge(i).catch(() => {});
    setBusy(false);
    onAnswered();
  };

  return (
    <Card accent>
      <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
        <Row gap={8}>
          <Ionicons name="flash" size={16} color={colors.accent} />
          <Txt v="label" color={colors.accent}>
            {t('dailyChallenge')}
          </Txt>
        </Row>
        <Row gap={6}>
          <Ionicons name="flame" size={15} color={streak > 0 ? colors.accent : colors.textFaint} />
          <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 13 }}>{streak}</Txt>
          <Txt v="small" style={{ fontSize: 11 }}>{t('streak')}</Txt>
        </Row>
      </Row>
      <DisciplineTag discipline={q.discipline} />
      <Txt v="heading" style={{ marginTop: space.sm }}>
        {tr(q.q)}
      </Txt>
      <View style={{ marginTop: space.md, gap: 8 }}>
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const tone = !done ? null : isAnswer ? 'good' : isPicked ? 'bad' : 'dim';
          return (
            <Pressable
              key={i}
              onPress={() => choose(i)}
              disabled={done}
              accessibilityRole="button"
              accessibilityState={{ selected: isPicked, disabled: done }}
              style={[styles.opt, { flexDirection: rtl ? 'row-reverse' : 'row' }, tone === 'good' && styles.optGood, tone === 'bad' && styles.optBad, tone === 'dim' && { opacity: 0.5 }]}
            >
              <View style={[styles.letter, tone === 'good' && { backgroundColor: colors.good }, tone === 'bad' && { backgroundColor: colors.bad }]}>
                <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 12, lineHeight: 16, color: tone === 'good' || tone === 'bad' ? colors.bgDeep : colors.textMuted }}>{LETTERS[i]}</Txt>
              </View>
              <Txt style={{ flex: 1, fontSize: 14.5 }}>{tr(o)}</Txt>
              {tone === 'good' ? <Ionicons name="checkmark-circle" size={18} color={colors.good} /> : tone === 'bad' ? <Ionicons name="close-circle" size={18} color={colors.bad} /> : null}
            </Pressable>
          );
        })}
      </View>
      {done ? (
        <View style={styles.explain}>
          <Txt style={{ fontFamily: rtl ? fonts.arabicBold : fonts.sansSemi, color: correct ? colors.good : colors.bad }}>{correct ? t('correct') : t('wrong')}</Txt>
          <Txt v="small" style={{ marginTop: 4, color: colors.text }}>
            {tr(q.explain)}
          </Txt>
          <Txt v="small" style={{ marginTop: space.sm, fontSize: 11.5 }}>
            {t('challengeDone')}
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  opt: { alignItems: 'center', gap: 10, padding: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.025)' },
  optGood: { borderColor: colors.good, backgroundColor: 'rgba(74,222,128,0.10)' },
  optBad: { borderColor: colors.bad, backgroundColor: 'rgba(248,113,113,0.10)' },
  letter: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  explain: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineStrong },
});

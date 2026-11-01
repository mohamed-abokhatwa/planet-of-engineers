import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Card, PressableScale, Row, Txt } from './ui';
import { AuthorLine, DisciplineTag } from './People';
import { colors, fonts, radius, space } from '../theme';
import { useApp } from '../lib/store';
import { timeAgo } from '../lib/format';
import type { Question } from '../lib/types';

export const QuestionCard = memo(function QuestionCard({ q }: { q: Question }) {
  const { t, locale } = useApp();
  const answered = !!q.acceptedAnswerId;
  return (
    <PressableScale onPress={() => router.push(`/question/${q.id}`)} accessibilityLabel={q.title} style={{ marginBottom: space.sm + 2 }}>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
          <DisciplineTag discipline={q.discipline} />
          <Txt v="mono" style={{ fontSize: 11.5 }}>{timeAgo(q.createdAt, locale)}</Txt>
        </Row>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Txt v="heading" auto numberOfLines={2} style={{ fontSize: 16.5, lineHeight: 23 }}>
              {q.title}
            </Txt>
            <Txt v="small" auto numberOfLines={2} style={{ marginTop: 4 }}>
              {q.body}
            </Txt>
          </View>
          {q.imageUrl ? <Image source={{ uri: q.imageUrl }} style={styles.thumb} /> : null}
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
          <View style={{ flex: 1 }}>
            <AuthorLine author={q.author} />
          </View>
          <Row gap={space.md}>
            <Row gap={4}>
              <Ionicons name="arrow-up" size={14} color={colors.textMuted} />
              <Txt style={styles.stat}>{q.score}</Txt>
            </Row>
            <Row gap={4} style={[styles.answers, answered && styles.answered]}>
              <Ionicons name={answered ? 'checkmark' : 'chatbubble-outline'} size={13} color={answered ? colors.bgDeep : colors.textMuted} />
              <Txt style={[styles.stat, answered && { color: colors.bgDeep }]}>{q.answerCount}</Txt>
            </Row>
          </Row>
        </Row>
        {q.answerCount === 0 ? (
          <Txt v="small" style={{ marginTop: 6, fontSize: 11.5, color: colors.accent }}>
            {t('noAnswers')}
          </Txt>
        ) : null}
      </Card>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  stat: { fontFamily: fonts.monoSemi, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  answers: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  answered: { backgroundColor: colors.good, borderColor: colors.good },
});

import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { BackHeader } from '../../components/BackHeader';
import { ReportSheet, type ReportTarget } from '../../components/ReportSheet';
import { AuthorLine, DisciplineTag, VoteBox } from '../../components/People';
import { Button, Card, Loader, Row, Screen, Txt, haptic } from '../../components/ui';
import { fonts, radius, space, useColors, makeStyles } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { timeAgo } from '../../lib/format';
import { checkPostText } from '../../lib/moderation';
import type { StringKey } from '../../lib/i18n';
import type { PostResult } from '../../lib/types';

const ERR: Record<Extract<PostResult<unknown>, { ok: false }>['reason'], StringKey> = {
  contact: 'errContact', link: 'errLink', abuse: 'errAbuse', scam: 'errScam', too_short: 'errShort', too_long: 'errLong', rate: 'errRate', network: 'errNetwork',
};

export default function QuestionScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, api, locale, rtl, touch } = useApp();
  const data = useLoad((a) => a.getQuestion(String(id)));
  const [report, setReport] = useState<ReportTarget>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const q = data.data?.question;
  const answers = data.data?.answers ?? [];
  const live = text.length > 0 ? checkPostText(text, 1, 5000) : null;
  const liveErr = live && live !== 'too_short' ? ERR[live] : null;

  const post = async () => {
    if (!q) return;
    setBusy(true);
    const r = await api.answer(q.id, text).catch((): PostResult<never> => ({ ok: false, reason: 'network' }));
    setBusy(false);
    if (!r.ok) {
      haptic.error();
      setError(ERR[r.reason]);
      return;
    }
    haptic.success();
    setText('');
    setError(null);
    data.reload();
    touch();
  };

  const vote = async (kind: 'question' | 'answer', targetId: string, v: -1 | 0 | 1) => {
    await api.vote(kind, targetId, v).catch(() => {});
    data.reload();
  };

  if (data.loading && !data.data) return <Screen><BackHeader /><Loader /></Screen>;
  if (!q) return <Screen><BackHeader /><Txt v="small" center>—</Txt></Screen>;

  return (
    <Screen>
      <BackHeader
        right={
          !q.isMine ? (
            <Pressable onPress={() => setReport({ kind: 'question', id: q.id })} hitSlop={10} accessibilityLabel={t('report')}>
              <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
            </Pressable>
          ) : undefined
        }
      />
      <DisciplineTag discipline={q.discipline} />
      <Txt v="title" auto style={{ marginTop: space.sm, fontSize: 22, lineHeight: 30 }}>
        {q.title}
      </Txt>
      <View style={{ marginTop: space.md }}>
        <AuthorLine author={q.author} time={timeAgo(q.createdAt, locale)} />
      </View>
      <Txt auto style={{ marginTop: space.md }}>
        {q.body}
      </Txt>
      {q.imageUrl ? <Image source={{ uri: q.imageUrl }} style={styles.image} resizeMode="cover" accessibilityLabel="Attached photo" /> : null}
      <Row style={{ marginTop: space.md }}>
        <VoteBox horizontal score={q.score} myVote={q.myVote} disabled={q.isMine} onVote={(v) => vote('question', q.id, v)} />
      </Row>

      <Txt v="label" style={{ marginTop: space.xl, marginBottom: space.sm }}>
        {answers.length === 1 ? t('oneAnswer') : answers.length === 0 ? t('noAnswers') : t('answers', { n: answers.length })}
      </Txt>
      {answers.map((a) => (
        <Card key={a.id} style={[{ marginBottom: space.sm }, a.accepted && styles.accepted]}>
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <VoteBox score={a.score} myVote={a.myVote} disabled={a.isMine} onVote={(v) => vote('answer', a.id, v)} />
            <View style={{ flex: 1 }}>
              {a.accepted ? (
                <Row gap={6} style={{ marginBottom: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.good} />
                  <Txt v="label" color={colors.good}>
                    {t('accepted')}
                  </Txt>
                </Row>
              ) : null}
              <Txt auto>{a.body}</Txt>
              <Row style={{ marginTop: space.md, justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <AuthorLine author={a.author} time={timeAgo(a.createdAt, locale)} />
                </View>
                {!a.isMine ? (
                  <Pressable onPress={() => setReport({ kind: 'answer', id: a.id })} hitSlop={10} accessibilityLabel={t('report')}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textFaint} />
                  </Pressable>
                ) : null}
              </Row>
              {q.isMine && !a.accepted && !a.isMine ? (
                <Pressable
                  onPress={async () => {
                    haptic.success();
                    await api.accept(a.id).catch(() => {});
                    data.reload();
                  }}
                  style={styles.acceptBtn}
                  accessibilityRole="button"
                >
                  <Row gap={6}>
                    <Ionicons name="checkmark" size={15} color={colors.good} />
                    <Txt v="small" color={colors.good}>
                      {t('acceptAnswer')}
                    </Txt>
                  </Row>
                </Pressable>
              ) : null}
            </View>
          </Row>
        </Card>
      ))}

      <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        {t('yourAnswer')}
      </Txt>
      <TextInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          setError(null);
        }}
        multiline
        placeholder={t('answerPlaceholder')}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { textAlign: rtl ? 'right' : 'left', fontFamily: rtl ? fonts.arabic : fonts.sans }]}
        textAlignVertical="top"
        accessibilityLabel={t('yourAnswer')}
      />
      <Txt v="small" style={{ marginTop: 6, color: error || liveErr ? colors.bad : colors.textFaint, fontSize: 12 }}>
        {error ? t(error) : liveErr ? t(liveErr) : t('rules')}
      </Txt>
      <Button label={t('postAnswer')} onPress={post} loading={busy} disabled={text.trim().length < 15 || !!liveErr} style={{ marginTop: space.md }} />

      <ReportSheet target={report} onClose={() => setReport(null)} onDone={() => data.reload()} />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, marginTop: space.md, backgroundColor: colors.surfaceRaised },
  accepted: { borderColor: colors.goodLine },
  acceptBtn: { marginTop: space.sm, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(74,222,128,0.5)' },
  input: { minHeight: 120, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, padding: space.md, fontSize: 15, backgroundColor: colors.field },
}));

import { router, useLocalSearchParams } from 'expo-router';
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
import type { ModAction, PostResult } from '../../lib/types';
import { Badge, modErrKey } from '../../components/Campus';

const ERR: Record<Extract<PostResult<unknown>, { ok: false }>['reason'], StringKey> = {
  contact: 'errContact', link: 'errLink', abuse: 'errAbuse', scam: 'errScam', too_short: 'errShort', too_long: 'errLong', rate: 'errRate', network: 'errNetwork',
  suspended: 'errSuspended', not_member: 'errNotMember', not_mentor: 'errNotMentor', invalid: 'errInvalidPost',
};

export default function QuestionScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, api, locale, rtl, touch } = useApp();
  const data = useLoad((a) => a.getQuestion(String(id)));
  const staff = useLoad((a) => a.myStaff().catch(() => null));
  const [modErr, setModErr] = useState<StringKey | null>(null);
  const modAct = async (kind: 'question' | 'answer', targetId: string, action: ModAction) => {
    setModErr(null);
    try {
      await api.modAct(kind, targetId, action);
      haptic.success();
      if (kind === 'question' && action === 'delete') {
        touch();
        return;
      }
      data.reload();
      touch();
    } catch (e) {
      haptic.error();
      setModErr(modErrKey(e));
    }
  };
  const [report, setReport] = useState<ReportTarget>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const q = data.data?.question;
  const answers = data.data?.answers ?? [];
  // university moderators act only inside their own community; the server checks it again
  const canMod = !!staff.data && !!q && (staff.data.role !== 'uni_moderator' || (!!q.university && q.university.id === staff.data.universityId));
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
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <DisciplineTag discipline={q.discipline} />
        {q.pinned ? <Badge label={t('pinned')} icon="pin" color={colors.accent} /> : null}
        {q.hidden ? <Badge label={t('badgeHidden')} color={colors.bad} /> : null}
        {q.category === 'graduation' ? <Badge label={t('badgeGraduation')} icon="ribbon-outline" color={colors.warn} /> : null}
        {q.mentorHandle ? <Badge label={t('toMentor', { handle: q.mentorHandle })} icon="person-outline" /> : null}
        {q.university ? <Badge label={q.university.name} icon="school-outline" color={colors.good} /> : null}
      </Row>
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
      {canMod ? (
        <Card style={{ marginTop: space.md }}>
          <Txt v="label" style={{ marginBottom: 6 }}>
            {t('moderation')}
          </Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {q.university ? <Button label={t(q.pinned ? 'actUnpin' : 'actPin')} variant="outline" onPress={() => modAct('question', q.id, q.pinned ? 'unpin' : 'pin')} style={{ flexGrow: 1 }} /> : null}
            <Button label={t(q.hidden ? 'actRestore' : 'actHide')} variant="outline" onPress={() => modAct('question', q.id, q.hidden ? 'restore' : 'hide')} style={{ flexGrow: 1 }} />
            <Button
              label={t('actDelete')}
              variant="ghost"
              onPress={async () => {
                await modAct('question', q.id, 'delete');
                router.back();
              }}
              style={{ flexGrow: 1 }}
            />
          </Row>
          {modErr ? <Txt v="small" style={{ marginTop: 6, color: colors.bad }}>{t(modErr)}</Txt> : null}
        </Card>
      ) : null}

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
                {canMod ? (
                  <Pressable onPress={() => modAct('answer', a.id, 'delete')} hitSlop={10} accessibilityLabel={t('actDelete')} style={{ marginHorizontal: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.bad} />
                  </Pressable>
                ) : null}
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

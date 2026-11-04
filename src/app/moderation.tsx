// In-app moderation for the owner, moderators and university moderators. Every action is checked again on the
// server and written to the activity log.
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { Badge, EmptyCard, Field, modErrKey } from '../components/Campus';
import { Sheet } from '../components/Sheet';
import { Button, Card, Chip, Divider, Loader, Row, Screen, Txt, haptic } from '../components/ui';
import { space, useColors } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { timeAgo } from '../lib/format';
import type { StringKey } from '../lib/i18n';
import type { ModAction, ModItem, ModUser, SanctionKind, StaffRole } from '../lib/types';

type Tab = 'queue' | 'users' | 'team' | 'log';
const KIND_KEY: Record<ModItem['kind'], StringKey> = { question: 'kindQuestion', answer: 'kindAnswer', opportunity: 'kindOpportunity', university: 'kindUniversity' };
const ACT_KEY: Record<ModAction, StringKey> = { hide: 'actHide', restore: 'actRestore', delete: 'actDelete', approve: 'actApprove', reject: 'actReject', pin: 'actPin', unpin: 'actUnpin' };
const roleKey = (r: StaffRole): StringKey => (r === 'owner' ? 'roleOwner' : r === 'moderator' ? 'roleModerator' : 'roleUniModerator');

export default function ModerationScreen() {
  const { t } = useApp();
  const staff = useLoad((a) => a.myStaff());
  const [tab, setTab] = useState<Tab>('queue');
  if (staff.loading && !staff.data) return <Screen><BackHeader title={t('moderation')} /><Loader /></Screen>;
  if (!staff.data) return <Screen><BackHeader title={t('moderation')} /><EmptyCard text={t('errForbidden')} /></Screen>;
  const me = staff.data;
  return (
    <Screen>
      <BackHeader title={t('moderation')} right={<Badge label={t(roleKey(me.role)) + (me.universityName ? ` · ${me.universityName}` : '')} />} />
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: space.md }}>
        {(['queue', 'users', 'team', 'log'] as Tab[]).map((k) => (
          <Chip key={k} small label={t(k === 'queue' ? 'tabQueue' : k === 'users' ? 'tabUsers' : k === 'team' ? 'tabTeam' : 'tabLog')} active={tab === k} onPress={() => setTab(k)} />
        ))}
      </Row>
      {me.role === 'uni_moderator' ? (
        <Txt v="small" style={{ marginBottom: space.md }}>
          {t('uniModLimits')}
        </Txt>
      ) : null}
      {tab === 'queue' ? <Queue /> : tab === 'users' ? <Users isOwner={me.role === 'owner'} /> : tab === 'team' ? <Team isOwner={me.role === 'owner'} /> : <Log />}
    </Screen>
  );
}

function Queue() {
  const colors = useColors();
  const { t, api, locale } = useApp();
  const q = useLoad((a) => a.modQueue());
  const [err, setErr] = useState<StringKey | null>(null);
  const [confirm, setConfirm] = useState<ModItem | null>(null);
  const [note, setNote] = useState('');

  const act = async (item: ModItem, action: ModAction, n?: string) => {
    setErr(null);
    try {
      await api.modAct(item.kind, item.id, action, n);
      haptic.success();
      q.reload();
    } catch (e) {
      haptic.error();
      setErr(modErrKey(e));
    }
  };

  const actionsFor = (i: ModItem): ModAction[] =>
    i.kind === 'university' ? ['approve', 'reject'] : i.kind === 'opportunity' ? (i.pending ? ['approve', 'reject'] : i.hidden ? ['restore'] : ['hide']) : i.hidden ? ['restore'] : ['hide'];

  if (q.loading && !q.data) return <Loader />;
  if (q.error) return <EmptyCard text={t(modErrKey(q.error))} />;
  return (
    <View>
      {err ? <Txt v="small" style={{ color: colors.bad, marginBottom: space.sm }}>{t(err)}</Txt> : null}
      {!q.data?.length ? <EmptyCard text={t('queueEmpty')} /> : null}
      {(q.data ?? []).map((i) => (
        <Card key={`${i.kind}:${i.id}`} style={{ marginBottom: space.sm }}>
          <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: 6 }}>
            <Badge label={t(KIND_KEY[i.kind])} color={i.pending ? colors.warn : colors.cyan} />
            {i.reportCount ? <Badge label={t('reportsN', { n: i.reportCount })} color={colors.bad} /> : null}
            {i.hidden ? <Badge label={t('badgeHidden')} color={colors.textMuted} /> : null}
          </Row>
          <Txt v="heading" auto style={{ fontSize: 15 }}>
            {i.text}
          </Txt>
          {i.detail && i.detail !== i.text ? (
            <Txt v="small" auto numberOfLines={4} style={{ marginTop: 4 }}>
              {i.detail}
            </Txt>
          ) : null}
          <Txt v="small" style={{ marginTop: 6, fontSize: 12, writingDirection: 'ltr' }}>
            {i.author ? `@${i.author} · ` : ''}
            {timeAgo(i.createdAt, locale)}
            {i.reasons ? ` · ${i.reasons}` : ''}
          </Txt>
          <Row gap={8} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
            {actionsFor(i).map((a) => (
              <Button key={a} label={t(ACT_KEY[a])} variant={a === 'approve' || a === 'restore' ? 'solid' : 'outline'} onPress={() => act(i, a)} style={{ flexGrow: 1 }} />
            ))}
            {i.kind !== 'university' ? <Button label={t('actDelete')} variant="ghost" onPress={() => (setNote(''), setConfirm(i))} style={{ flexGrow: 1 }} /> : null}
            {i.kind === 'question' ? <Button label={t('openPost')} variant="ghost" onPress={() => router.push(`/question/${i.id}`)} style={{ flexGrow: 1 }} /> : null}
          </Row>
        </Card>
      ))}
      <Sheet visible={!!confirm} onClose={() => setConfirm(null)} title={t('actDelete')}>
        <Txt v="small" center style={{ marginBottom: space.md }}>
          {t('confirmDelete')}
        </Txt>
        <Field label={t('modNote')} value={note} onChangeText={setNote} maxLength={300} />
        <Button
          label={t('confirm')}
          onPress={() => {
            const c = confirm!;
            setConfirm(null);
            act(c, 'delete', note.trim() || undefined);
          }}
          style={{ marginTop: space.md, backgroundColor: colors.bad }}
        />
        <Button label={t('cancel')} variant="ghost" onPress={() => setConfirm(null)} style={{ marginTop: space.sm }} />
      </Sheet>
    </View>
  );
}

function Users({ isOwner }: { isOwner: boolean }) {
  const colors = useColors();
  const { t, api, locale, disc, roleName } = useApp();
  const [handle, setHandle] = useState('');
  const [user, setUser] = useState<ModUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ key: StringKey; bad?: boolean } | null>(null);
  const [kind, setKind] = useState<SanctionKind>('warn');
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('');

  const find = async (h = handle) => {
    if (!h.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const u = await api.modUser(h.trim().replace(/^@/, ''));
      setUser(u);
      if (!u) setMsg({ key: 'errNotFound', bad: true });
    } catch (e) {
      setMsg({ key: modErrKey(e), bad: true });
    }
    setBusy(false);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      haptic.success();
      setMsg({ key: 'done' });
      setReason('');
      if (user) await find(user.handle);
    } catch (e) {
      haptic.error();
      setMsg({ key: modErrKey(e), bad: true });
    }
    setBusy(false);
  };

  return (
    <View>
      <Field label={t('findUser')} value={handle} onChangeText={setHandle} placeholder="@username" ltr right={<Button label={t('find')} onPress={() => find()} loading={busy && !user} style={{ paddingHorizontal: space.md }} />} />
      {msg ? <Txt v="small" style={{ marginTop: space.sm, color: msg.bad ? colors.bad : colors.good }}>{t(msg.key)}</Txt> : null}
      {user ? (
        <Card style={{ marginTop: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="heading" style={{ writingDirection: 'ltr' }}>@{user.handle}</Txt>
            <Badge label={user.canPost ? t('canPost') : t('cannotPost')} color={user.canPost ? colors.good : colors.bad} />
          </Row>
          <Txt v="small" style={{ marginTop: 4 }}>
            {disc(user.discipline)} · {roleName(user.role)} · {user.country} · {t('joinedOn', { date: user.joined.slice(0, 10) })}
          </Txt>
          {user.universityName ? <Txt v="small">{user.universityName}</Txt> : null}
          {user.staffRole ? <Badge label={t(roleKey(user.staffRole))} color={colors.accent} /> : null}
          <Txt v="small" style={{ marginTop: 6 }}>
            {t('questionsCount')}: {user.questions} · {t('answersCount')}: {user.answers} · {t('reportsAgainst', { n: user.reportsAgainst })}
          </Txt>

          <Divider />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {(['warn', 'suspend', 'ban'] as SanctionKind[]).map((k) => (
              <Chip key={k} small label={t(k)} active={kind === k} onPress={() => setKind(k)} />
            ))}
          </Row>
          {kind === 'suspend' ? (
            <>
              <Txt v="label" style={{ marginTop: space.sm, marginBottom: 6 }}>
                {t('daysLabel')}
              </Txt>
              <Row gap={8}>
                {[1, 3, 7, 30].map((d) => (
                  <Chip key={d} small label={String(d)} active={days === d} onPress={() => setDays(d)} />
                ))}
              </Row>
            </>
          ) : null}
          <Field label={t('reasonLabel')} value={reason} onChangeText={setReason} maxLength={300} />
          <Button
            label={t(kind)}
            onPress={() => run(() => api.modSanction(user.handle, kind, kind === 'suspend' ? days : null, reason.trim()))}
            disabled={reason.trim().length < 3}
            loading={busy}
            style={{ marginTop: space.md, backgroundColor: kind === 'ban' ? colors.bad : undefined }}
          />
          {!user.canPost ? <Button label={t('lift')} variant="outline" onPress={() => run(() => api.modLift(user.handle))} style={{ marginTop: space.sm }} /> : null}

          {isOwner ? (
            <>
              <Divider />
              <Button label={t('grantModerator')} variant="outline" onPress={() => run(() => api.grantRole(user.handle, 'moderator', null))} />
              {user.universityId ? (
                <Button
                  label={`${t('grantUniModerator')} · ${user.universityName}`}
                  variant="outline"
                  onPress={() => run(() => api.grantRole(user.handle, 'uni_moderator', user.universityId))}
                  style={{ marginTop: space.sm }}
                />
              ) : null}
              {user.staffRole && user.staffRole !== 'owner' ? (
                <Button label={t('revokeRole')} variant="ghost" onPress={() => run(() => api.revokeRole(user.handle))} style={{ marginTop: space.sm }} />
              ) : null}
            </>
          ) : null}

          {user.sanctions.length ? (
            <>
              <Divider />
              <Txt v="label" style={{ marginBottom: 6 }}>
                {t('historyLabel')}
              </Txt>
              {user.sanctions.map((s, k) => (
                <Txt key={k} v="small" style={{ marginBottom: 4 }}>
                  {t(s.kind)} · {s.reason}
                  {s.until ? ` · ${t('untilDate', { date: s.until.slice(0, 10) })}` : ''}
                  {s.lifted ? ` · ${t('liftedLabel')}` : ''} · {timeAgo(s.createdAt, locale)}
                  {s.by ? ` · @${s.by}` : ''}
                </Txt>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

function Team({ isOwner }: { isOwner: boolean }) {
  const colors = useColors();
  const { t, api } = useApp();
  const list = useLoad((a) => a.listStaff());
  const [err, setErr] = useState<StringKey | null>(null);
  if (list.loading && !list.data) return <Loader />;
  if (list.error) return <EmptyCard text={t(modErrKey(list.error))} />;
  return (
    <View>
      {!isOwner ? <Txt v="small" style={{ marginBottom: space.sm }}>{t('ownerOnly')}</Txt> : null}
      {err ? <Txt v="small" style={{ color: colors.bad, marginBottom: space.sm }}>{t(err)}</Txt> : null}
      {(list.data ?? []).map((m) => (
        <Card key={m.handle} style={{ marginBottom: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt v="heading" style={{ fontSize: 15, writingDirection: 'ltr' }}>@{m.handle}</Txt>
              <Txt v="small">
                {t(roleKey(m.role))}
                {m.universityName ? ` · ${m.universityName}` : ''}
                {m.grantedBy ? ` · @${m.grantedBy}` : ''}
              </Txt>
            </View>
            {isOwner && m.role !== 'owner' ? (
              <Button
                label={t('revokeRole')}
                variant="ghost"
                onPress={async () => {
                  setErr(null);
                  try {
                    await api.revokeRole(m.handle);
                    list.reload();
                  } catch (e) {
                    setErr(modErrKey(e));
                  }
                }}
              />
            ) : null}
          </Row>
        </Card>
      ))}
    </View>
  );
}

function Log() {
  const { t, locale } = useApp();
  const log = useLoad((a) => a.modLog());
  if (log.loading && !log.data) return <Loader />;
  if (log.error) return <EmptyCard text={t(modErrKey(log.error))} />;
  if (!log.data?.length) return <EmptyCard text={t('queueEmpty')} />;
  return (
    <Card>
      {log.data.map((e, k) => (
        <View key={k} style={{ paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: 'rgba(128,128,128,0.15)' }}>
          <Txt style={{ fontSize: 14, writingDirection: 'ltr' }}>
            @{e.actor} · {e.action} · {e.targetKind}
          </Txt>
          <Txt v="small" style={{ fontSize: 12, writingDirection: 'ltr' }}>
            {e.targetId.length > 20 ? `${e.targetId.slice(0, 8)}…` : e.targetId}
            {e.detail ? ` · ${e.detail}` : ''} · {timeAgo(e.createdAt, locale)}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

// Shows a user their warnings and suspensions from the moderators.
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Button, Card, Row, Txt } from './ui';
import { space, useColors } from '../theme';
import { useApp, useLoad } from '../lib/store';

export function NoticeBanner() {
  const colors = useColors();
  const { t, api } = useApp();
  const notices = useLoad((a) => a.myNotices().catch(() => []));
  const list = notices.data ?? [];
  if (!list.length) return null;
  const active = list.find((n) => n.kind !== 'warn');
  return (
    <Card style={{ marginTop: space.md, borderColor: colors.bad }}>
      {list.map((n) => (
        <View key={n.id} style={{ marginBottom: space.sm }}>
          <Row gap={8}>
            <Ionicons name={n.kind === 'warn' ? 'warning-outline' : 'ban-outline'} size={18} color={n.kind === 'warn' ? colors.warn : colors.bad} />
            <Txt v="heading" style={{ flex: 1, fontSize: 15 }}>
              {n.kind === 'warn' ? t('noticeWarn') : n.kind === 'suspend' ? t('noticeSuspend', { date: (n.until ?? '').slice(0, 10) }) : t('noticeBan')}
            </Txt>
          </Row>
          <Txt v="small" auto style={{ marginTop: 4 }}>
            {t('noticeReason', { reason: n.reason })}
          </Txt>
        </View>
      ))}
      {!active ? (
        <Button
          label={t('gotIt')}
          variant="outline"
          onPress={async () => {
            await api.ackNotices().catch(() => {});
            notices.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

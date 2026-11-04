import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from './Sheet';
import { Txt, haptic } from './ui';
import { space, useColors, makeStyles } from '../theme';
import { useApp } from '../lib/store';
import type { ReportKind, ReportReason } from '../lib/types';
import type { StringKey } from '../lib/i18n';

const REASONS: { r: ReportReason; k: StringKey }[] = [
  { r: 'wrong', k: 'reportWrong' },
  { r: 'spam', k: 'reportSpam' },
  { r: 'offensive', k: 'reportOffensive' },
  { r: 'personal_info', k: 'reportPersonal' },
  { r: 'other', k: 'reportOther' },
];

export type ReportTarget = { kind: ReportKind; id: string } | null;

export function ReportSheet({ target, onClose, onDone }: { target: ReportTarget; onClose: () => void; onDone?: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  const { t, api, touch } = useApp();
  const [sent, setSent] = useState<null | 'reported' | 'blocked'>(null);

  const finish = (what: 'reported' | 'blocked') => {
    setSent(what);
    setTimeout(() => {
      setSent(null);
      onClose();
      touch();
      onDone?.();
    }, 1300);
  };

  return (
    <Sheet visible={!!target} onClose={onClose} title={t('reportTitle')}>
      {sent ? (
        <Txt center style={{ paddingVertical: space.xl }}>
          {sent === 'blocked' ? t('blocked') : t('reported')}
        </Txt>
      ) : (
        <View>
          {REASONS.map(({ r, k }) => (
            <Pressable
              key={r}
              style={styles.row}
              accessibilityRole="button"
              onPress={async () => {
                if (!target) return;
                haptic.medium();
                await api.report(target.kind, target.id, r).catch(() => {});
                finish('reported');
              }}
            >
              <Txt>{t(k)}</Txt>
            </Pressable>
          ))}
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            accessibilityRole="button"
            onPress={async () => {
              if (!target) return;
              haptic.medium();
              await api.block(target.kind, target.id).catch(() => {});
              finish('blocked');
            }}
          >
            <Txt color={colors.bad}>{t('block')}</Txt>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
}));

// Small building blocks shared by the Campus and moderation screens.
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Card, PressableScale, Row, Txt } from './ui';
import { fonts, radius, space, useColors, makeStyles } from '../theme';
import { useApp } from '../lib/store';
import type { StringKey } from '../lib/i18n';
import type { ModError } from '../data/api';
import type { PostResult } from '../lib/types';

type IconName = keyof typeof Ionicons.glyphMap;

export const POST_ERR: Record<Extract<PostResult<unknown>, { ok: false }>['reason'], StringKey> = {
  contact: 'errContact', link: 'errLink', abuse: 'errAbuse', scam: 'errScam', too_short: 'errShort', too_long: 'errLong', rate: 'errRate', network: 'errNetwork',
  suspended: 'errSuspended', not_member: 'errNotMember', not_mentor: 'errNotMentor', invalid: 'errInvalidPost',
};

export const MOD_ERR: Record<ModError, StringKey> = {
  forbidden: 'errForbidden', not_found: 'errNotFound', invalid: 'errInvalid', suspended: 'errSuspendedUser', network: 'errNetwork',
};
export const modErrKey = (e: unknown): StringKey => MOD_ERR[((e as Error)?.message as ModError) in MOD_ERR ? ((e as Error).message as ModError) : 'network'];

/** A tappable card with an icon, a title and a line of text. */
export function MenuCard({ icon, title, sub, onPress, badge, tint }: { icon: IconName; title: string; sub?: string; onPress: () => void; badge?: string | number; tint?: string }) {
  const colors = useColors();
  const styles = useStyles();
  const { rtl } = useApp();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={title} style={{ marginBottom: space.sm }}>
      <Card>
        <Row gap={space.md}>
          <View style={[styles.icon, { backgroundColor: tint ? `${tint}22` : colors.accentSoft }]}>
            <Ionicons name={icon} size={20} color={tint ?? colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="heading" style={{ fontSize: 16 }}>
              {title}
            </Txt>
            {sub ? (
              <Txt v="small" style={{ marginTop: 2 }}>
                {sub}
              </Txt>
            ) : null}
          </View>
          {badge !== undefined && badge !== 0 ? (
            <View style={styles.badge}>
              <Txt style={{ color: colors.onAccent, fontFamily: fonts.monoSemi, fontSize: 12 }}>{badge}</Txt>
            </View>
          ) : null}
          <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textFaint} />
        </Row>
      </Card>
    </PressableScale>
  );
}

/** Labelled text input in the app's style. */
export function Field({ label, value, onChangeText, placeholder, multiline, maxLength, keyboardType, ltr, right }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; maxLength?: number;
  keyboardType?: KeyboardTypeOptions; ltr?: boolean; right?: ReactNode;
}) {
  const colors = useColors();
  const styles = useStyles();
  const { rtl } = useApp();
  const dirRtl = rtl && !ltr;
  return (
    <View style={{ marginTop: space.md }}>
      <Txt v="label" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <Row gap={8}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={ltr ? 'none' : 'sentences'}
          autoCorrect={!ltr}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label}
          style={[styles.input, multiline && styles.area, { flex: 1, textAlign: dirRtl ? 'right' : 'left', fontFamily: dirRtl ? fonts.arabic : fonts.sans, writingDirection: ltr ? 'ltr' : undefined }]}
        />
        {right}
      </Row>
    </View>
  );
}

export function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <Txt v="small" center>
        {text}
      </Txt>
    </Card>
  );
}

/** Small coloured label, e.g. "Pinned" or "Graduation project". */
export function Badge({ label, color, icon }: { label: string; color?: string; icon?: IconName }) {
  const colors = useColors();
  const c = color ?? colors.cyan;
  return (
    <Row gap={4} style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: `${c}88`, backgroundColor: `${c}14` }}>
      {icon ? <Ionicons name={icon} size={12} color={c} /> : null}
      <Txt style={{ fontSize: 11.5, lineHeight: 16, color: c, fontFamily: fonts.sansMedium }}>{label}</Txt>
    </Row>
  );
}

const useStyles = makeStyles((colors) => ({
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: space.md, paddingVertical: 11, fontSize: 15, backgroundColor: colors.field },
  area: { minHeight: 120, lineHeight: 22 },
}));

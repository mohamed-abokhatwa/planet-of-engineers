import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Row, Txt, haptic } from './ui';
import { fonts, radius, useColors, makeStyles, useTheme } from '../theme';
import { useApp } from '../lib/store';
import { levelFor } from '../lib/i18n';
import { flag } from '../lib/countries';
import type { Author, Discipline } from '../lib/types';
import { initials } from '../lib/handle';

export { initials };

/** Each discipline gets its own drafting colour, used on avatars and tags. */
export const DISC_COLOR: Record<Discipline, string> = {
  civil: '#FF9F43',
  structural: '#FF6B6B',
  mechanical: '#5CC8FF',
  electrical: '#FBBF24',
  chemical: '#4ADE80',
  architecture: '#C084FC',
  software: '#38BDF8',
  industrial: '#94A3B8',
  petroleum: '#F472B6',
  general: '#A3B1C6',
};
/** Deeper versions that stay readable on the light theme. */
const DISC_COLOR_LIGHT: Record<Discipline, string> = {
  civil: '#C2410C',
  structural: '#DC2626',
  mechanical: '#0369A1',
  electrical: '#A16207',
  chemical: '#15803D',
  architecture: '#7E22CE',
  software: '#0284C7',
  industrial: '#475569',
  petroleum: '#BE185D',
  general: '#52627A',
};
export const useDiscColors = () => (useTheme().name === 'light' ? DISC_COLOR_LIGHT : DISC_COLOR);

export function Avatar({ handle, discipline, size = 36 }: { handle: string; discipline: Discipline; size?: number }) {
  const styles = useStyles();
  const c = useDiscColors()[discipline];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 3.2, borderColor: c, backgroundColor: `${c}22` }]}>
      <Txt style={{ fontFamily: fonts.monoSemi, fontSize: size * 0.38, lineHeight: size * 0.5, color: c, textAlign: 'center' }}>{initials(handle)}</Txt>
    </View>
  );
}

export function LevelBadge({ reputation }: { reputation: number }) {
  const colors = useColors();
  const styles = useStyles();
  const { locale } = useApp();
  const { level, index } = levelFor(reputation);
  const color = index >= 4 ? colors.accent : index >= 2 ? colors.cyan : colors.textMuted;
  return (
    <View style={[styles.badge, { borderColor: `${color}66` }]}>
      <Txt style={{ fontFamily: locale === 'ar' ? fonts.arabicMedium : fonts.mono, fontSize: 10.5, lineHeight: 15, color }}>{level[locale]}</Txt>
    </View>
  );
}

export function AuthorLine({ author, time }: { author: Author; time?: string }) {
  const { disc } = useApp();
  return (
    <Row gap={10}>
      <Avatar handle={author.handle} discipline={author.discipline} size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Row gap={6}>
          <Txt numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 13.5, flexShrink: 1, writingDirection: 'ltr' }}>
            @{author.handle}
          </Txt>
          <LevelBadge reputation={author.reputation} />
        </Row>
        <Txt v="small" numberOfLines={1} style={{ fontSize: 12 }}>
          {flag(author.country)} {disc(author.discipline)}
          {time ? ` · ${time}` : ''}
        </Txt>
      </View>
    </Row>
  );
}

/** Up/down votes; your own posts can't be voted on. */
export function VoteBox({ score, myVote, disabled, onVote, horizontal }: { score: number; myVote: -1 | 0 | 1; disabled?: boolean; onVote: (v: -1 | 0 | 1) => void; horizontal?: boolean }) {
  const colors = useColors();
  const styles = useStyles();
  const press = (v: -1 | 1) => {
    if (disabled) return;
    haptic.select();
    onVote(myVote === v ? 0 : v);
  };
  return (
    <View style={[styles.vote, horizontal && { flexDirection: 'row', gap: 10 }]}>
      <Pressable onPress={() => press(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Upvote" disabled={disabled}>
        <Ionicons name={myVote === 1 ? 'caret-up' : 'caret-up-outline'} size={24} color={myVote === 1 ? colors.accent : disabled ? colors.textFaint : colors.textMuted} />
      </Pressable>
      <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 15, lineHeight: 20, textAlign: 'center', minWidth: 28 }}>{score}</Txt>
      <Pressable onPress={() => press(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Downvote" disabled={disabled}>
        <Ionicons name={myVote === -1 ? 'caret-down' : 'caret-down-outline'} size={24} color={myVote === -1 ? colors.cyan : disabled ? colors.textFaint : colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function DisciplineTag({ discipline }: { discipline: Discipline }) {
  const styles = useStyles();
  const { disc, rtl } = useApp();
  const c = useDiscColors()[discipline];
  return (
    <View style={[styles.tag, { backgroundColor: `${c}1F` }]}>
      <Txt style={{ fontFamily: rtl ? fonts.arabicMedium : fonts.mono, fontSize: 11, lineHeight: 15, color: c }}>{disc(discipline)}</Txt>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm, borderWidth: 1 },
  vote: { alignItems: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, alignSelf: 'flex-start' },
}));

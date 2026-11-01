import * as Haptics from 'expo-haptics';
import { memo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, column, fonts, radius, space } from '../theme';
import { useApp } from '../lib/store';

export const haptic = {
  light: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  select: () => Platform.OS !== 'web' && Haptics.selectionAsync().catch(() => {}),
};

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label' | 'number' | 'mono';

const latin: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.sansBold, fontSize: 32, lineHeight: 38, color: colors.text, letterSpacing: -0.5 },
  title: { fontFamily: fonts.sansSemi, fontSize: 26, lineHeight: 32, color: colors.text, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.sansSemi, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 24, color: colors.text },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  label: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.cyan },
  number: { fontFamily: fonts.monoSemi, fontSize: 28, lineHeight: 34, color: colors.text, letterSpacing: -0.5 },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: colors.textMuted },
};

// Arabic: IBM Plex Sans Arabic, no letter-spacing (it breaks joined letters), more line height.
const arabic: Partial<Record<Variant, TextStyle>> = {
  display: { fontFamily: fonts.arabicBold, fontSize: 30, lineHeight: 44, letterSpacing: 0 },
  title: { fontFamily: fonts.arabicBold, fontSize: 24, lineHeight: 38, letterSpacing: 0 },
  heading: { fontFamily: fonts.arabicBold, fontSize: 17, lineHeight: 28 },
  body: { fontFamily: fonts.arabic, fontSize: 15.5, lineHeight: 27 },
  small: { fontFamily: fonts.arabic, fontSize: 13, lineHeight: 22 },
  label: { fontFamily: fonts.arabicMedium, fontSize: 12, lineHeight: 18, letterSpacing: 0, textTransform: 'none' },
};

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const STRONG = /[A-Za-zÀ-ɏ؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** Direction of user-written text, from its first letter (an English post in the Arabic app stays left-to-right). */
export function textDirection(text: string): 'rtl' | 'ltr' {
  const m = text.match(STRONG);
  return m && ARABIC_SCRIPT.test(m[0]) ? 'rtl' : 'ltr';
}

export const Txt = memo(function Txt({
  v = 'body',
  style,
  center,
  color,
  auto,
  ...rest
}: TextProps & { v?: Variant; center?: boolean; color?: string; auto?: boolean }) {
  const { rtl } = useApp();
  let dirRtl = rtl;
  if (auto && typeof rest.children === 'string') dirRtl = textDirection(rest.children) === 'rtl';
  const useArabic = (auto ? dirRtl : rtl) && v !== 'number' && v !== 'mono';
  return (
    <RNText
      {...rest}
      style={[
        latin[v],
        useArabic && arabic[v],
        { writingDirection: dirRtl ? 'rtl' : 'ltr', textAlign: center ? 'center' : dirRtl ? 'right' : 'left' },
        color ? { color } : null,
        style,
      ]}
    />
  );
});

/** Faint drafting grid, like blueprint paper. */
export const BlueprintGrid = memo(function BlueprintGrid() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="minor" width="20" height="20" patternUnits="userSpaceOnUse">
          <Path d="M20 0H0V20" fill="none" stroke={colors.grid} strokeWidth="1" />
        </Pattern>
        <Pattern id="major" width="100" height="100" patternUnits="userSpaceOnUse">
          <Rect width="100" height="100" fill="url(#minor)" />
          <Path d="M100 0H0V100" fill="none" stroke={colors.gridMajor} strokeWidth="1" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#major)" />
    </Svg>
  );
});

export function Screen({
  children,
  scroll = true,
  contentStyle,
  bottomPad = 120,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bottomPad?: number;
}) {
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + bottomPad, paddingHorizontal: space.md + 4 };
  return (
    <View style={styles.fill}>
      <BlueprintGrid />
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, column, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad, column, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  return <View style={[styles.card, accent && styles.cardAccent, style]}>{children}</View>;
}

export function PressableScale({
  children,
  onPress,
  style,
  containerStyle,
  disabled,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 5 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={containerStyle}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
    >
      <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.45 }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  style,
  variant = 'solid',
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'solid' | 'outline' | 'ghost';
  icon?: ReactNode;
}) {
  const { rtl } = useApp();
  const color = variant === 'solid' ? colors.bgDeep : colors.accent;
  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} style={style} accessibilityLabel={label}>
      <View style={[styles.btn, variant === 'solid' && styles.btnSolid, variant === 'outline' && styles.btnOutline, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {loading ? (
          <ActivityIndicator color={color} />
        ) : (
          <>
            {icon}
            <RNText numberOfLines={1} style={{ fontFamily: rtl ? fonts.arabicBold : fonts.sansSemi, fontSize: 15, color, textAlign: 'center' }}>
              {label}
            </RNText>
          </>
        )}
      </View>
    </PressableScale>
  );
}

export function Chip({ label, active, onPress, small }: { label: string; active?: boolean; onPress: () => void; small?: boolean }) {
  const { rtl } = useApp();
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, small && styles.chipSmall, active && styles.chipActive]}
    >
      <RNText style={{ fontFamily: rtl ? fonts.arabicMedium : fonts.sansMedium, fontSize: small ? 12 : 13, color: active ? colors.bgDeep : colors.text }}>{label}</RNText>
    </Pressable>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  const { rtl } = useApp();
  return <View style={[{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.md }, style]} />;
}

export function Loader() {
  return (
    <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.sm + 2 }}>
      <Txt v="label">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Txt v="small" color={colors.accent}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: 'rgba(12,26,44,0.92)',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    padding: space.md,
  },
  cardAccent: { borderColor: 'rgba(255,122,26,0.55)', backgroundColor: 'rgba(30,22,18,0.6)' },
  btn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, gap: 8 },
  btnSolid: { backgroundColor: colors.accent },
  btnOutline: { borderWidth: 1, borderColor: 'rgba(255,122,26,0.6)' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.03)' },
  chipSmall: { paddingHorizontal: 11, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
});

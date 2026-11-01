import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, space } from '../theme';
import { useApp } from '../lib/store';
import { Row, Txt } from './ui';

export function BackHeader({ title, right }: { title?: string; right?: ReactNode }) {
  const { t, rtl } = useApp();
  return (
    <Row style={{ marginBottom: space.md, justifyContent: 'space-between' }}>
      <Row gap={12} style={{ flex: 1 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={8}
        >
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.text} />
        </Pressable>
        {title ? (
          <Txt v="heading" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Txt>
        ) : null}
      </Row>
      {right}
    </Row>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

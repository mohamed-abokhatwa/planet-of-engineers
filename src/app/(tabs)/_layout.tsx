import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, useColors, makeStyles, useShadow } from '../../theme';
import { useApp } from '../../lib/store';
import { haptic } from '../../components/ui';
import type { StringKey } from '../../lib/i18n';

type IconName = keyof typeof Ionicons.glyphMap;
const TABS: Record<string, { icon: [IconName, IconName]; label: StringKey }> = {
  index: { icon: ['planet-outline', 'planet'], label: 'tabPlanet' },
  tools: { icon: ['construct-outline', 'construct'], label: 'tabTools' },
  sos: { icon: ['help-buoy-outline', 'help-buoy'], label: 'tabSos' },
  salary: { icon: ['compass-outline', 'compass'], label: 'tabSalary' },
  me: { icon: ['person-circle-outline', 'person-circle'], label: 'tabMe' },
};

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const colors = useColors();
  const styles = useStyles();
  const shadow = useShadow();
  const insets = useSafeAreaInsets();
  const { t, rtl } = useApp();
  const routes = rtl ? [...state.routes].reverse() : state.routes;
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={[styles.bar, shadow]}>
        {routes.map((route) => {
          const focused = state.routes[state.index].key === route.key;
          const tab = TABS[route.name];
          if (!tab) return null;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(tab.label)}
              onPress={() => {
                if (!focused) {
                  haptic.select();
                  navigateToTab(route.key);
                }
              }}
              style={styles.item}
            >
              <Ionicons name={focused ? tab.icon[1] : tab.icon[0]} size={22} color={focused ? colors.accent : colors.textMuted} />
              <Text style={[styles.label, { fontFamily: rtl ? fonts.arabicMedium : fonts.sansMedium, fontSize: rtl ? 11.5 : 10.5 }, focused && { color: colors.accent }]}>{t(tab.label)}</Text>
              {focused ? <View style={styles.indicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tools" />
      <Tabs.Screen name="sos" />
      <Tabs.Screen name="salary" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: 560,
    flexDirection: 'row',
    backgroundColor: Platform.OS === 'android' ? colors.tabBarSolid : colors.tabBar,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    paddingVertical: 9,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { color: colors.textMuted },
  indicator: { position: 'absolute', top: -9, width: 22, height: 2, borderRadius: 1, backgroundColor: colors.accent },
}));

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Card, PressableScale, Row, Screen, Txt } from '../../components/ui';
import { colors, radius, space } from '../../theme';
import { useApp } from '../../lib/store';
import { TOOLS } from '../../tools/defs';

export default function ToolsScreen() {
  const { t, tr, rtl } = useApp();
  const groups = [...new Set(TOOLS.map((x) => x.group.en))];
  return (
    <Screen>
      <Txt v="label">{t('tabTools')}</Txt>
      <Txt v="title" style={{ marginTop: 4 }}>
        {t('toolsTitle')}
      </Txt>
      <Row gap={6} style={{ marginTop: space.sm }}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.good} />
        <Txt v="small" style={{ flex: 1 }}>
          {t('toolsSub')}
        </Txt>
      </Row>

      <PressableScale onPress={() => router.push('/converter')} style={{ marginTop: space.lg }} accessibilityLabel="Unit converter">
        <Card accent>
          <Row gap={space.md}>
            <View style={[styles.icon, { backgroundColor: colors.accent }]}>
              <Ionicons name="swap-horizontal" size={22} color={colors.bgDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="heading">{tr({ en: 'Unit converter', ar: 'محوّل الوحدات' })}</Txt>
              <Txt v="small">{tr({ en: '12 categories: pressure, force, flow, power, feddan…', ar: '12 فئة: الضغط والقوة والتصرف والقدرة والفدان…' })}</Txt>
            </View>
            <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
          </Row>
        </Card>
      </PressableScale>

      {groups.map((g) => (
        <View key={g}>
          <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
            {tr(TOOLS.find((x) => x.group.en === g)!.group)}
          </Txt>
          {TOOLS.filter((x) => x.group.en === g).map((tool) => (
            <PressableScale key={tool.id} onPress={() => router.push(`/tool/${tool.id}`)} style={{ marginBottom: space.sm }} accessibilityLabel={tr(tool.title)}>
              <Card>
                <Row gap={space.md}>
                  <View style={styles.icon}>
                    <Ionicons name={tool.icon} size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="heading" style={{ fontSize: 16 }}>
                      {tr(tool.title)}
                    </Txt>
                    <Txt v="small">{tr(tool.desc)}</Txt>
                  </View>
                  <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
                </Row>
              </Card>
            </PressableScale>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});

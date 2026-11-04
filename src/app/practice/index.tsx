import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackHeader } from '../../components/BackHeader';
import { Card, PressableScale, Row, Screen, Txt } from '../../components/ui';
import { View } from 'react-native';
import { fonts, space, useColors } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { trackQuestions, tracksFor } from '../../data/practice';
import { loadBests } from '../../lib/practiceStore';

export default function PracticeScreen() {
  const colors = useColors();
  const { t, tr, prefs, rtl } = useApp();
  const bests = useLoad(() => loadBests());
  return (
    <Screen>
      <BackHeader title={t('practice')} />
      <Txt v="small" style={{ marginBottom: space.md }}>
        {t('practiceSub')}
      </Txt>
      {tracksFor(prefs.profile.discipline).map((tr0) => {
        const best = bests.data?.[tr0.id];
        return (
          <PressableScale key={tr0.id} onPress={() => router.push(`/practice/${tr0.id}`)} accessibilityLabel={tr(tr0.title)} style={{ marginBottom: space.sm }}>
            <Card>
              <Row gap={space.md}>
                <Ionicons name={tr0.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Txt v="heading" style={{ fontSize: 15.5 }}>
                    {tr(tr0.title)}
                  </Txt>
                  <Txt v="small" style={{ fontSize: 12 }}>
                    {tr(tr0.level)} · {t('questionsN', { n: trackQuestions(tr0.id).length })}
                  </Txt>
                </View>
                <Txt style={{ fontFamily: fonts.monoSemi, fontSize: 13, color: best === undefined ? colors.textFaint : best >= 80 ? colors.good : colors.accent }}>
                  {best === undefined ? t('notStarted') : t('bestN', { n: best })}
                </Txt>
                <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textFaint} />
              </Row>
            </Card>
          </PressableScale>
        );
      })}
      <Txt v="small" center style={{ marginTop: space.md, fontSize: 11.5 }}>
        {t('practiceNote')}
      </Txt>
    </Screen>
  );
}

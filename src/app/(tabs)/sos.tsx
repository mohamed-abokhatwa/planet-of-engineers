import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlueprintGrid, Card, Chip, Loader, PressableScale, Row, Txt } from '../../components/ui';
import { QuestionCard } from '../../components/QuestionCard';
import { column, radius, space, useColors, makeStyles, useShadow } from '../../theme';
import { useApp, useLoad } from '../../lib/store';
import { DISCIPLINES, type Discipline, type Question, type QuestionFilter } from '../../lib/types';

export default function SosScreen() {
  const colors = useColors();
  const styles = useStyles();
  const shadow = useShadow();
  const { t, disc, rtl, touch } = useApp();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<QuestionFilter>('new');
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const list = useLoad((a) => a.listQuestions(filter, discipline), `${filter}|${discipline ?? ''}`);

  const renderItem = useCallback(({ item }: { item: Question }) => <QuestionCard q={item} />, []);

  return (
    <View style={styles.fill}>
      <BlueprintGrid />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(q) => q.id}
        renderItem={renderItem}
        initialNumToRender={6}
        windowSize={7}
        contentContainerStyle={[{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 150, paddingHorizontal: space.md + 4 }, column]}
        refreshControl={<RefreshControl tintColor={colors.accent} refreshing={false} onRefresh={touch} />}
        ListHeaderComponent={
          <View style={{ marginBottom: space.md }}>
            <Txt v="label">{t('tabSos')}</Txt>
            <Txt v="title" style={{ marginTop: 4 }}>
              {t('sosTitle')}
            </Txt>
            <Txt v="small" style={{ marginTop: 4 }}>
              {t('sosSub')}
            </Txt>
            <Row gap={8} style={{ marginTop: space.md }}>
              {(['new', 'unanswered', 'top'] as QuestionFilter[]).map((f) => (
                <Chip key={f} small label={t(f === 'new' ? 'filterNew' : f === 'unanswered' ? 'filterUnanswered' : 'filterTop')} active={filter === f} onPress={() => setFilter(f)} />
              ))}
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.sm }} contentContainerStyle={{ gap: 8, flexDirection: rtl ? 'row-reverse' : 'row' }}>
              <Chip small label={t('allDisciplines')} active={!discipline} onPress={() => setDiscipline(null)} />
              {DISCIPLINES.map((d) => (
                <Chip key={d} small label={disc(d)} active={discipline === d} onPress={() => setDiscipline(d)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <Loader />
          ) : (
            <Card>
              <Txt v="small" center>
                {t('emptySos')}
              </Txt>
            </Card>
          )
        }
      />
      <View style={[styles.fabWrap, { bottom: insets.bottom + 92 }, rtl ? { left: 20 } : { right: 20 }]} pointerEvents="box-none">
        <PressableScale onPress={() => router.push('/ask')} accessibilityLabel={t('ask')}>
          <Row gap={8} style={[styles.fab, shadow]}>
            <Ionicons name="add" size={22} color={colors.onAccent} />
            <Txt style={{ color: colors.onAccent, fontSize: 15, fontWeight: '600' }}>{t('ask')}</Txt>
          </Row>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { flex: 1, backgroundColor: colors.bg },
  fabWrap: { position: 'absolute' },
  fab: { backgroundColor: colors.accent, paddingHorizontal: 18, height: 50, borderRadius: radius.pill },
}));

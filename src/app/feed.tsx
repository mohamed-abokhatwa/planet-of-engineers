// A list of questions: graduation projects, or questions asked to me as a mentor.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { EmptyCard } from '../components/Campus';
import { QuestionCard } from '../components/QuestionCard';
import { Button, Chip, Loader, Row, Screen, Txt } from '../components/ui';
import { space } from '../theme';
import { useApp, useLoad } from '../lib/store';
import type { Category, FeedScope, QuestionFilter } from '../lib/types';

export default function FeedScreen() {
  const params = useLocalSearchParams<{ scope?: string; category?: string }>();
  const scope: FeedScope = params.scope === 'for_me' ? 'for_me' : 'all';
  const category: Category | null = params.category === 'graduation' ? 'graduation' : null;
  const { t } = useApp();
  const [filter, setFilter] = useState<QuestionFilter>(scope === 'for_me' ? 'unanswered' : 'new');
  const list = useLoad((a) => a.feed({ filter, discipline: null, category, scope }), `${filter}|${scope}|${category}`);
  const title = scope === 'for_me' ? t('askedToMe') : t('graduation');

  return (
    <Screen>
      <BackHeader title={title} />
      {category === 'graduation' ? (
        <Txt v="small" style={{ marginBottom: space.md }}>
          {t('graduationSub')}
        </Txt>
      ) : null}
      <Row gap={8} style={{ marginBottom: space.md }}>
        {(['new', 'unanswered', 'top'] as QuestionFilter[]).map((f) => (
          <Chip key={f} small label={t(f === 'new' ? 'filterNew' : f === 'unanswered' ? 'filterUnanswered' : 'filterTop')} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </Row>
      {list.loading && !list.data ? <Loader /> : null}
      {list.data && !list.data.length ? <EmptyCard text={t('emptySos')} /> : null}
      {(list.data ?? []).map((q) => (
        <QuestionCard key={q.id} q={q} />
      ))}
      {category === 'graduation' ? (
        <View style={{ marginTop: space.md }}>
          <Button label={t('ask')} onPress={() => router.push('/ask?category=graduation')} />
        </View>
      ) : null}
    </Screen>
  );
}

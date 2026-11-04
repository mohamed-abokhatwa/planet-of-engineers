// Training and job board: summer training, internships, graduate programmes and jobs.
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { Badge, EmptyCard } from '../components/Campus';
import { ReportSheet, type ReportTarget } from '../components/ReportSheet';
import { Sheet } from '../components/Sheet';
import { Button, Card, Chip, Loader, Row, Screen, Txt, haptic } from '../components/ui';
import { space, useColors } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { countryName, flag } from '../lib/countries';
import { timeAgo } from '../lib/format';
import { OPPORTUNITY_KINDS, type Opportunity, type OpportunityKind } from '../lib/types';

export default function OpportunitiesScreen() {
  const colors = useColors();
  const { t, api, prefs, disc, locale, touch, rtl } = useApp();
  const p = prefs.profile;
  const [kind, setKind] = useState<OpportunityKind | null>(null);
  const [myCountry, setMyCountry] = useState(true);
  const [mineDisc, setMineDisc] = useState(false);
  const list = useLoad((a) => a.listOpportunities(myCountry ? p.country : null, mineDisc ? p.discipline : null, kind), `${kind}|${myCountry}|${mineDisc}`);
  const [open, setOpen] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Opportunity | null>(null);
  const [report, setReport] = useState<ReportTarget>(null);

  const go = (url: string) => {
    setLeaving(null);
    if (Platform.OS === 'web') Linking.openURL(url).catch(() => {});
    else WebBrowser.openBrowserAsync(url, { toolbarColor: colors.bg, controlsColor: colors.accent }).catch(() => {});
  };

  return (
    <Screen>
      <BackHeader title={t('board')} />
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: space.sm }}>
        <Chip small label={t('allKinds')} active={!kind} onPress={() => setKind(null)} />
        {OPPORTUNITY_KINDS.map((k) => (
          <Chip key={k} small label={t(`kind_${k}`)} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </Row>
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: space.md }}>
        <Chip small label={`${flag(p.country)} ${t('myCountry')}`} active={myCountry} onPress={() => setMyCountry(true)} />
        <Chip small label={t('allCountries')} active={!myCountry} onPress={() => setMyCountry(false)} />
        <Chip small label={t('allDisciplines')} active={!mineDisc} onPress={() => setMineDisc(false)} />
        <Chip small label={disc(p.discipline)} active={mineDisc} onPress={() => setMineDisc(true)} />
      </Row>

      <Button label={t('postOpportunity')} variant="outline" icon={<Ionicons name="add" size={18} color={colors.accent} />} onPress={() => router.push('/opportunity-new')} style={{ marginBottom: space.md }} />

      {list.loading && !list.data ? <Loader /> : null}
      {list.data && !list.data.length ? <EmptyCard text={t('noOpportunities')} /> : null}
      {(list.data ?? []).map((o) => {
        const expanded = open === o.id;
        return (
          <Pressable key={o.id} onPress={() => setOpen(expanded ? null : o.id)} accessibilityRole="button" accessibilityLabel={o.title}>
            <Card style={{ marginBottom: space.sm }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Badge label={t(`kind_${o.kind}`)} color={o.kind === 'job' ? colors.good : o.kind === 'graduate' ? colors.cyan : colors.accent} />
                <Txt v="mono" style={{ fontSize: 11.5 }}>{timeAgo(o.createdAt, locale)}</Txt>
              </Row>
              <Txt v="heading" auto style={{ fontSize: 16 }}>
                {o.title}
              </Txt>
              <Txt v="small" style={{ marginTop: 2 }}>
                {flag(o.country)} {countryName(o.country, locale)}{o.city ? ` · ${o.city}` : ''} · {disc(o.discipline)}
              </Txt>
              {o.deadline ? (
                <Txt v="small" style={{ marginTop: 2, color: colors.warn }}>
                  {t('deadlineOn', { date: o.deadline })}
                </Txt>
              ) : null}
              {o.status === 'pending' ? (
                <Txt v="small" style={{ marginTop: 4, color: colors.warn }}>
                  {t('opportunityPending')}
                </Txt>
              ) : null}
              <Txt auto numberOfLines={expanded ? undefined : 2} style={{ marginTop: 6, fontSize: 14 }}>
                {o.body}
              </Txt>
              {expanded ? (
                <>
                  <Txt v="small" style={{ marginTop: 6, writingDirection: 'ltr', textAlign: rtl ? 'right' : 'left' }}>
                    {t('postedBy', { handle: o.authorHandle })}
                  </Txt>
                  <Row gap={space.sm} style={{ marginTop: space.md }}>
                    {o.applyUrl ? <Button label={t('apply')} onPress={() => setLeaving(o)} style={{ flex: 1 }} /> : null}
                    {o.isMine ? (
                      <Button
                        label={t('deleteLabel')}
                        variant="ghost"
                        onPress={async () => {
                          await api.deleteOpportunity(o.id).catch(() => {});
                          haptic.success();
                          touch();
                        }}
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <Pressable onPress={() => setReport({ kind: 'opportunity', id: o.id })} hitSlop={10} accessibilityLabel={t('report')} style={{ padding: 10 }}>
                        <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </Row>
                </>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
      <View style={{ height: space.md }} />
      <Sheet visible={!!leaving} onClose={() => setLeaving(null)} title={t('apply')}>
        <Txt v="small" center style={{ marginBottom: space.md }}>
          {t('applyWarning')}
        </Txt>
        <Txt v="mono" center style={{ fontSize: 12, marginBottom: space.lg, writingDirection: 'ltr' }}>
          {leaving?.applyUrl}
        </Txt>
        <Button label={t('openLink')} onPress={() => leaving?.applyUrl && go(leaving.applyUrl)} />
        <Button label={t('cancel')} variant="ghost" onPress={() => setLeaving(null)} style={{ marginTop: space.sm }} />
      </Sheet>
      <ReportSheet target={report} onClose={() => setReport(null)} onDone={() => list.reload()} />
    </Screen>
  );
}

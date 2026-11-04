// Choose your university (search by name or email domain), request a missing one, set your year of study.
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { Badge, EmptyCard, Field, POST_ERR } from '../components/Campus';
import { CountrySheet, SelectField } from '../components/Pickers';
import { Button, Card, Chip, Loader, Row, Screen, Txt, haptic } from '../components/ui';
import { radius, space, useColors, makeStyles } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { countryName, flag } from '../lib/countries';
import type { StringKey } from '../lib/i18n';
import type { University } from '../lib/types';

export default function UniversityScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t, api, prefs, setProfile, locale, touch, rtl } = useApp();
  const p = prefs.profile;
  const [country, setCountry] = useState(p.country);
  const [pickCountry, setPickCountry] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [name, setName] = useState('');
  const [web, setWeb] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ key: StringKey; bad?: boolean } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);
  const list = useLoad((a) => a.searchUniversities(country, debounced), `${country}|${debounced}`);

  const choose = async (u: University) => {
    haptic.success();
    setMsg(null);
    await setProfile({ universityId: u.id, universityName: u.name });
    touch();
  };

  const request = async () => {
    setBusy(true);
    const r = await api.requestUniversity(name, country, web).catch(() => ({ ok: false as const, reason: 'network' as const }));
    setBusy(false);
    if (!r.ok) {
      haptic.error();
      setMsg({ key: POST_ERR[r.reason], bad: true });
      return;
    }
    await setProfile({ universityId: r.value, universityName: name.trim() });
    touch();
    setRequesting(false);
    setMsg({ key: 'requestSent' });
  };

  return (
    <Screen>
      <BackHeader title={t('pickUniversity')} />
      {p.universityId ? (
        <Card accent style={{ marginBottom: space.md }}>
          <Txt v="label">{t('myUniversity')}</Txt>
          <Txt v="heading" auto style={{ marginTop: 4 }}>
            {p.universityName}
          </Txt>
          {p.role === 'student' ? (
            <>
              <Txt v="label" style={{ marginTop: space.md, marginBottom: 6 }}>
                {t('studyYear')}
              </Txt>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <Chip key={y} small label={t('yearN', { n: y })} active={p.studyYear === y} onPress={() => setProfile({ studyYear: y })} />
                ))}
              </Row>
            </>
          ) : null}
          <Button label={t('openCommunity')} onPress={() => router.replace(`/community/${p.universityId}`)} style={{ marginTop: space.md }} />
          <Button
            label={t('leaveUniversity')}
            variant="ghost"
            onPress={async () => {
              await setProfile({ universityId: null, universityName: null, studyYear: null });
              touch();
            }}
            style={{ marginTop: space.xs }}
          />
        </Card>
      ) : (
        <Txt v="small" style={{ marginBottom: space.md }}>
          {t('pickUniversityBody')}
        </Txt>
      )}
      {msg ? (
        <Txt v="small" style={{ marginBottom: space.sm, color: msg.bad ? colors.bad : colors.good }}>
          {t(msg.key)}
        </Txt>
      ) : null}

      <SelectField label={t('country')} value={`${flag(country)}  ${countryName(country, locale)}`} onPress={() => setPickCountry(true)} />
      <Field label={t('searchUniversity')} value={query} onChangeText={setQuery} placeholder="🔍" />

      <View style={{ marginTop: space.md }}>
        {list.loading && !list.data ? <Loader /> : null}
        {list.data && !list.data.length ? <EmptyCard text={t('noUniversities')} /> : null}
        {(list.data ?? []).map((u) => {
          const mine = u.id === p.universityId;
          return (
            <Pressable key={u.id} onPress={() => choose(u)} accessibilityRole="button" accessibilityLabel={u.name} style={[styles.item, mine && styles.itemOn]}>
              <Row gap={space.md}>
                <Ionicons name={mine ? 'checkmark-circle' : 'school-outline'} size={20} color={mine ? colors.accent : colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Txt auto style={{ fontSize: 15 }}>
                    {u.name}
                  </Txt>
                  <Row gap={8} style={{ marginTop: 2 }}>
                    <Txt v="small" style={{ fontSize: 12 }}>
                      {t('membersN', { n: u.members })}
                    </Txt>
                    {u.status === 'pending' ? <Badge label={t('pendingApproval')} color={colors.warn} /> : null}
                  </Row>
                </View>
              </Row>
            </Pressable>
          );
        })}
      </View>

      {requesting ? (
        <Card style={{ marginTop: space.md }}>
          <Txt v="heading">{t('requestUniversity')}</Txt>
          <Field label={t('universityName')} value={name} onChangeText={setName} maxLength={160} />
          <Field label={t('universityWebsite')} value={web} onChangeText={setWeb} placeholder="https://" ltr maxLength={200} />
          <Txt v="small" style={{ marginTop: space.sm }}>
            {flag(country)} {countryName(country, locale)}
          </Txt>
          <Button label={t('requestUniversity')} onPress={request} loading={busy} disabled={name.trim().length < 3} style={{ marginTop: space.md }} />
        </Card>
      ) : (
        <Pressable onPress={() => setRequesting(true)} style={{ paddingVertical: space.lg }} accessibilityRole="button">
          <Txt v="small" center style={{ color: colors.accent, textDecorationLine: 'underline' }}>
            {t('universityMissing')}
          </Txt>
        </Pressable>
      )}
      <Txt v="small" center style={{ fontSize: 10.5, color: colors.textFaint, marginTop: space.sm, textAlign: rtl ? 'right' : 'center' }}>
        {t('universityListNote')}
      </Txt>
      <CountrySheet visible={pickCountry} onClose={() => setPickCountry(false)} onPick={setCountry} selected={country} />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  item: { paddingVertical: 12, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, marginBottom: 6, backgroundColor: colors.surface },
  itemOn: { borderColor: colors.accentLine, backgroundColor: colors.accentSoft },
}));

// Mentor directory, and mentor settings for engineers with 3+ years.
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { EmptyCard, Field } from '../components/Campus';
import { Avatar } from '../components/People';
import { Button, Card, Chip, Loader, Row, Screen, Txt, haptic } from '../components/ui';
import { space, useColors } from '../theme';
import { useApp, useLoad } from '../lib/store';
import { countryName, flag } from '../lib/countries';
import type { StringKey } from '../lib/i18n';

export default function MentorsScreen() {
  const colors = useColors();
  const { t, api, prefs, setPrefs, disc, roleName, locale } = useApp();
  const p = prefs.profile;
  const [mineDisc, setMineDisc] = useState(p.role === 'student');
  const [myCountry, setMyCountry] = useState(false);
  const list = useLoad((a) => a.listMentors(mineDisc ? p.discipline : null, myCountry ? p.country : null), `${mineDisc}|${myCountry}`);
  const eligible = p.role !== 'student' && p.years >= 3;
  const [on, setOn] = useState(!!p.mentor);
  const [note, setNote] = useState(p.mentorNote ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ key: StringKey; bad?: boolean } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile({ mentor: on, mentorNote: note.trim() || null });
      setPrefs({ profile: { ...p, mentor: on, mentorNote: note.trim() || null } });
      haptic.success();
      setMsg({ key: 'saved' });
    } catch (e) {
      haptic.error();
      setMsg({ key: (e as Error).message === 'contact' ? 'errContact' : 'errInvalid', bad: true });
    }
    setBusy(false);
  };

  return (
    <Screen>
      <BackHeader title={t('mentors')} />
      <Txt v="small" style={{ marginBottom: space.md }}>
        {t('mentorsSub')}
      </Txt>

      {p.role !== 'student' ? (
        <Card accent style={{ marginBottom: space.md }}>
          {eligible ? (
            <>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="heading" style={{ flex: 1 }}>
                  {p.mentor ? t('mentorOn') : t('becomeMentor')}
                </Txt>
                <Switch value={on} onValueChange={setOn} trackColor={{ true: colors.accentDeep, false: colors.surfaceRaised }} thumbColor={on ? colors.accent : colors.textMuted} />
              </Row>
              {on ? <Field label={t('mentorNote')} value={note} onChangeText={setNote} placeholder={t('mentorNotePh')} maxLength={160} /> : null}
              <Txt v="small" style={{ marginTop: space.sm }}>
                {t('mentorRule')}
              </Txt>
              {msg ? (
                <Txt v="small" style={{ marginTop: 6, color: msg.bad ? colors.bad : colors.good }}>
                  {t(msg.key)}
                </Txt>
              ) : null}
              <Button label={t('save')} onPress={save} loading={busy} disabled={on === !!p.mentor && (note.trim() || null) === (p.mentorNote ?? null)} style={{ marginTop: space.md }} />
            </>
          ) : (
            <Txt v="small">{t('mentorNeedYears')}</Txt>
          )}
        </Card>
      ) : null}

      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: space.md }}>
        <Chip small label={t('allDisciplines')} active={!mineDisc} onPress={() => setMineDisc(false)} />
        <Chip small label={disc(p.discipline)} active={mineDisc} onPress={() => setMineDisc(true)} />
        <Chip small label={t('allCountries')} active={!myCountry} onPress={() => setMyCountry(false)} />
        <Chip small label={`${flag(p.country)} ${t('myCountry')}`} active={myCountry} onPress={() => setMyCountry(true)} />
      </Row>

      {list.loading && !list.data ? <Loader /> : null}
      {list.data && !list.data.length ? <EmptyCard text={t('noMentors')} /> : null}
      {(list.data ?? []).map((m) => (
        <Card key={m.handle} style={{ marginBottom: space.sm }}>
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            <Avatar handle={m.handle} discipline={m.discipline} size={44} />
            <View style={{ flex: 1 }}>
              <Txt v="heading" style={{ fontSize: 15.5, writingDirection: 'ltr' }}>
                @{m.handle}
              </Txt>
              <Txt v="small">
                {flag(m.country)} {countryName(m.country, locale)} · {disc(m.discipline)} · {roleName(m.role)} · {m.yearsBand} {locale === 'ar' ? 'سنة' : 'yrs'}
              </Txt>
              {m.note ? (
                <Txt auto style={{ marginTop: 6, fontSize: 14 }}>
                  {m.note}
                </Txt>
              ) : null}
              <Row gap={space.md} style={{ marginTop: 6 }}>
                <Row gap={4}>
                  <Ionicons name="star-outline" size={13} color={colors.accent} />
                  <Txt v="mono" style={{ fontSize: 12 }}>
                    {m.reputation}
                  </Txt>
                </Row>
                <Txt v="small" style={{ fontSize: 12 }}>
                  {t('answersN', { n: m.answers })}
                </Txt>
              </Row>
            </View>
          </Row>
          <Button label={t('askMentor', { handle: m.handle })} variant="outline" onPress={() => router.push(`/ask?mentor=${encodeURIComponent(m.handle)}&discipline=${m.discipline}`)} style={{ marginTop: space.md }} />
        </Card>
      ))}
    </Screen>
  );
}

// Post a training or job opportunity. New posters are checked by a moderator first.
import { router } from 'expo-router';
import { useState } from 'react';
import { BackHeader } from '../components/BackHeader';
import { Field, POST_ERR } from '../components/Campus';
import { CountrySheet, SelectField } from '../components/Pickers';
import { Button, Chip, Row, Screen, Txt, haptic } from '../components/ui';
import { space, useColors } from '../theme';
import { useApp } from '../lib/store';
import { countryName, flag } from '../lib/countries';
import { checkPostText } from '../lib/moderation';
import { DISCIPLINES, OPPORTUNITY_KINDS, type OpportunityKind } from '../lib/types';
import type { StringKey } from '../lib/i18n';

export default function NewOpportunityScreen() {
  const colors = useColors();
  const { t, api, prefs, disc, locale, touch } = useApp();
  const p = prefs.profile;
  const [kind, setKind] = useState<OpportunityKind>('training');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [country, setCountry] = useState(p.country);
  const [pickCountry, setPickCountry] = useState(false);
  const [discipline, setDiscipline] = useState(p.discipline);
  const [city, setCity] = useState('');
  const [url, setUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const badDate = deadline.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim());
  const live = (title && checkPostText(title, 1, 120)) || (body && checkPostText(body, 1, 2000));
  const liveErr = live && live !== 'too_short' ? POST_ERR[live] : null;

  const post = async () => {
    setBusy(true);
    setError(null);
    const r = await api
      .postOpportunity({ kind, title, body, country, discipline, city, applyUrl: url.trim(), deadline: deadline.trim() || null })
      .catch(() => ({ ok: false as const, reason: 'network' as const }));
    setBusy(false);
    if (!r.ok) {
      haptic.error();
      // the text itself may not hold links; a refused link here is the application link
      setError(r.reason === 'link' && url.trim() ? 'errApplyLink' : POST_ERR[r.reason]);
      return;
    }
    haptic.success();
    touch();
    router.back();
  };

  return (
    <Screen>
      <BackHeader title={t('postOpportunity')} />
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {OPPORTUNITY_KINDS.map((k) => (
          <Chip key={k} small label={t(`kind_${k}`)} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </Row>
      <Field label={t('opportunityTitle')} value={title} onChangeText={(v) => (setTitle(v), setError(null))} maxLength={120} />
      <Field label={t('opportunityDetails')} value={body} onChangeText={(v) => (setBody(v), setError(null))} multiline maxLength={2000} />
      <Txt v="label" style={{ marginTop: space.md, marginBottom: 6 }}>
        {t('discipline')}
      </Txt>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {DISCIPLINES.map((d) => (
          <Chip key={d} small label={disc(d)} active={discipline === d} onPress={() => setDiscipline(d)} />
        ))}
      </Row>
      <SelectField label={t('country')} value={`${flag(country)}  ${countryName(country, locale)}`} onPress={() => setPickCountry(true)} />
      <Field label={t('city')} value={city} onChangeText={setCity} maxLength={60} />
      <Field label={t('applyLink')} value={url} onChangeText={setUrl} placeholder="https://" ltr maxLength={300} />
      <Field label={t('deadline')} value={deadline} onChangeText={setDeadline} placeholder="2026-12-31" ltr maxLength={10} />
      <Txt v="small" style={{ marginTop: space.md, fontSize: 12, color: error || liveErr ? colors.bad : colors.textFaint }}>
        {error ? t(error) : liveErr ? t(liveErr) : t('boardRules')}
      </Txt>
      <Button
        label={t('postOpportunity')}
        onPress={post}
        loading={busy}
        disabled={title.trim().length < 10 || body.trim().length < 20 || !!liveErr || badDate}
        style={{ marginTop: space.md }}
      />
      <CountrySheet visible={pickCountry} onClose={() => setPickCountry(false)} onPick={setCountry} selected={country} />
    </Screen>
  );
}

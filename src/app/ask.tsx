import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { BackHeader } from '../components/BackHeader';
import { Button, Chip, Row, Screen, Txt, haptic } from '../components/ui';
import { fonts, radius, space, useColors, makeStyles } from '../theme';
import { useApp } from '../lib/store';
import { checkPostText } from '../lib/moderation';
import { DISCIPLINES, type Discipline, type PostResult, type Question } from '../lib/types';
import type { StringKey } from '../lib/i18n';

const ERR: Record<Extract<PostResult<unknown>, { ok: false }>['reason'], StringKey> = {
  contact: 'errContact', link: 'errLink', abuse: 'errAbuse', scam: 'errScam', too_short: 'errShort', too_long: 'errLong', rate: 'errRate', network: 'errNetwork',
};

export default function AskScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { t, api, prefs, disc, rtl, touch } = useApp();
  const [discipline, setDiscipline] = useState<Discipline>(prefs.profile.discipline);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const liveIssue = (() => {
    const i = (title && checkPostText(title, 1, 140)) || (body && checkPostText(body, 1, 3000));
    return i && i !== 'too_short' ? ERR[i] : null;
  })();

  const pickImage = async () => {
    haptic.light();
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
  };

  const post = async () => {
    setBusy(true);
    setError(null);
    const r = await api.ask({ discipline, title, body, imageUri: image }).catch((): PostResult<Question> => ({ ok: false, reason: 'network' }));
    setBusy(false);
    if (!r.ok) {
      haptic.error();
      setError(ERR[r.reason]);
      return;
    }
    haptic.success();
    touch();
    router.replace(`/question/${r.value.id}`);
  };

  const inputStyle = { textAlign: (rtl ? 'right' : 'left') as 'right' | 'left', fontFamily: rtl ? fonts.arabic : fonts.sans };

  return (
    <Screen>
      <BackHeader title={t('ask')} />
      <Txt v="label" style={{ marginBottom: space.sm }}>
        {t('discipline')}
      </Txt>
      <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {DISCIPLINES.map((d) => (
          <Chip key={d} small label={disc(d)} active={discipline === d} onPress={() => setDiscipline(d)} />
        ))}
      </View>

      <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        {t('titleLabel')}
      </Txt>
      <TextInput
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          setError(null);
        }}
        maxLength={140}
        placeholder={t('titlePlaceholder')}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, inputStyle]}
        accessibilityLabel={t('titleLabel')}
      />

      <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        {t('detailsLabel')}
      </Txt>
      <TextInput
        value={body}
        onChangeText={(v) => {
          setBody(v);
          setError(null);
        }}
        multiline
        maxLength={3000}
        placeholder={t('detailsPlaceholder')}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, styles.area, inputStyle]}
        textAlignVertical="top"
        accessibilityLabel={t('detailsLabel')}
      />

      <View style={{ marginTop: space.md }}>
        {image ? (
          <View>
            <Image source={{ uri: image }} style={styles.preview} />
            <Pressable onPress={() => setImage(null)} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('removePhoto')}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={styles.photoBtn} accessibilityRole="button">
            <Row gap={8} style={{ justifyContent: 'center' }}>
              <Ionicons name="camera-outline" size={20} color={colors.accent} />
              <Txt color={colors.accent}>{t('addPhoto')}</Txt>
            </Row>
          </Pressable>
        )}
      </View>

      <Txt v="small" style={{ marginTop: space.md, color: error || liveIssue ? colors.bad : colors.textFaint, fontSize: 12 }}>
        {error ? t(error) : liveIssue ? t(liveIssue) : t('rules')}
      </Txt>
      <Button
        label={busy ? t('posting') : t('postQuestion')}
        onPress={post}
        loading={busy}
        disabled={title.trim().length < 10 || body.trim().length < 20 || !!liveIssue}
        style={{ marginTop: space.md }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 15.5, backgroundColor: colors.field },
  area: { minHeight: 150, lineHeight: 23 },
  photoBtn: { height: 56, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accentLine, justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  remove: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
}));

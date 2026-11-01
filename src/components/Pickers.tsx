import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Sheet } from './Sheet';
import { Row, Txt, haptic } from './ui';
import { colors, fonts, radius, space } from '../theme';
import { useApp } from '../lib/store';
import { COUNTRIES, countryName, flag } from '../lib/countries';

/** A tappable field that shows the current value and opens a picker. */
export function SelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { rtl } = useApp();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.field}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="label" style={{ marginBottom: 2 }}>
            {label}
          </Txt>
          <Txt numberOfLines={1}>{value}</Txt>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} style={rtl ? { transform: [{ scaleX: -1 }] } : undefined} />
      </Row>
    </Pressable>
  );
}

/** Searchable country list in a bottom sheet. */
export function CountrySheet({ visible, onClose, onPick, selected }: { visible: boolean; onClose: () => void; onPick: (code: string) => void; selected: string }) {
  const { t, locale, rtl } = useApp();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? COUNTRIES.filter((c) => c.en.toLowerCase().includes(s) || c.ar.includes(s) || c.code.toLowerCase() === s) : COUNTRIES;
  }, [q]);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('country')}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="🔍"
        placeholderTextColor={colors.textFaint}
        style={[styles.search, { textAlign: rtl ? 'right' : 'left', fontFamily: rtl ? fonts.arabic : fonts.sans }]}
        autoCorrect={false}
      />
      <View style={{ maxHeight: 420 }}>
        <SheetList
          items={list.map((c) => ({ key: c.code, label: `${flag(c.code)}  ${countryName(c.code, locale)}`, active: c.code === selected }))}
          onPick={(k) => {
            onPick(k);
            setQ('');
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

/** Simple option list for sheets. */
export function SheetList({ items, onPick }: { items: { key: string; label: string; active?: boolean }[]; onPick: (key: string) => void }) {
  return (
    <View>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={() => {
            haptic.select();
            onPick(it.key);
          }}
          style={styles.row}
          accessibilityRole="button"
          accessibilityState={{ selected: !!it.active }}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt style={it.active ? { color: colors.accent } : undefined}>{it.label}</Txt>
            {it.active ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
          </Row>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.02)' },
  search: { height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: space.md, marginBottom: space.sm },
  row: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});

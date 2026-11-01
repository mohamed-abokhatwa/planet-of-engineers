import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Row, Txt } from './ui';
import { colors, fonts, radius, space } from '../theme';

/** Accepts "1,5" or Arabic-Indic digits as well as "1.5". */
export function parseNumber(s: string) {
  const western = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const cleaned = western.replace(/٫|,/g, '.').replace(/[^0-9.\-eE]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

export function NumberField({ label, value, unit, onChange }: { label: string; value: number; unit?: string; onChange: (n: number) => void }) {
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Txt v="small" style={{ marginBottom: 6, color: colors.text }}>
        {label}
      </Txt>
      <Row style={[styles.box, focused && { borderColor: colors.accent }, { flexDirection: 'row' }]} gap={8}>
        <TextInput
          value={text}
          onChangeText={(s) => {
            setText(s);
            onChange(parseNumber(s));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.input}
          accessibilityLabel={label}
        />
        {unit ? <Txt v="mono" style={{ color: colors.cyan }}>{unit}</Txt> : null}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: 'rgba(255,255,255,0.025)' },
  input: { flex: 1, height: 48, color: colors.text, fontFamily: fonts.monoSemi, fontSize: 17, textAlign: 'left' },
});

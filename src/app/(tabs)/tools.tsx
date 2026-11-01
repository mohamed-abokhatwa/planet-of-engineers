import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Card, PressableScale, Row, Screen, Txt } from '../../components/ui';
import { colors, fonts, radius, space } from '../../theme';
import { useApp } from '../../lib/store';
import { useFavourites } from '../../lib/toolPrefs';
import { TOOLS, type ToolDef } from '../../tools/defs';

type T = { en: string; ar: string };

// Search ignores case, Arabic diacritics and alef/yaa/taa-marbuta variants.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
const haystack = (x: ToolDef) => norm([x.title.en, x.title.ar, x.desc.en, x.desc.ar, x.group.en, x.group.ar, x.id].join(' '));

export default function ToolsScreen() {
  const { t, tr, rtl } = useApp();
  const [q, setQ] = useState('');
  const favs = useFavourites();
  const query = norm(q.trim());
  const terms = query.split(/\s+/).filter(Boolean);
  const index = useMemo(() => TOOLS.map((x) => [x, haystack(x)] as const), []);
  const matches = terms.length ? index.filter(([, h]) => terms.every((w) => h.includes(w))).map(([x]) => x) : TOOLS;
  const groups = [...new Set(matches.map((x) => x.group.en))];
  const favTools = favs.map((id) => TOOLS.find((x) => x.id === id)).filter((x): x is ToolDef => !!x);
  const chevron = rtl ? 'chevron-back' : 'chevron-forward';

  const feature = (href: Href, icon: keyof typeof Ionicons.glyphMap, title: T, sub: T, accent?: boolean) => (
    <PressableScale onPress={() => router.push(href)} style={{ marginBottom: space.sm }} accessibilityLabel={title.en}>
      <Card accent={accent}>
        <Row gap={space.md}>
          <View style={[styles.icon, accent && { backgroundColor: colors.accent }]}>
            <Ionicons name={icon} size={22} color={accent ? colors.bgDeep : colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="heading">{tr(title)}</Txt>
            <Txt v="small">{tr(sub)}</Txt>
          </View>
          <Ionicons name={chevron} size={18} color={colors.textMuted} />
        </Row>
      </Card>
    </PressableScale>
  );

  const item = (tool: ToolDef) => (
    <PressableScale key={tool.id} onPress={() => router.push(`/tool/${tool.id}`)} style={{ marginBottom: space.sm }} accessibilityLabel={tr(tool.title)}>
      <Card>
        <Row gap={space.md}>
          <View style={styles.icon}>
            <Ionicons name={tool.icon} size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="heading" style={{ fontSize: 16 }}>
              {tr(tool.title)}
            </Txt>
            <Txt v="small">{tr(tool.desc)}</Txt>
          </View>
          {favs.includes(tool.id) ? <Ionicons name="star" size={14} color={colors.accent} /> : null}
          <Ionicons name={chevron} size={18} color={colors.textMuted} />
        </Row>
      </Card>
    </PressableScale>
  );

  return (
    <Screen>
      <Txt v="label">{t('tabTools')}</Txt>
      <Txt v="title" style={{ marginTop: 4 }}>
        {t('toolsTitle')}
      </Txt>
      <Row gap={6} style={{ marginTop: space.sm }}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.good} />
        <Txt v="small" style={{ flex: 1 }}>
          {t('toolsSub')}
        </Txt>
      </Row>

      {/* Search */}
      <Row gap={8} style={[styles.search, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={tr({ en: `Search ${TOOLS.length} tools…`, ar: `ابحث في ${TOOLS.length} أداة…` })}
          placeholderTextColor={colors.textFaint}
          style={[styles.searchInput, { textAlign: rtl ? 'right' : 'left' }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={tr({ en: 'Search tools', ar: 'البحث في الأدوات' })}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr({ en: 'Clear search', ar: 'مسح البحث' })}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Row>

      {!terms.length ? (
        <View style={{ marginTop: space.lg }}>
          {feature('/calculator', 'calculator-outline', { en: 'Scientific calculator', ar: 'الآلة الحاسبة العلمية' }, { en: 'Trig, logs, powers, factorial, history', ar: 'مثلثات ولوغاريتمات وأسس ومضروب وسجل' }, true)}
          {feature('/converter', 'swap-horizontal', { en: 'Unit converter', ar: 'محوّل الوحدات' }, { en: '17 categories: pressure, line load, inertia, feddan…', ar: '17 فئة: الضغط والحمل الخطي والقصور والفدان…' })}
          {feature('/reference', 'library-outline', { en: 'Reference tables', ar: 'الجداول المرجعية' }, { en: 'Rebar, IPE, concrete grades, bolts, pipes, AWG, densities', ar: 'الحديد وقطاعات IPE ورتب الخرسانة والمسامير والمواسير والكثافات' })}
        </View>
      ) : null}

      {!terms.length && favTools.length ? (
        <View>
          <Row gap={6} style={{ marginTop: space.lg, marginBottom: space.sm }}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <Txt v="label">{tr({ en: 'Favourites', ar: 'المفضلة' })}</Txt>
          </Row>
          {favTools.map(item)}
        </View>
      ) : null}

      {terms.length && !matches.length ? (
        <Card style={{ marginTop: space.lg }}>
          <Txt v="small" center>
            {tr({ en: 'No tool matches. Try another word, or the calculator.', ar: 'لا توجد أداة مطابقة. جرّب كلمة أخرى أو الآلة الحاسبة.' })}
          </Txt>
        </Card>
      ) : null}

      {groups.map((g) => {
        const list = matches.filter((x) => x.group.en === g);
        return (
          <View key={g}>
            <Row style={{ marginTop: space.lg, marginBottom: space.sm, justifyContent: 'space-between' }}>
              <Txt v="label">{tr(list[0].group)}</Txt>
              <Txt v="small" style={{ fontFamily: fonts.mono, fontSize: 11 }}>
                {list.length}
              </Txt>
            </Row>
            {list.map(item)}
          </View>
        );
      })}

      {!terms.length ? (
        <Txt v="small" center style={{ marginTop: space.md, fontSize: 11.5, color: colors.textFaint }}>
          {tr({ en: 'Tap ☆ inside a tool to pin it here.', ar: 'اضغط ☆ داخل أي أداة لتثبيتها هنا.' })}
        </Txt>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  search: { marginTop: space.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  searchInput: { flex: 1, height: 46, color: colors.text, fontFamily: fonts.sans, fontSize: 15 },
});

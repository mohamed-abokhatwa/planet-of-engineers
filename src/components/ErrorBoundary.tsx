import { Pressable, Text, View } from 'react-native';
import { useColors } from '../theme';

// Expo Router shows this when a screen throws, instead of a blank crash.
export function ErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: colors.text, fontSize: 22, marginBottom: 8, textAlign: 'center' }}>Something went wrong</Text>
      <Text style={{ color: colors.textMuted, fontSize: 15, marginBottom: 24, textAlign: 'center' }}>حدث خطأ ما. Please try again.</Text>
      <Pressable onPress={retry} style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accent }}>
        <Text style={{ color: colors.onAccent, fontWeight: '600' }}>Retry · إعادة</Text>
      </Pressable>
    </View>
  );
}

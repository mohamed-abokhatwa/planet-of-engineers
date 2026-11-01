import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { AppProvider, backendMissing, useApp } from '../lib/store';
import { ErrorBoundary as AppErrorBoundary } from '../components/ErrorBoundary';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export { AppErrorBoundary as ErrorBoundary };

function Root() {
  const { ready } = useApp();
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (backendMissing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', marginBottom: 8 }}>Setup incomplete</Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center' }}>
          This build has no database keys. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY as EAS environment variables and build again.
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tool/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="converter" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="calculator" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reference" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="question/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ask" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="salary-share" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="leaderboard" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="card" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

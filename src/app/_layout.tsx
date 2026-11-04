import { Stack } from 'expo-router';
import * as Sentry from '@sentry/react-native';
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
import { useTheme } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Crash reporting turns on only when a Sentry DSN is configured for the build. No personal data is sent.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, sendDefaultPii: false, enabled: !__DEV__, tracesSampleRate: 0, attachScreenshot: false });
}

export { AppErrorBoundary as ErrorBoundary };

function Root() {
  const { name, colors } = useTheme();
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={name === 'light' ? 'dark' : 'light'} />
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
        <Stack.Screen name="campus" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="university" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="community/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="feed" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="mentors" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="opportunities" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="opportunity-new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="practice/index" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="practice/[track]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="moderation" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;

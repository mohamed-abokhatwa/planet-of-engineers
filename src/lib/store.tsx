import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import Constants from 'expo-constants';
import type { Api, Profile } from '../data/api';
import { DemoApi } from '../data/demoApi';
import { SupabaseApi } from '../data/supabaseApi';
import { disciplineLabels, format, isLocale, roleLabels, strings, type Locale, type StringKey } from './i18n';
import type { Discipline, Role } from './types';
import { ThemeProvider, type ThemeMode } from '../theme';

const PREFS_KEY = 'poe.prefs.v1';
const REQUIRE_BACKEND = process.env.EXPO_PUBLIC_REQUIRE_BACKEND === '1';

export interface Prefs {
  onboarded: boolean;
  profile: Profile;
  reminders: boolean;
  /** Look and feel: dark blueprint, light blueprint, or follow the phone. */
  theme: ThemeMode;
}

function createApi(): Api | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey;
  if (url && key) return new SupabaseApi(url, key);
  // Store builds must never fall back to sample data.
  return REQUIRE_BACKEND ? null : new DemoApi();
}

const created = createApi();
/** True when a store build is missing its database keys. */
export const backendMissing = created === null;
const api: Api = created ?? new DemoApi();

// Layout direction is handled by our own components so the language switches instantly.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const deviceLocale = (): Locale => (getLocales().some((l) => l.languageCode === 'ar') ? 'ar' : 'en');

const defaults = (): Prefs => ({
  onboarded: false,
  profile: { handle: '', discipline: 'civil', country: getLocales()[0]?.regionCode ?? 'XX', years: 3, role: 'engineer', locale: deviceLocale() },
  reminders: true,
  theme: 'dark',
});

interface Ctx {
  ready: boolean;
  prefs: Prefs;
  api: Api;
  locale: Locale;
  rtl: boolean;
  t: (k: StringKey, vars?: Record<string, string | number>) => string;
  /** Pick the right language from a bilingual value. */
  tr: (v: { en: string; ar: string }) => string;
  disc: (d: Discipline) => string;
  roleName: (r: Role) => string;
  setPrefs: (p: Partial<Prefs>) => void;
  /** Saves on the device at once; the promise settles when the server has it too. */
  setProfile: (p: Partial<Profile>) => Promise<void>;
  completeOnboarding: (p: Profile) => Promise<void>;
  reset: () => Promise<void>;
  version: number;
  touch: () => void;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>(defaults);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const saved = { ...defaults(), ...JSON.parse(raw) } as Prefs;
          if (!isLocale(saved.profile.locale)) saved.profile.locale = 'en';
          if (!['dark', 'light', 'system'].includes(saved.theme)) saved.theme = 'dark';
          setPrefsState(saved);
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const persist = useCallback((next: Prefs) => {
    setPrefsState(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => persist({ ...prefs, ...p }), [prefs, persist]);
  const setProfile = useCallback(
    (p: Partial<Profile>) => {
      persist({ ...prefs, profile: { ...prefs.profile, ...p } });
      return prefs.onboarded ? api.updateProfile(p).catch(() => {}) : Promise.resolve();
    },
    [prefs, persist],
  );
  const completeOnboarding = useCallback(
    async (profile: Profile) => {
      await api.init(profile);
      persist({ ...prefs, profile, onboarded: true });
    },
    [prefs, persist],
  );
  const reset = useCallback(async () => {
    await api.deleteAccount().catch(() => {});
    await AsyncStorage.removeItem(PREFS_KEY);
    setPrefsState(defaults());
  }, []);

  const locale = prefs.profile.locale;
  const value = useMemo<Ctx>(
    () => ({
      ready,
      prefs,
      api,
      locale,
      rtl: locale === 'ar',
      t: (k, vars) => (vars ? format(strings[locale][k], vars) : strings[locale][k]),
      tr: (v) => v[locale],
      disc: (d) => disciplineLabels[locale][d],
      roleName: (r) => roleLabels[locale][r],
      setPrefs,
      setProfile,
      completeOnboarding,
      reset,
      version,
      touch: () => setVersion((x) => x + 1),
    }),
    [ready, prefs, locale, setPrefs, setProfile, completeOnboarding, reset, version],
  );

  return (
    <AppContext.Provider value={value}>
      <ThemeProvider mode={prefs.theme}>{children}</ThemeProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}

/** Loads data on mount, whenever app data changes (touch()), and whenever `key` changes. */
export function useLoad<T>(fn: (api: Api) => Promise<T>, key = '') {
  const { api: a, version } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const reqKey = `${version}|${nonce}|${key}`;
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    let alive = true;
    fnRef
      .current(a)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setDoneKey(reqKey));
    return () => {
      alive = false;
    };
  }, [a, reqKey]);
  // Loading until the latest request has finished.
  const loading = doneKey !== reqKey;
  const reload = useCallback(() => setNonce((x) => x + 1), []);
  return { data, error, loading, reload, setData };
}

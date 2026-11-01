import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

export type ThemeName = 'dark' | 'light';
export type ThemeMode = ThemeName | 'system';

// Blueprint, two ways. Dark: deep navy paper, faint drafting grid, safety-orange accent, cyan linework.
// Light: white drafting paper, navy ink, blue linework, a deeper orange that stays readable on white.
// Colours used with an alpha suffix (`${c}66`) must stay 6-digit hex.
const dark = {
  bg: '#07111F',
  bgDeep: '#040B15',
  surface: '#0C1A2C',
  surfaceRaised: '#11233A',
  line: 'rgba(120,170,230,0.14)',
  lineStrong: 'rgba(120,170,230,0.30)',
  grid: 'rgba(120,170,230,0.055)',
  gridMajor: 'rgba(120,170,230,0.10)',
  accent: '#FF7A1A',
  accentDeep: '#E25E00',
  accentSoft: 'rgba(255,122,26,0.14)',
  accentTint: 'rgba(255,122,26,0.10)',
  accentLine: 'rgba(255,122,26,0.55)',
  /** Text and icons placed on the accent colour. */
  onAccent: '#040B15',
  cyan: '#5CC8FF',
  cyanSoft: 'rgba(92,200,255,0.12)',
  cyanRange: 'rgba(92,200,255,0.45)',
  text: '#E6EDF6',
  textMuted: '#93A4BA',
  textFaint: '#5D6F86',
  good: '#4ADE80',
  goodSoft: 'rgba(74,222,128,0.10)',
  goodLine: 'rgba(74,222,128,0.6)',
  warn: '#FBBF24',
  bad: '#F87171',
  badSoft: 'rgba(248,113,113,0.10)',
  overlay: 'rgba(2,6,12,0.72)',
  white: '#FFFFFF',
  /** Input and chip backgrounds. */
  field: 'rgba(255,255,255,0.025)',
  zebra: 'rgba(255,255,255,0.025)',
  /** Card backgrounds over the grid. */
  panel: 'rgba(12,26,44,0.92)',
  panelAccent: 'rgba(30,22,18,0.6)',
  display: 'rgba(4,11,21,0.92)',
  tabBar: 'rgba(11,24,40,0.97)',
  tabBarSolid: '#0B1828',
};
export type Palette = { [K in keyof typeof dark]: string };

const light: Palette = {
  bg: '#F3F6FA',
  bgDeep: '#E4EAF2',
  surface: '#FFFFFF',
  surfaceRaised: '#EDF2F8',
  line: 'rgba(16,52,96,0.13)',
  lineStrong: 'rgba(16,52,96,0.26)',
  grid: 'rgba(30,100,190,0.06)',
  gridMajor: 'rgba(30,100,190,0.12)',
  accent: '#C84E08',
  accentDeep: '#A94000',
  accentSoft: 'rgba(200,78,8,0.12)',
  accentTint: 'rgba(200,78,8,0.07)',
  accentLine: 'rgba(200,78,8,0.55)',
  onAccent: '#FFFFFF',
  cyan: '#0A64A8',
  cyanSoft: 'rgba(10,100,168,0.10)',
  cyanRange: 'rgba(10,100,168,0.35)',
  text: '#0D1B2C',
  textMuted: '#4A5B70',
  textFaint: '#6E7D93',
  good: '#15803D',
  goodSoft: 'rgba(21,128,61,0.10)',
  goodLine: 'rgba(21,128,61,0.55)',
  warn: '#B45309',
  bad: '#DC2626',
  badSoft: 'rgba(220,38,38,0.08)',
  overlay: 'rgba(10,22,40,0.45)',
  white: '#FFFFFF',
  field: '#FFFFFF',
  zebra: 'rgba(16,52,96,0.035)',
  panel: 'rgba(255,255,255,0.94)',
  panelAccent: '#FFF5EE',
  display: '#FFFFFF',
  tabBar: 'rgba(255,255,255,0.97)',
  tabBarSolid: '#FFFFFF',
};

export const PALETTES: Record<ThemeName, Palette> = { dark, light };

type ThemeValue = { name: ThemeName; colors: Palette };
const ThemeContext = createContext<ThemeValue>({ name: 'dark', colors: dark });

/** Resolves the user's choice (dark, light or follow the phone) and provides the palette. */
export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const system = useColorScheme();
  const name: ThemeName = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const value = useMemo(() => ({ name, colors: PALETTES[name] }), [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

/** Style sheets that follow the theme. Built once per theme and cached. */
type StylesIn = Parameters<typeof StyleSheet.create>[0];
export function makeStyles<T extends StylesIn>(build: (colors: Palette) => T & StylesIn) {
  const cache: Partial<Record<ThemeName, Readonly<T>>> = {};
  return function useStyles(): Readonly<T> {
    const { name, colors } = useContext(ThemeContext);
    return (cache[name] ??= StyleSheet.create(build(colors)));
  };
}

export const fonts = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemi: 'IBMPlexSans_600SemiBold',
  sansBold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
  arabic: 'IBMPlexSansArabic_400Regular',
  arabicMedium: 'IBMPlexSansArabic_500Medium',
  arabicBold: 'IBMPlexSansArabic_700Bold',
} as const;

/** Content never gets wider than this, so it reads well on iPad. */
export const CONTENT_MAX = 640;
export const column = { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

const shadows = {
  dark: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 6 },
    default: {},
  }),
  light: Platform.select({
    ios: { shadowColor: '#0D2340', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 4 },
    default: { boxShadow: '0 6px 20px rgba(13,35,64,0.10)' },
  }),
};
export const useShadow = () => shadows[useContext(ThemeContext).name];

import { Platform } from 'react-native';

// Blueprint: deep navy paper, faint drafting grid, safety-orange accent, cyan linework.
export const colors = {
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
  cyan: '#5CC8FF',
  cyanSoft: 'rgba(92,200,255,0.12)',
  text: '#E6EDF6',
  textMuted: '#93A4BA',
  textFaint: '#5D6F86',
  good: '#4ADE80',
  warn: '#FBBF24',
  bad: '#F87171',
  overlay: 'rgba(2,6,12,0.72)',
  white: '#FFFFFF',
} as const;

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

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 6 },
  default: {},
});

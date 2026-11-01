import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * The app mark: a blueprint planet wearing a safety-orange hard hat with a gear badge,
 * circled by an orbit. Brand colours stay the same in both themes, like any logo.
 * Drawn on a 120 × 120 grid; assets/logo.svg and the app icons are rendered from this file.
 */
export function PlanetMark({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Planet of Engineers">
      <Ellipse cx="60" cy="76" rx="55" ry="14" fill="none" stroke="#FF7A1A" strokeWidth="2.6" strokeOpacity="0.45" transform="rotate(-14 60 76)" />
      <Circle cx="60" cy="76" r="31" fill="#0A1A2C" stroke="#5CC8FF" strokeWidth="1.6" />
      <Ellipse cx="60" cy="76" rx="31" ry="9.3" fill="none" stroke="#5CC8FF" strokeOpacity="0.6" strokeWidth="1.1" />
      <Ellipse cx="60" cy="76" rx="11.2" ry="31" fill="none" stroke="#5CC8FF" strokeOpacity="0.55" strokeWidth="1.1" />
      <Path d="M60 45 V107" stroke="#5CC8FF" strokeOpacity="0.45" strokeWidth="1.1" />
      <Path d="M33.0 91.5 Q60 98.3 87.0 91.5" fill="none" stroke="#5CC8FF" strokeOpacity="0.42" strokeWidth="1" />
      <Ellipse cx="60" cy="60" rx="30" ry="4" fill="#000" opacity="0.35" />
      <Path d="M31 53 C31 29 44 21 60 21 C76 21 89 29 89 53 Z" fill="#FF7A1A" />
      <Path d="M37 47 C36 33 47 26 52 24" fill="none" stroke="#FFA35C" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <Path d="M20 54 Q60 67 100 54 Q102 48 93 48 Q60 55 27 48 Q18 48 20 54 Z" fill="#D65F06" />
      <Path d="M20 54 Q60 67 100 54" fill="none" stroke="#A84700" strokeWidth="1.8" />
      <Path d="M28 49 Q60 56 92 49" fill="none" stroke="#FFA35C" strokeWidth="1.2" opacity="0.7" />
      <Path d="M58.33 31.61L58.56 29.93A8.2 8.2 0 0 1 61.44 29.93L61.67 31.61A6.6 6.6 0 0 1 63.34 32.31L63.34 32.31L64.69 31.27A8.2 8.2 0 0 1 66.73 33.31L65.69 34.66A6.6 6.6 0 0 1 66.39 36.33L66.39 36.33L68.07 36.56A8.2 8.2 0 0 1 68.07 39.44L66.39 39.67A6.6 6.6 0 0 1 65.69 41.34L65.69 41.34L66.73 42.69A8.2 8.2 0 0 1 64.69 44.73L63.34 43.69A6.6 6.6 0 0 1 61.67 44.39L61.67 44.39L61.44 46.07A8.2 8.2 0 0 1 58.56 46.07L58.33 44.39A6.6 6.6 0 0 1 56.66 43.69L56.66 43.69L55.31 44.73A8.2 8.2 0 0 1 53.27 42.69L54.31 41.34A6.6 6.6 0 0 1 53.61 39.67L53.61 39.67L51.93 39.44A8.2 8.2 0 0 1 51.93 36.56L53.61 36.33A6.6 6.6 0 0 1 54.31 34.66L54.31 34.66L53.27 33.31A8.2 8.2 0 0 1 55.31 31.27L56.66 32.31A6.6 6.6 0 0 1 58.33 31.61Z" fill="#0E2238" stroke="#5CC8FF" strokeWidth="1" />
      <Circle cx="60" cy="38" r="2.6" fill="#FF7A1A" />
      <Path d="M6.6 89.3 A55 14 -14 0 0 113.4 62.7" fill="none" stroke="#FF7A1A" strokeWidth="3.2" strokeLinecap="round" />
      <Circle cx="105.4" cy="73.1" r="4.6" fill="#FF7A1A" />
    </Svg>
  );
}

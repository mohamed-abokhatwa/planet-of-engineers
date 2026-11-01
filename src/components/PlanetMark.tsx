import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

// Brand colours stay the same in both themes, like any logo.
const ORANGE = '#FF7A1A';
const CYAN = '#5CC8FF';
const FILL = '#0E2238';
const FACE = '#0A1A2C';

// 12-tooth gear, outer radius 42, root radius 35.5, centred at (60, 60).
const GEAR = 'M54.26 24.97L55.39 18.25A42 42 0 0 1 64.61 18.25L65.74 24.97A35.5 35.5 0 0 1 72.55 26.79L72.55 26.79L76.88 21.54A42 42 0 0 1 84.86 26.15L82.49 32.53A35.5 35.5 0 0 1 87.47 37.51L87.47 37.51L93.85 35.14A42 42 0 0 1 98.46 43.12L93.21 47.45A35.5 35.5 0 0 1 95.03 54.26L95.03 54.26L101.75 55.39A42 42 0 0 1 101.75 64.61L95.03 65.74A35.5 35.5 0 0 1 93.21 72.55L93.21 72.55L98.46 76.88A42 42 0 0 1 93.85 84.86L87.47 82.49A35.5 35.5 0 0 1 82.49 87.47L82.49 87.47L84.86 93.85A42 42 0 0 1 76.88 98.46L72.55 93.21A35.5 35.5 0 0 1 65.74 95.03L65.74 95.03L64.61 101.75A42 42 0 0 1 55.39 101.75L54.26 95.03A35.5 35.5 0 0 1 47.45 93.21L47.45 93.21L43.12 98.46A42 42 0 0 1 35.14 93.85L37.51 87.47A35.5 35.5 0 0 1 32.53 82.49L32.53 82.49L26.15 84.86A42 42 0 0 1 21.54 76.88L26.79 72.55A35.5 35.5 0 0 1 24.97 65.74L24.97 65.74L18.25 64.61A42 42 0 0 1 18.25 55.39L24.97 54.26A35.5 35.5 0 0 1 26.79 47.45L26.79 47.45L21.54 43.12A42 42 0 0 1 26.15 35.14L32.53 37.51A35.5 35.5 0 0 1 37.51 32.53L37.51 32.53L35.14 26.15A42 42 0 0 1 43.12 21.54L47.45 26.79A35.5 35.5 0 0 1 54.26 24.97Z';

/** The app mark: a blueprint planet set in a gear, with a safety-orange orbit. */
export function PlanetMark({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Planet of Engineers">
      {/* back half of the orbit, behind the gear */}
      <Ellipse cx="60" cy="62" rx="56" ry="15" fill="none" stroke={ORANGE} strokeWidth="2.6" strokeOpacity="0.45" transform="rotate(-18 60 62)" />
      <Path d={GEAR} fill={FILL} stroke={CYAN} strokeWidth="1.6" strokeLinejoin="round" />
      <Circle cx="60" cy="60" r="29" fill={FACE} stroke={CYAN} strokeWidth="1.3" />
      {/* globe: equator, parallels and meridians */}
      <Ellipse cx="60" cy="60" rx="29" ry="9.3" fill="none" stroke={CYAN} strokeOpacity="0.6" strokeWidth="1.1" />
      <Ellipse cx="60" cy="60" rx="10.4" ry="29" fill="none" stroke={CYAN} strokeOpacity="0.6" strokeWidth="1.1" />
      <Path d="M60 31 V89" stroke={CYAN} strokeOpacity="0.5" strokeWidth="1.1" />
      <Path d="M35.1 45.5 Q60 39.1 84.9 45.5" fill="none" stroke={CYAN} strokeOpacity="0.42" strokeWidth="1" />
      <Path d="M35.1 74.5 Q60 80.9 84.9 74.5" fill="none" stroke={CYAN} strokeOpacity="0.42" strokeWidth="1" />
      {/* front half of the orbit, over the gear, and the satellite */}
      <Path d="M6.9 79.4 A56 15 -18 0 0 113.1 44.6" fill="none" stroke={ORANGE} strokeWidth="3.2" strokeLinecap="round" />
      <Circle cx="106" cy="43" r="4.8" fill={ORANGE} />
    </Svg>
  );
}

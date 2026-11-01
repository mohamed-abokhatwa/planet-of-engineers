import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { colors } from '../theme';

/** The app mark: a blueprint planet (meridians and parallels) with a safety-orange orbit. */
export function PlanetMark({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Planet of Engineers">
      {/* back half of the orbit */}
      <Ellipse cx="60" cy="62" rx="54" ry="16" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeOpacity="0.45" transform="rotate(-18 60 62)" />
      <G>
        <Circle cx="60" cy="60" r="34" fill="#0E2238" stroke={colors.cyan} strokeWidth="1.6" />
        {/* parallels */}
        <Ellipse cx="60" cy="60" rx="34" ry="11" fill="none" stroke={colors.cyan} strokeOpacity="0.55" strokeWidth="1" />
        <Path d="M30 46 Q60 38 90 46" fill="none" stroke={colors.cyan} strokeOpacity="0.4" strokeWidth="1" />
        <Path d="M30 74 Q60 82 90 74" fill="none" stroke={colors.cyan} strokeOpacity="0.4" strokeWidth="1" />
        {/* meridians */}
        <Ellipse cx="60" cy="60" rx="12" ry="34" fill="none" stroke={colors.cyan} strokeOpacity="0.55" strokeWidth="1" />
        <Path d="M60 26 V94" stroke={colors.cyan} strokeOpacity="0.45" strokeWidth="1" />
      </G>
      {/* front half of the orbit, drawn over the planet */}
      <Path d="M8.6 78.6 A54 16 -18 0 0 111.4 45.4" fill="none" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
      {/* satellite */}
      <Circle cx="104" cy="44" r="4.5" fill={colors.accent} />
    </Svg>
  );
}

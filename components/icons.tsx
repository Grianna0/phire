import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

type IconProps = { size?: number; color?: string };

export function GearIcon({ size = 24, color = colors.deepAccent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.3 3.2a1.7 1.7 0 0 1 3.4 0l.1.9a1.7 1.7 0 0 0 2.5 1l.8-.4a1.7 1.7 0 0 1 2.4 2.4l-.4.8a1.7 1.7 0 0 0 1 2.5l.9.1a1.7 1.7 0 0 1 0 3.4l-.9.1a1.7 1.7 0 0 0-1 2.5l.4.8a1.7 1.7 0 0 1-2.4 2.4l-.8-.4a1.7 1.7 0 0 0-2.5 1l-.1.9a1.7 1.7 0 0 1-3.4 0l-.1-.9a1.7 1.7 0 0 0-2.5-1l-.8.4a1.7 1.7 0 0 1-2.4-2.4l.4-.8a1.7 1.7 0 0 0-1-2.5l-.9-.1a1.7 1.7 0 0 1 0-3.4l.9-.1a1.7 1.7 0 0 0 1-2.5l-.4-.8a1.7 1.7 0 0 1 2.4-2.4l.8.4a1.7 1.7 0 0 0 2.5-1l.1-.9Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function ChartIcon({ size = 24, color = colors.deepAccent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={12} width={4} height={8} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={10} y={4} width={4} height={16} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={16} y={9} width={4} height={11} rx={1.5} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function LockIcon({ size = 16, color = colors.mutedText }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M5 7V5a3 3 0 0 1 6 0v2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Rect x={3} y={7} width={10} height={7} rx={2} fill={color} />
    </Svg>
  );
}

export function FlameIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M10 1.5c1.2 2.6 4.8 4.6 4.8 9.1 0 3.6-2.3 6.4-4.8 6.4s-4.8-2.8-4.8-6.4c0-2.2 1.1-3.6 2-4.6.3 1.2.8 2 1.6 2.4C8.6 6 9.1 3.6 10 1.5Z"
        fill={color}
      />
    </Svg>
  );
}

import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Falls back to the light palette when the device is in light mode.
 * When a `dark` key is defined in constants/colors.ts, this hook will
 * automatically switch palettes based on the device's appearance setting.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette: typeof colors.light =
    scheme === 'dark' && 'dark' in colors
      ? (colors as { dark: typeof colors.light }).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}

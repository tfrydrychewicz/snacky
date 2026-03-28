/**
 * Snacky Design Tokens — "Living Laboratory" system from Stitch
 *
 * Material 3-inspired tonal palette with editorial typography.
 * Colors use kebab-case keys matching the Stitch Tailwind config.
 */

export const colors = {
  primary: '#006E1C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#4CAF50',
  onPrimaryContainer: '#003C0B',
  primaryFixed: '#94F990',
  primaryFixedDim: '#78DC77',

  secondary: '#4355B9',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#8596FF',
  onSecondaryContainer: '#11278E',
  secondaryFixed: '#DEE0FF',
  secondaryFixedDim: '#BAC3FF',

  tertiary: '#785900',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#C49400',
  onTertiaryContainer: '#433000',
  tertiaryFixed: '#FFDF9E',
  tertiaryFixedDim: '#FABD00',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  surface: '#F9F9F9',
  surfaceDim: '#DADADA',
  surfaceBright: '#F9F9F9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F3F3',
  surfaceContainer: '#EEEEEE',
  surfaceContainerHigh: '#E8E8E8',
  surfaceContainerHighest: '#E2E2E2',
  surfaceVariant: '#E2E2E2',

  onSurface: '#1A1C1C',
  onSurfaceVariant: '#3F4A3C',
  outline: '#6F7A6B',
  outlineVariant: '#BECAB9',

  inverseSurface: '#2F3131',
  inverseOnSurface: '#F0F1F1',
  inversePrimary: '#78DC77',

  surfaceTint: '#006E1C',
  background: '#F9F9F9',
  onBackground: '#1A1C1C',

  macro: {
    protein: '#4355B9',
    carbs: '#785900',
    fat: '#BA1A1A',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radii = {
  sm: 8,
  DEFAULT: 16,
  lg: 32,
  xl: 48,
  full: 9999,
} as const;

export const typography = {
  displayLg: { fontSize: 40, lineHeight: 48, fontWeight: '800' as const, letterSpacing: -0.5 },
  displaySm: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.3 },
  headlineLg: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.2 },
  headlineMd: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: 0 },
  titleLg: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: 0 },
  titleMd: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0.15 },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0.3 },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.25 },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: 0.2 },
  labelLg: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelSm: { fontSize: 10, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 0.8 },
} as const;

export const elevation = {
  none: {
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  ambient: {
    shadowColor: '#1A1C1C',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
    shadowOpacity: 0.06,
    elevation: 3,
  },
  float: {
    shadowColor: '#1A1C1C',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 40,
    shadowOpacity: 0.1,
    elevation: 6,
  },
} as const;

export const colors = {
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
    DEFAULT: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
  },
  accent: {
    DEFAULT: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
  },
  semantic: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    protein: '#5C6BC0',
    carbs: '#FFA726',
    fat: '#EF5350',
    fiber: '#66BB6A',
  },
  surface: {
    background: '#FAFAFA',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.5)',
  },
  surfaceDark: {
    background: '#121212',
    card: '#1E1E1E',
    elevated: '#2C2C2C',
    overlay: 'rgba(0,0,0,0.7)',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
  },
  textDark: {
    primary: '#FAFAFA',
    secondary: '#B0B0B0',
    disabled: '#616161',
    inverse: '#212121',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  displayLarge: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: 0 },
  displayMedium: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0 },
  headlineLarge: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const, letterSpacing: 0 },
  headlineMedium: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const, letterSpacing: 0.15 },
  titleLarge: { fontSize: 18, lineHeight: 24, fontWeight: '500' as const, letterSpacing: 0 },
  titleMedium: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: 0.15 },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.25 },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.5 },
} as const;

export const elevation = {
  none: { shadowOpacity: 0, shadowOffset: { width: 0, height: 0 }, shadowRadius: 0, elevation: 0 },
  low: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, shadowOpacity: 0.12, elevation: 2 },
  medium: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, shadowOpacity: 0.16, elevation: 4 },
  high: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.2, elevation: 8 },
} as const;

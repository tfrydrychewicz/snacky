export const colors = {
  primary: {
    DEFAULT: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
  },
  accent: {
    DEFAULT: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
  },
  surface: {
    background: '#FAFAFA',
    card: '#FFFFFF',
    elevated: '#F5F5F5',
  },
  semantic: {
    protein: '#5C6BC0',
    carbs: '#FFB300',
    fat: '#EF5350',
    fiber: '#66BB6A',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
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
  card: 12,
  button: 8,
  pill: 9999,
} as const;

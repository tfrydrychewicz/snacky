import { colors } from './tokens';

export const lightTheme = {
  dark: false,
  colors: {
    primary: colors.primary.DEFAULT,
    background: colors.surface.background,
    card: colors.surface.card,
    text: colors.text.primary,
    border: '#E0E0E0',
    notification: colors.accent.DEFAULT,
  },
} as const;

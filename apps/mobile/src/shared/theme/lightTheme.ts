import type { Theme } from '@react-navigation/native';
import { colors } from './tokens';

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.surface,
    card: colors.surfaceContainerLowest,
    text: colors.onSurface,
    border: colors.outlineVariant,
    notification: colors.tertiary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

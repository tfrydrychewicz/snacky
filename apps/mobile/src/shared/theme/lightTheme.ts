import type { Theme } from '@react-navigation/native';
import { colors } from './tokens';

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary.DEFAULT,
    background: colors.surface.background,
    card: colors.surface.card,
    text: colors.text.primary,
    border: '#E0E0E0',
    notification: colors.accent.DEFAULT,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

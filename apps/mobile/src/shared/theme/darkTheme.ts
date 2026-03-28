import type { Theme } from '@react-navigation/native';
import { colors } from './tokens';

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary.light,
    background: colors.surfaceDark.background,
    card: colors.surfaceDark.card,
    text: colors.textDark.primary,
    border: '#333333',
    notification: colors.accent.light,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

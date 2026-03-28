import type { Theme } from '@react-navigation/native';
import { colors } from './tokens';

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primaryContainer,
    background: colors.inverseSurface,
    card: '#1E1E1E',
    text: colors.inverseOnSurface,
    border: '#444444',
    notification: colors.tertiaryFixedDim,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, LogOut, User } from 'lucide-react-native';
import { useAuth } from '~/app/providers/AuthProvider';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation('settings');
  const { t: tAuth } = useTranslation('auth');
  const { user, signOut } = useAuth();

  const fullName = String(user?.user_metadata?.full_name ?? '');
  const email = String(user?.email ?? '');

  const handleLogout = useCallback(() => {
    Alert.alert(tAuth('auth.logout.confirm.title'), tAuth('auth.logout.confirm.message'), [
      { text: tAuth('auth.logout.confirm.no'), style: 'cancel' },
      {
        text: tAuth('auth.logout.confirm.yes'),
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ]);
  }, [tAuth, signOut]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.lg,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ChevronLeft size={20} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={{ ...typography.headlineMd, color: colors.onSurface }}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 32,
          paddingTop: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account section */}
        <Text
          style={{
            ...typography.labelMd,
            color: colors.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.sm,
          }}
        >
          {t('settings.account')}
        </Text>

        <View
          style={{
            backgroundColor: colors.surfaceContainerLowest,
            borderRadius: radii.DEFAULT,
            padding: spacing.md,
            marginBottom: spacing.xl,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${colors.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={24} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              {fullName ? (
                <Text style={{ ...typography.titleMd, color: colors.onSurface }}>{fullName}</Text>
              ) : null}
              {email ? (
                <Text
                  style={{
                    ...typography.bodyMd,
                    color: colors.onSurfaceVariant,
                    marginTop: 2,
                  }}
                >
                  {email}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.surfaceContainerLowest,
            borderRadius: radii.DEFAULT,
            padding: spacing.md,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${colors.error}10`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={20} color={colors.error} strokeWidth={2} />
          </View>
          <Text style={{ ...typography.titleMd, color: colors.error, flex: 1 }}>
            {tAuth('auth.logout')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  ChevronLeft,
  Clock,
  Flame,
  Lightbulb,
  LogOut,
  Moon,
  BarChart3,
  User,
  UtensilsCrossed,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '~/app/providers/AuthProvider';
import { useNotifications } from '~/app/providers/NotificationProvider';
import { getSupabase } from '~/shared/api/client';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

interface NotificationPrefs {
  enabled: boolean;
  meal_reminders: boolean;
  nudges: boolean;
  weekly_report: boolean;
  streak_alerts: boolean;
  budget_alerts: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  meal_reminders: true,
  nudges: true,
  weekly_report: true,
  streak_alerts: true,
  budget_alerts: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

const QUIET_HOUR_OPTIONS = [
  { label: '20:00', value: '20:00' },
  { label: '21:00', value: '21:00' },
  { label: '22:00', value: '22:00' },
  { label: '23:00', value: '23:00' },
];

const QUIET_END_OPTIONS = [
  { label: '06:00', value: '06:00' },
  { label: '07:00', value: '07:00' },
  { label: '08:00', value: '08:00' },
  { label: '09:00', value: '09:00' },
];

const ToggleRow = ({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      opacity: disabled ? 0.45 : 1,
    }}
  >
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
      }}
    >
      <Icon size={18} color={colors.primary} strokeWidth={2} />
    </View>
    <View style={{ flex: 1, marginRight: spacing.sm }}>
      <Text style={{ ...typography.titleMd, color: colors.onSurface }}>{label}</Text>
      {description ? (
        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 }}>
          {description}
        </Text>
      ) : null}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }}
      thumbColor={value ? colors.primary : colors.outline}
    />
  </View>
);

const TimeSelector = ({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  disabled?: boolean;
}) => (
  <View
    style={{
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      opacity: disabled ? 0.45 : 1,
    }}
  >
    <Text
      style={{
        ...typography.bodySm,
        color: colors.onSurfaceVariant,
        marginBottom: spacing.sm,
      }}
    >
      {label}
    </Text>
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          disabled={disabled}
          onPress={() => onChange(opt.value)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radii.sm,
            backgroundColor:
              value === opt.value ? colors.primaryContainer : colors.surfaceContainerHigh,
          }}
        >
          <Text
            style={{
              ...typography.labelMd,
              color: value === opt.value ? colors.onPrimaryContainer : colors.onSurfaceVariant,
            }}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const SectionHeader = ({ label }: { label: string }) => (
  <Text
    style={{
      ...typography.labelMd,
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    }}
  >
    {label}
  </Text>
);

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: radii.DEFAULT,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    }}
  >
    {children}
  </View>
);

const Divider = () => (
  <View
    style={{
      height: 1,
      backgroundColor: colors.surfaceContainerHigh,
      marginLeft: 68,
    }}
  />
);

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation('settings');
  const { t: tAuth } = useTranslation('auth');
  const { user, signOut } = useAuth();
  const { permissionGranted, requestPermission } = useNotifications();

  const fullName = String(user?.user_metadata?.full_name ?? '');
  const email = String(user?.email ?? '');

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('user_profiles')
        .select('notification_prefs')
        .eq('id', user.id)
        .single();

      if (data?.notification_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_prefs as Partial<NotificationPrefs>) });
      }
      setLoaded(true);
    };

    void load();
  }, [user]);

  const savePrefs = useCallback(
    async (updated: NotificationPrefs) => {
      if (!user || saving) return;
      setSaving(true);
      try {
        const supabase = getSupabase();
        await supabase
          .from('user_profiles')
          .update({ notification_prefs: updated })
          .eq('id', user.id);
      } catch (err) {
        console.warn('[Settings] Failed to save prefs:', err);
      } finally {
        setSaving(false);
      }
    },
    [user, saving],
  );

  const updatePref = useCallback(
    <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      void savePrefs(updated);
    },
    [prefs, savePrefs],
  );

  const handleMasterToggle = useCallback(
    async (value: boolean) => {
      if (value && !permissionGranted) {
        const granted = await requestPermission();
        if (!granted) return;
      }
      updatePref('enabled', value);
    },
    [permissionGranted, requestPermission, updatePref],
  );

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

  const quietHoursEnabled = prefs.quiet_hours_start !== null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
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
          paddingTop: spacing.xs,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <SectionHeader label={t('settings.account')} />
        <SectionCard>
          <View
            style={{
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
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
        </SectionCard>

        {/* Notifications */}
        {loaded && (
          <>
            <SectionHeader label={t('settings.notifications')} />
            <SectionCard>
              <ToggleRow
                icon={prefs.enabled ? Bell : BellOff}
                label={t('settings.notifications_enable')}
                description={t('settings.notifications_enable_desc')}
                value={prefs.enabled}
                onChange={handleMasterToggle}
              />
              <Divider />
              <ToggleRow
                icon={UtensilsCrossed}
                label={t('settings.meal_reminders')}
                description={t('settings.meal_reminders_desc')}
                value={prefs.meal_reminders}
                onChange={(v) => updatePref('meal_reminders', v)}
                disabled={!prefs.enabled}
              />
              <Divider />
              <ToggleRow
                icon={Flame}
                label={t('settings.streak_alerts')}
                description={t('settings.streak_alerts_desc')}
                value={prefs.streak_alerts}
                onChange={(v) => updatePref('streak_alerts', v)}
                disabled={!prefs.enabled}
              />
              <Divider />
              <ToggleRow
                icon={Zap}
                label={t('settings.budget_alerts')}
                description={t('settings.budget_alerts_desc')}
                value={prefs.budget_alerts}
                onChange={(v) => updatePref('budget_alerts', v)}
                disabled={!prefs.enabled}
              />
              <Divider />
              <ToggleRow
                icon={Lightbulb}
                label={t('settings.nudges')}
                description={t('settings.nudges_desc')}
                value={prefs.nudges}
                onChange={(v) => updatePref('nudges', v)}
                disabled={!prefs.enabled}
              />
              <Divider />
              <ToggleRow
                icon={BarChart3}
                label={t('settings.weekly_report')}
                description={t('settings.weekly_report_desc')}
                value={prefs.weekly_report}
                onChange={(v) => updatePref('weekly_report', v)}
                disabled={!prefs.enabled}
              />
            </SectionCard>

            {/* Quiet Hours */}
            <SectionCard>
              <ToggleRow
                icon={Moon}
                label={t('settings.quiet_hours')}
                description={t('settings.quiet_hours_desc')}
                value={quietHoursEnabled}
                onChange={(v) => {
                  if (v) {
                    updatePref('quiet_hours_start', '22:00');
                    updatePref('quiet_hours_end', '07:00');
                  } else {
                    updatePref('quiet_hours_start', null);
                    updatePref('quiet_hours_end', null);
                  }
                }}
                disabled={!prefs.enabled}
              />
              {quietHoursEnabled && prefs.enabled && (
                <>
                  <Divider />
                  <TimeSelector
                    label={t('settings.quiet_start')}
                    value={prefs.quiet_hours_start}
                    options={QUIET_HOUR_OPTIONS}
                    onChange={(v) => updatePref('quiet_hours_start', v)}
                  />
                  <TimeSelector
                    label={t('settings.quiet_end')}
                    value={prefs.quiet_hours_end}
                    options={QUIET_END_OPTIONS}
                    onChange={(v) => updatePref('quiet_hours_end', v)}
                  />
                </>
              )}
            </SectionCard>

            {/* Permission status */}
            {!permissionGranted && prefs.enabled && (
              <Pressable
                onPress={() => void requestPermission()}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  backgroundColor: `${colors.tertiary}15`,
                  borderRadius: radii.DEFAULT,
                  padding: spacing.md,
                  marginTop: spacing.sm,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Clock size={20} color={colors.tertiary} strokeWidth={2} />
                <Text style={{ ...typography.bodyMd, color: colors.tertiary, flex: 1 }}>
                  {t('settings.permission_needed')}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* Logout */}
        <SectionHeader label="" />
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

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, type ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Plus, Scale, Ruler, Activity, Trash2, ArrowUpDown } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { EmptyState } from '~/shared/components/EmptyState';
import { SkeletonLoader } from '~/shared/components/SkeletonLoader';
import { useMeasurements, useDeleteMeasurement } from '../hooks/useMeasurements';
import type { MeasurementRow } from '../types';

type SortOrder = 'newest' | 'oldest';

function formatDate(isoDate: string, locale: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const MeasurementCard = ({
  item,
  index,
  onDelete,
  locale,
  t,
}: {
  item: MeasurementRow;
  index: number;
  onDelete: (id: string) => void;
  locale: string;
  t: ReturnType<typeof useTranslation<'progress'>>['t'];
}) => {
  const fields = useMemo(() => {
    const result: Array<{ label: string; value: string; icon: typeof Scale }> = [];
    if (item.weight_kg != null)
      result.push({ label: t('weight'), value: `${item.weight_kg} kg`, icon: Scale });
    if (item.waist_cm != null)
      result.push({ label: t('waist'), value: `${item.waist_cm} cm`, icon: Ruler });
    if (item.chest_cm != null)
      result.push({ label: t('chest'), value: `${item.chest_cm} cm`, icon: Ruler });
    if (item.hips_cm != null)
      result.push({ label: t('hips'), value: `${item.hips_cm} cm`, icon: Ruler });
    if (item.body_fat_pct != null)
      result.push({ label: t('body_fat'), value: `${item.body_fat_pct}%`, icon: Activity });
    return result;
  }, [item, t]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40)
        .duration(250)
        .springify()}
      style={{
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radii.DEFAULT,
        padding: spacing.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        ...elevation.ambient,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text style={{ ...typography.titleMd, color: colors.onSurface }}>
            {formatDate(item.measured_at, locale)}
          </Text>
          <Text
            style={{ ...typography.labelSm, color: colors.outline, textTransform: 'uppercase' }}
          >
            {t(`source_${item.source}`)}
          </Text>
        </View>

        <Pressable
          onPress={() => onDelete(item.id)}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${colors.error}10`,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Trash2 size={16} color={colors.error} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {fields.map((field) => {
          const IconComponent = field.icon;
          return (
            <View
              key={field.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceContainerLow,
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                gap: spacing.xs,
              }}
            >
              <IconComponent size={14} color={colors.primary} strokeWidth={2} />
              <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>
                {field.label}
              </Text>
              <Text style={{ ...typography.labelLg, color: colors.onSurface }}>{field.value}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};

export const MeasurementListScreen = () => {
  const { t, i18n } = useTranslation('progress');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { data: measurements, isLoading } = useMeasurements();
  const deleteMeasurement = useDeleteMeasurement();

  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const sorted = useMemo(() => {
    if (!measurements) return [];
    const copy = [...measurements];
    if (sortOrder === 'oldest') {
      copy.reverse();
    }
    return copy;
  }, [measurements, sortOrder]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(t('delete_title'), t('delete_confirm'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => void deleteMeasurement.mutateAsync(id),
        },
      ]);
    },
    [t, deleteMeasurement],
  );

  const toggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<MeasurementRow>) => (
      <MeasurementCard
        item={item}
        index={index}
        onDelete={handleDelete}
        locale={i18n.language}
        t={t}
      />
    ),
    [handleDelete, i18n.language, t],
  );

  const keyExtractor = useCallback((item: MeasurementRow) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceContainerLow,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} color={colors.onSurface} strokeWidth={2} />
        </Pressable>
        <Text style={{ ...typography.titleLg, flex: 1 }}>{t('measurements')}</Text>

        <Pressable
          onPress={toggleSort}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: radii.full,
          }}
        >
          <ArrowUpDown size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text style={{ ...typography.labelSm, color: colors.onSurfaceVariant }}>
            {t(sortOrder === 'newest' ? 'sort_newest' : 'sort_oldest')}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <SkeletonLoader key={i} height={100} borderRadius={16} />
          ))}
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState Icon={Scale} title={t('empty_title')} subtitle={t('empty_subtitle')} />
      ) : (
        <FlatList
          data={sorted}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + spacing.lg,
          right: spacing.lg,
        }}
      >
        <Pressable
          onPress={() => navigation.navigate('MeasurementInput' as never)}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.9 : 1 }],
            ...elevation.float,
          })}
        >
          <Plus size={24} color={colors.onPrimary} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
};

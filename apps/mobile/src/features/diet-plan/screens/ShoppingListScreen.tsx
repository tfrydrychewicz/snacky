import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Check, Circle } from 'lucide-react-native';
import type { RootStackParamList } from '~/app/navigation/types';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { usePlanById } from '../hooks/useActivePlan';
import type { ShoppingListItem } from '../types';

type Route = RouteProp<RootStackParamList, 'ShoppingList'>;

const CATEGORY_ORDER = [
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'grains_bread',
  'pantry',
  'oils_condiments',
  'frozen',
  'other',
];

export const ShoppingListScreen = () => {
  const { t } = useTranslation('dietPlan');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { planId } = route.params;

  const { data: plan, isLoading } = usePlanById(planId);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const groupedItems = useMemo(() => {
    const items = plan?.shopping_list ?? [];
    const groups = new Map<string, ShoppingListItem[]>();

    for (const item of items) {
      const cat = item.category;
      const existing = groups.get(cat) ?? [];
      existing.push(item);
      groups.set(cat, existing);
    }

    return CATEGORY_ORDER
      .filter((cat) => groups.has(cat))
      .map((cat) => ({
        category: cat,
        items: groups.get(cat)!.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [plan]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalItems = groupedItems.reduce((s, g) => s + g.items.length, 0);
  const checkedCount = checked.size;

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
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={{ ...typography.titleLg, color: colors.onSurface }}>
            {t('shopping.title')}
          </Text>
        </View>

        {totalItems > 0 && (
          <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant }}>
            {checkedCount}/{totalItems}
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {groupedItems.map(({ category, items }, gi) => (
          <Animated.View
            key={category}
            entering={FadeInDown.delay(gi * 60).duration(300).springify()}
          >
            {/* Category header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ ...typography.titleMd, color: colors.onSurface }}>
                {t(`shopping.categories.${category}`, { defaultValue: category })}
              </Text>
              <Text style={{ ...typography.labelSm, color: colors.outline }}>
                {t('shopping.items', { count: items.length })}
              </Text>
            </View>

            {/* Items */}
            <View
              style={{
                backgroundColor: colors.surfaceContainerLowest,
                borderRadius: radii.DEFAULT,
                overflow: 'hidden',
                ...elevation.ambient,
              }}
            >
              {items.map((item, i) => {
                const isChecked = checked.has(item.name);
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => toggleItem(item.name)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: spacing.md,
                      gap: spacing.sm,
                      borderBottomWidth: i < items.length - 1 ? 1 : 0,
                      borderBottomColor: colors.surfaceContainerHigh,
                    }}
                  >
                    {/* Checkbox */}
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: isChecked ? 0 : 2,
                        borderColor: colors.outline,
                        backgroundColor: isChecked ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isChecked && <Check size={14} color={colors.onPrimary} strokeWidth={3} />}
                    </View>

                    {/* Name */}
                    <Text
                      style={{
                        ...typography.bodyMd,
                        color: isChecked ? colors.outline : colors.onSurface,
                        flex: 1,
                        textDecorationLine: isChecked ? 'line-through' : 'none',
                      }}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>

                    {/* Quantity */}
                    <Text
                      style={{
                        ...typography.labelLg,
                        color: isChecked ? colors.outline : colors.onSurfaceVariant,
                      }}
                    >
                      {item.display_qty}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ))}

        {groupedItems.length === 0 && (
          <Text style={{ ...typography.bodyLg, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl }}>
            No shopping list available
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

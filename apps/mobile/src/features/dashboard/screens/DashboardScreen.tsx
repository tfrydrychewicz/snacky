import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BentoGrid, BentoRow, BentoTile } from '../components/BentoGrid';
import { colors } from '~/shared/theme/tokens';

export const DashboardScreen = () => {
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F5F5F5' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 16 }}
      >
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#212121' }}>
          {t('dashboard.greeting', { name: 'User' })}
        </Text>
        <Text style={{ fontSize: 15, color: '#757575', marginTop: 4 }}>
          {t('dashboard.subtitle')}
        </Text>
      </Animated.View>

      <BentoGrid>
        {/* Calorie Budget — full width */}
        <BentoRow>
          <BentoTile span={2} index={0}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.calorieBudget')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12 }}>
              <Text style={{ fontSize: 40, fontWeight: '700', color: colors.primary.DEFAULT }}>
                0
              </Text>
              <Text style={{ fontSize: 18, color: '#BDBDBD', marginLeft: 4 }}>
                / 2,100
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>kcal</Text>

            {/* Progress bar */}
            <View style={{ height: 6, backgroundColor: '#E8F5E9', borderRadius: 3, marginTop: 12 }}>
              <View style={{ height: 6, backgroundColor: colors.primary.DEFAULT, borderRadius: 3, width: '0%' }} />
            </View>
          </BentoTile>
        </BentoRow>

        {/* Macro row — 3 tiles */}
        <BentoRow>
          <BentoTile index={1}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.semantic.protein, marginBottom: 8 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.semantic.protein, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.protein')}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#212121', marginTop: 8 }}>
              0<Text style={{ fontSize: 14, fontWeight: '400', color: '#9E9E9E' }}>g</Text>
            </Text>
          </BentoTile>
          <BentoTile index={2}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.semantic.carbs, marginBottom: 8 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.semantic.carbs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.carbs')}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#212121', marginTop: 8 }}>
              0<Text style={{ fontSize: 14, fontWeight: '400', color: '#9E9E9E' }}>g</Text>
            </Text>
          </BentoTile>
          <BentoTile index={3}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.semantic.fat, marginBottom: 8 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.semantic.fat, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.fat')}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#212121', marginTop: 8 }}>
              0<Text style={{ fontSize: 14, fontWeight: '400', color: '#9E9E9E' }}>g</Text>
            </Text>
          </BentoTile>
        </BentoRow>

        {/* Streak + Today's Meals row */}
        <BentoRow>
          <BentoTile index={4}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.streak')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12 }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: colors.primary.DEFAULT }}>
                0
              </Text>
              <Text style={{ fontSize: 14, color: '#9E9E9E', marginLeft: 4 }}>
                {t('dashboard.tiles.days')}
              </Text>
            </View>
            <Text style={{ fontSize: 20, marginTop: 4 }}>🔥</Text>
          </BentoTile>
          <BentoTile index={5}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.todaysMeals')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 12 }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#212121' }}>
                0
              </Text>
              <Text style={{ fontSize: 14, color: '#9E9E9E', marginLeft: 4 }}>
                / 3
              </Text>
            </View>
            <Text style={{ fontSize: 20, marginTop: 4 }}>🍽️</Text>
          </BentoTile>
        </BentoRow>

        {/* Weekly Trend — full width */}
        <BentoRow>
          <BentoTile span={2} index={6} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('dashboard.tiles.weeklyTrend')}
            </Text>
            <Text style={{ fontSize: 14, color: '#BDBDBD', marginTop: 16, textAlign: 'center' }}>
              {t('dashboard.tiles.noDataYet')}
            </Text>
          </BentoTile>
        </BentoRow>
      </BentoGrid>
    </ScrollView>
  );
};

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Scale, Ruler, Activity, Check } from 'lucide-react-native';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { useAddMeasurement } from '../hooks/useMeasurements';
import type { RootStackParamList } from '~/app/navigation/types';

type MeasurementInputRouteProp = RouteProp<RootStackParamList, 'MeasurementInput'>;

interface FieldConfig {
  key: string;
  labelKey: string;
  unit: string;
  icon: typeof Scale;
  required?: boolean;
  min: number;
  max: number;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'weight_kg',
    labelKey: 'weight',
    unit: 'kg',
    icon: Scale,
    required: true,
    min: 20,
    max: 300,
  },
  { key: 'waist_cm', labelKey: 'waist', unit: 'cm', icon: Ruler, min: 30, max: 200 },
  { key: 'chest_cm', labelKey: 'chest', unit: 'cm', icon: Ruler, min: 30, max: 200 },
  { key: 'hips_cm', labelKey: 'hips', unit: 'cm', icon: Ruler, min: 30, max: 200 },
  { key: 'body_fat_pct', labelKey: 'body_fat', unit: '%', icon: Activity, min: 1, max: 70 },
];

export const MeasurementInputScreen = () => {
  const { t } = useTranslation('progress');
  const navigation = useNavigation();
  const route = useRoute<MeasurementInputRouteProp>();
  const insets = useSafeAreaInsets();
  const addMeasurement = useAddMeasurement();

  const quickWeight = route.params?.quickWeight;

  const [values, setValues] = useState<Record<string, string>>({});
  const [source] = useState<'manual' | 'healthkit' | 'health_connect'>('manual');

  const updateValue = useCallback((key: string, text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setValues((prev) => ({ ...prev, [key]: sanitized }));
  }, []);

  const handleSave = useCallback(async () => {
    const weightStr = values.weight_kg;
    if (!weightStr || parseFloat(weightStr) <= 0) {
      Alert.alert(t('error'), t('weight_required'));
      return;
    }

    const input: Record<string, number | string | undefined> = {
      source,
      measured_at: new Date().toISOString(),
    };

    for (const field of FIELDS) {
      const val = values[field.key];
      if (val) {
        const num = parseFloat(val);
        if (num >= field.min && num <= field.max) {
          input[field.key] = num;
        }
      }
    }

    try {
      await addMeasurement.mutateAsync(input);
      navigation.goBack();
    } catch {
      Alert.alert(t('error'), t('save_failed'));
    }
  }, [values, source, addMeasurement, navigation, t]);

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
        <Text style={{ ...typography.titleLg, flex: 1 }}>
          {quickWeight ? t('quick_weight_title') : t('add_measurement')}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + 100,
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              ...typography.bodySm,
              color: colors.onSurfaceVariant,
              marginBottom: spacing.xs,
            }}
          >
            {t('source_label')}: {t(`source_${source}`)}
          </Text>

          {FIELDS.map((field, index) => {
            if (quickWeight && field.key !== 'weight_kg') return null;

            const IconComponent = field.icon;

            return (
              <Animated.View
                key={field.key}
                entering={FadeInDown.delay(index * 60)
                  .duration(300)
                  .springify()}
                style={{
                  backgroundColor: colors.surfaceContainerLowest,
                  borderRadius: radii.DEFAULT,
                  padding: spacing.lg,
                  ...elevation.ambient,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: `${colors.primary}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComponent size={16} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={{ ...typography.titleMd, flex: 1 }}>
                    {t(field.labelKey)}
                    {field.required && <Text style={{ color: colors.error }}> *</Text>}
                  </Text>
                  <Text style={{ ...typography.labelMd, color: colors.outline }}>{field.unit}</Text>
                </View>

                <TextInput
                  value={values[field.key] ?? ''}
                  onChangeText={(text) => updateValue(field.key, text)}
                  placeholder={`${field.min}–${field.max}`}
                  placeholderTextColor={colors.outlineVariant}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus={index === 0}
                  style={{
                    ...typography.displaySm,
                    color: colors.onSurface,
                    textAlign: 'center',
                    paddingVertical: spacing.md,
                    borderBottomWidth: 2,
                    borderBottomColor: values[field.key] ? colors.primary : colors.outlineVariant,
                  }}
                />
              </Animated.View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + spacing.lg,
          left: spacing.lg,
          right: spacing.lg,
        }}
      >
        <Pressable
          onPress={() => void handleSave()}
          disabled={addMeasurement.isPending || !values.weight_kg}
          style={({ pressed }) => ({
            backgroundColor: values.weight_kg ? colors.primary : colors.outline,
            borderRadius: radii.lg,
            paddingVertical: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            opacity: pressed ? 0.8 : addMeasurement.isPending ? 0.6 : 1,
            ...elevation.float,
          })}
        >
          <Check size={20} color={colors.onPrimary} strokeWidth={2.5} />
          <Text style={{ ...typography.titleMd, color: colors.onPrimary, fontWeight: '700' }}>
            {addMeasurement.isPending ? t('saving') : t('save')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

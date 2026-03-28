import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';
import { colors, spacing, typography, radii, elevation } from '~/shared/theme/tokens';
import { calculateTDEE, calculateMacros } from '../utils/tdee';
import {
  onboardingSchema,
  STEP_SCHEMAS,
  DEFAULT_VALUES,
  type OnboardingFormData,
} from '../schemas/onboarding';
import { StepProgressBar } from '../components/StepProgressBar';
import { BiometricsStep } from '../components/BiometricsStep';
import { GoalStep } from '../components/GoalStep';
import { TargetStep } from '../components/TargetStep';
import { DietaryRestrictionsStep } from '../components/DietaryRestrictionsStep';
import { LifestyleStep } from '../components/LifestyleStep';
import { PsychoBehavioralStep } from '../components/PsychoBehavioralStep';
import { NotificationPrefsStep } from '../components/NotificationPrefsStep';
import type { OnboardingStackParamList } from '~/app/navigation/types';

const TOTAL_STEPS = 7;

export const OnboardingScreen = () => {
  const { t } = useTranslation('onboarding');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Steps'>>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });

  const validateCurrentStep = useCallback((): boolean => {
    const schema = STEP_SCHEMAS[currentStep];
    if (!schema) return true;

    const values = form.getValues();
    const result = schema.safeParse(values);
    return result.success;
  }, [currentStep, form]);

  const handleNext = useCallback(() => {
    const isValid = validateCurrentStep();
    if (!isValid) {
      Alert.alert(t('title'), 'Please fill in all required fields.');
      return;
    }
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, validateCurrentStep, t]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    const data = form.getValues();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const tdee = calculateTDEE(
        data.weightKg,
        data.heightCm,
        data.dateOfBirth,
        data.biologicalSex,
        data.activityLevel,
      );
      const macros = calculateMacros(tdee, data.weightKg, data.goalType);

      const allergies = [...data.allergies];
      if (data.customAllergy.trim()) {
        allergies.push(data.customAllergy.trim());
      }

      const { error } = await getSupabase()
        .from('user_profiles')
        .update({
          date_of_birth: data.dateOfBirth,
          biological_sex: data.biologicalSex,
          height_cm: data.heightCm,
          activity_level: data.activityLevel,
          goal_type: data.goalType,
          goal_weight_kg: data.goalWeightKg,
          goal_timeline_weeks: data.goalTimelineWeeks,
          dietary_restrictions: data.dietaryRestrictions,
          allergies,
          cooking_skill: data.cookingSkill,
          cooking_time_pref: data.cookingTimePref,
          cuisine_preferences: data.cuisinePreferences,
          psych_profile: {
            eating_triggers: data.eatingTriggers,
            snacking_pattern: data.snackingPattern,
            cfc_score: data.cfcScore,
          },
          notification_prefs: {
            enabled: data.notificationsEnabled,
            meal_reminders: data.mealReminders,
            nudges: data.nudges,
            weekly_report: data.weeklyReport,
          },
          tdee_kcal: tdee,
          target_kcal: macros.targetKcal,
          target_protein_g: macros.proteinG,
          target_carbs_g: macros.carbsG,
          target_fat_g: macros.fatG,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Also update the initial weight as a measurement
      await getSupabase().from('measurements').insert({
        user_id: user.id,
        weight_kg: data.weightKg,
        source: 'onboarding',
      });

      navigation.replace('Complete', {
        tdee,
        targetKcal: macros.targetKcal,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save onboarding data';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, user, navigation]);

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BiometricsStep form={form} />;
      case 1:
        return <GoalStep form={form} />;
      case 2:
        return <TargetStep form={form} />;
      case 3:
        return <DietaryRestrictionsStep form={form} />;
      case 4:
        return <LifestyleStep form={form} />;
      case 5:
        return <PsychoBehavioralStep form={form} />;
      case 6:
        return <NotificationPrefsStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <StepProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <View style={{ flex: 1 }}>{renderStep()}</View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            paddingTop: spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.outlineVariant + '30',
          }}
        >
          {currentStep > 0 ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radii.lg,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <ChevronLeft size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
              <Text
                style={{
                  ...typography.labelLg,
                  color: colors.onSurfaceVariant,
                  marginLeft: spacing.xs,
                }}
              >
                {t('back')}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}

          <Pressable
            onPress={() => {
              if (isLastStep) {
                void handleSubmit();
              } else {
                void handleNext();
              }
            }}
            disabled={isSubmitting}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.sm + 4,
              paddingHorizontal: spacing.xl,
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              opacity: pressed || isSubmitting ? 0.7 : 1,
              ...elevation.ambient,
            })}
          >
            <Text
              style={{
                ...typography.labelLg,
                color: colors.onPrimary,
                marginRight: spacing.xs,
              }}
            >
              {isLastStep ? t('finish') : t('next')}
            </Text>
            {isLastStep ? (
              <Check size={18} color={colors.onPrimary} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={18} color={colors.onPrimary} strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

import type { UseFormReturn } from 'react-hook-form';
import type { OnboardingFormData } from '../schemas/onboarding';

export interface StepFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<OnboardingFormData, any, any>;
}

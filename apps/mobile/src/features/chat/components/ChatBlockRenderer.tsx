import React from 'react';
import { View } from 'react-native';
import type { ChatBlock } from '@snacky/shared-types';
import { MealCard } from './MealCard';
import { InlineCalorieChart } from './InlineCalorieChart';
import { InlineMacroChart } from './InlineMacroChart';
import { spacing } from '~/shared/theme/tokens';

interface ChatBlockRendererProps {
  blocks: ChatBlock[];
}

export const ChatBlockRenderer = ({ blocks }: ChatBlockRendererProps) => {
  if (blocks.length === 0) return null;

  return (
    <View style={{ gap: spacing.md, marginTop: spacing.md }}>
      {blocks.map((block, index) => (
        <RenderBlock key={`${block.type}-${index}`} block={block} />
      ))}
    </View>
  );
};

const RenderBlock = ({ block }: { block: ChatBlock }) => {
  switch (block.type) {
    case 'meal_summary':
      return (
        <View style={{ gap: spacing.sm }}>
          {block.meals.map((meal) => (
            <MealCard
              key={meal.meal_id}
              mealId={meal.meal_id}
              mealType={meal.meal_type}
              loggedAt={meal.logged_at}
              imageKey={meal.image_key}
              totalCalories={meal.total_calories}
              totalProteinG={meal.total_protein_g}
              totalCarbsG={meal.total_carbs_g}
              totalFatG={meal.total_fat_g}
            />
          ))}
        </View>
      );

    case 'calorie_chart':
      return <InlineCalorieChart data={block.data} targetKcal={block.target_kcal} />;

    case 'nutrient_chart':
      return <InlineMacroChart data={block.data} />;

    case 'weight_chart':
      return null;

    default:
      return null;
  }
};

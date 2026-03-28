---
name: snacky-feature-scaffold
description: >-
  Scaffold a new feature module following Snacky's Feature-Sliced Design architecture.
  Use when the user asks to create a new feature, add a new screen, set up a new feature
  module, or scaffold feature boilerplate. Generates all required files with correct
  structure, types, i18n keys, and TanStack Query hooks.
---

# Snacky Feature Scaffold

## When to Use

When creating a new feature module or adding significant new functionality to an existing feature. Ensures correct file placement, naming, and boilerplate per `PRODUCT_AND_SYSTEM_DESIGN.md` Section 7.3.

## Scaffold Steps

### 1. Determine Feature Scope

Ask (if not clear from context):

- Feature name (lowercase, hyphenated: `diet-plan`, `scanner`)
- Primary screens needed
- API endpoints it will consume (PostgREST or Edge Functions?)
- Does it need a Zustand store?

### 2. Create Directory Structure

```
src/features/{feature-name}/
├── api/
│   └── use{Feature}.ts          # TanStack Query hook
├── components/
│   └── {Feature}Card.tsx        # First UI component
├── hooks/
│   └── use{Feature}Logic.ts     # Feature-specific hook (if needed)
├── screens/
│   └── {Feature}Screen.tsx      # Primary screen
├── store/                       # Only if global state needed
│   └── {feature}Store.ts        # Zustand slice
├── types.ts                     # Feature-specific types
└── validation/                  # Only if forms
    └── {feature}Schema.ts       # Zod schemas
```

### 3. Generate Boilerplate Files

**Screen template:**

```tsx
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

export const {Feature}Screen = () => {
  const { t } = useTranslation('{feature}');

  return (
    <ErrorBoundary>
      <View className="flex-1 bg-surface-background p-md">
        {/* Screen content */}
      </View>
    </ErrorBoundary>
  );
};
```

**TanStack Query hook template:**

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api/client';
import type { {Feature}Row } from './types';

export const use{Feature}s = () =>
  useQuery({
    queryKey: ['{feature}s'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('{feature}s')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as {Feature}Row[];
    },
    staleTime: 5 * 60 * 1000,
  });
```

### 4. Create Translation Files

Add namespace files to both locales:

```
src/i18n/en/{feature}.json    →  { "{feature}.title": "..." }
src/i18n/pl/{feature}.json    →  { "{feature}.title": "..." }
```

### 5. Wire Navigation

Add the new screen to the appropriate stack navigator in `src/app/navigation/`. Follow the navigation architecture from the design doc Section 7.4.

### 6. Verify Checklist

```
- [ ] Directory structure matches Feature-Sliced Design
- [ ] No imports from other features
- [ ] Translation files created for BOTH en/ and pl/
- [ ] Screen wrapped in ErrorBoundary
- [ ] Types defined in types.ts (not inline)
- [ ] API hook uses TanStack Query (not raw supabase calls in components)
- [ ] NativeWind classNames for styling
- [ ] Screen added to navigation
```

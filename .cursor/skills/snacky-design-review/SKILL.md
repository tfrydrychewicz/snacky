---
name: snacky-design-review
description: >-
  Review code changes against PRODUCT_AND_SYSTEM_DESIGN.md for architectural compliance,
  pattern adherence, and coding standards. Use when reviewing pull requests, examining
  code changes, verifying feature implementations follow the design doc, or when the user
  asks for a code review or architecture check.
---

# Snacky Design Review

## Quick Start

When reviewing code, check compliance against `PRODUCT_AND_SYSTEM_DESIGN.md` at the repo root. Read the relevant sections of that document before providing feedback.

## Review Checklist

Run through this checklist for every review:

```
Architecture Compliance:
- [ ] Feature-Sliced Design: code placed in correct feature module
- [ ] No cross-feature imports (feature A never imports from feature B)
- [ ] Shared code in src/shared/, not duplicated across features
- [ ] Navigation wired correctly per Section 7.4 of design doc

Supabase Patterns:
- [ ] RLS policies exist for any new/modified tables
- [ ] Edge Functions follow Deno conventions (_shared/ imports, Deno.serve)
- [ ] Auth: JWT validated via supabase.auth.getUser(), not custom logic
- [ ] Storage: meal photos in private bucket with user-scoped RLS

Data Layer:
- [ ] Zod schemas in packages/shared-types/ (not duplicated)
- [ ] API calls wrapped in TanStack Query hooks (not raw fetch/supabase calls in components)
- [ ] snake_case in DB/API, camelCase in TypeScript — transform at boundary
- [ ] All timestamps UTC ISO 8601

Internationalization:
- [ ] Zero hardcoded user-facing strings in JSX
- [ ] Translation keys added to BOTH en/ and pl/ files
- [ ] Correct namespace used (matching feature folder name)
- [ ] Polish plural forms handled (_one, _few, _many)

Mobile Patterns:
- [ ] Functional components, named exports (no default export)
- [ ] NativeWind classNames (no inline style objects for static styles)
- [ ] Reanimated 4 for animations (NOT Moti)
- [ ] React Hook Form + Zod for forms
- [ ] Error boundaries around screens

AI/ML (if applicable):
- [ ] Multi-model fallback implemented (GPT-5.4 → Gemini → Claude)
- [ ] Structured output validated with Zod/Pydantic
- [ ] USDA cross-reference for nutritional claims
- [ ] Confidence scoring with clarification flow for < 0.7
- [ ] Token usage logged for cost tracking
```

## Severity Levels

- **CRITICAL**: Must fix — RLS missing, hardcoded secrets, cross-feature import, no i18n
- **WARNING**: Should fix — missing error handling, no loading state, missing index
- **SUGGESTION**: Nice to have — naming improvement, animation polish, comment clarity

## How to Report

For each finding, provide:
1. File and line reference
2. The specific rule violated (reference design doc section if applicable)
3. Concrete fix example (show the corrected code)

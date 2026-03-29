# Snacky — Implementation Plan

**Derived from:** `PRODUCT_AND_SYSTEM_DESIGN.md` v1.0.0  
**Created:** 2026-03-27  
**Timeline:** 28 weeks (Phases 0–4) + ongoing (Phase 5)

---

## Phase 0: Foundation (Weeks 1–4)

### 0.1 Monorepo & Tooling Setup (Week 1)

- [x] Initialize git repository
- [x] Set up pnpm workspace (`pnpm-workspace.yaml`)
- [x] Configure Turborepo (`turbo.json` with pipeline definitions for build, lint, test, typecheck)
- [x] Create directory structure:
  - [x] `apps/mobile/` — React Native app
  - [x] `supabase/` — Supabase project (config, migrations, functions, seed)
  - [x] `packages/shared-types/` — Shared TypeScript types + Zod schemas
  - [x] `packages/api-client/` — Thin wrapper around `@supabase/supabase-js`
  - [x] `packages/eslint-config/` — Shared ESLint rules
  - [x] `docs/` — API docs, ADRs, runbooks
  - [x] `scripts/` — Seed scripts, batch tools
  - [x] `.github/workflows/` — CI/CD pipelines
- [x] Configure root `package.json` with workspace scripts
- [x] Configure shared ESLint config (TypeScript strict, import order, i18next plugin)
- [x] Configure shared Prettier config
- [x] Set up `.nvmrc` / `.node-version` (Node 22+)
- [x] Add `.gitignore` covering RN, Supabase, Deno, IDE files
- [x] Add `CODEOWNERS` file

### 0.2 React Native Project Initialization (Week 1)

- [x] Initialize React Native project (`npx @react-native-community/cli init`) in `apps/mobile/`
- [x] Enable New Architecture (Fabric + TurboModules) in `gradle.properties` and Podfile
- [x] Verify New Architecture builds successfully on both platforms
- [x] Configure TypeScript ≥ 6.0 with strict mode
- [x] Add `codegenConfig` to `package.json` for TurboModule specs
- [x] Install and configure core dependencies:
  - [x] React Navigation v7 (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
  - [x] Zustand ≥ 5.x
  - [x] TanStack Query v5 (`@tanstack/react-query`)
  - [x] `@supabase/supabase-js` ≥ 2.100
  - [x] NativeWind ≥ 4.2 + Tailwind CSS config
  - [x] Gluestack-UI v3 (`@gluestack-ui/themed`, `@gluestack-ui/config`, `@gluestack-style/react`)
  - [x] React Native Reanimated 4 (≥ 4.x)
  - [x] react-native-mmkv
  - [x] react-native-keychain ≥ 10.x
  - [x] React Hook Form + Zod
- [x] Configure Metro bundler for monorepo (symlink resolution)
- [x] Set up `react-native-config` or similar for environment variables
- [ ] Verify clean build on Android emulator — no Android SDK on this machine
- [x] Verify clean build on iOS simulator
- [x] Create `src/` folder structure per Feature-Sliced Design:
  - [x] `src/app/` — App.tsx, providers/, navigation/
  - [x] `src/features/` — empty feature module folders
  - [x] `src/shared/` — api/, components/, constants/, hooks/, theme/, types/, utils/
  - [x] `src/i18n/` — translation files
  - [x] `src/native/` — TurboModule specs
  - [x] `src/assets/` — fonts, icons, images, animations

### 0.3 Internationalization Setup (Week 1 — before any UI work)

- [x] Install i18n dependencies: `i18next`, `react-i18next`, `intl-pluralrules`, `react-native-localize`
- [x] Create `src/i18n/index.ts` with configuration (fallback `en`, supported `['pl', 'en']`)
- [x] Create namespace-per-feature translation structure:
  - [x] `src/i18n/en/common.json` (shared UI strings)
  - [x] `src/i18n/pl/common.json`
  - [x] Empty namespace files for each feature: `auth`, `onboarding`, `scanner`, `meals`, `dietPlan`, `chat`, `progress`, `dashboard`, `notifications`, `settings`
- [x] Configure `react-native-localize` for device locale detection (bare RN, not Expo)
- [x] Add `eslint-plugin-i18next` to lint config — reject hardcoded strings in JSX
- [x] Verify Polish diacritics (ą, ć, ę, ł, ń, ó, ś, ź, ż) in translation files
- [x] Create typed translation key helper (`src/i18n/types.ts` — module augmentation for `i18next`)
- [x] Add CI lint check that all `t()` keys exist in both `en/` and `pl/` (`scripts/check-i18n-parity.ts`)

### 0.4 Supabase Project Setup (Week 1–2)

- [x] Create Supabase project (staging environment)
- [x] Install Supabase CLI locally
- [x] Initialize Supabase project in `supabase/` directory (`supabase init`)
- [x] Configure `supabase/config.toml` for local development
- [x] Enable required Postgres extensions:
  - [x] `pgvector`
  - [x] `pg_cron`
  - [x] `pg_net`
- [x] Create initial SQL migration — core tables:
  - [x] `users` table
  - [x] `user_profiles` table
  - [x] `meals` table + indexes
  - [x] `meal_ingredients` table + indexes
  - [x] `meal_comments` table + indexes
  - [x] `measurements` table + indexes
  - [x] `diet_plans` table + indexes
  - [x] `diet_plan_meals` table + indexes
  - [x] `chat_sessions` table
  - [x] `chat_messages` table + indexes
  - [x] `health_sync_log` table
  - [x] `notification_log` table
  - [x] `embeddings` table (VECTOR(2048)) + HNSW index
- [x] Create RLS policies for every table:
  - [x] Users: `auth.uid() = id` for own record
  - [x] User profiles: `auth.uid() = user_id`
  - [x] Meals: `auth.uid() = user_id`
  - [x] Meal ingredients: via meals join
  - [x] Meal comments: `auth.uid() = user_id`
  - [x] Measurements: `auth.uid() = user_id`
  - [x] Diet plans: `auth.uid() = user_id`
  - [x] Diet plan meals: via diet_plans join
  - [x] Chat sessions: `auth.uid() = user_id`
  - [x] Chat messages: via chat_sessions join
  - [x] Embeddings: `auth.uid() = user_id` (read), service role (write)
- [x] Create Supabase Storage bucket `meal-photos` (private, RLS-protected)
- [x] Configure Storage RLS: user folder = `auth.uid()`
- [x] Set up Google OAuth provider in Supabase Auth dashboard
- [x] Create `supabase/seed.sql` with development test data
- [x] Verify `supabase start` runs locally with all tables and RLS
- [x] Create `match_embeddings` Postgres function for vector similarity search

### 0.5 Authentication — Google OAuth (Week 2–3)

- [x] Configure Google Cloud Console: OAuth 2.0 client IDs (iOS + Android + web)
- [x] Configure Supabase Auth with Google provider credentials
- [x] Implement mobile auth flow:
  - [x] Install `@react-native-google-signin/google-signin`
  - [x] Create `AuthProvider.tsx` wrapping Supabase session listener (`onAuthStateChange`)
  - [x] Create `WelcomeScreen` with Snacky branding + splash animation
  - [x] Create `LoginScreen` with "Continue with Google" button
  - [x] Implement `signInWithIdToken()` flow (Google ID token → Supabase session)
  - [x] Store session via Supabase JS auto-persistence (AsyncStorage)
  - [x] Implement token refresh (auto-handled by `@supabase/supabase-js`)
  - [x] Implement logout flow (`supabase.auth.signOut()`)
- [x] Create `AuthNavigator` (Stack: Welcome → Login)
- [x] Create `RootNavigator` with auth state conditional routing
- [x] Add biometric-protected token storage via `react-native-keychain`
- [x] Implement Supabase DB trigger: on new `auth.users` insert → create `users` + `user_profiles` row
- [ ] Test: Google sign-in on Android emulator
- [ ] Test: Google sign-in on iOS simulator
- [x] Add auth translation keys to `en/auth.json` and `pl/auth.json`

### 0.6 Design System — Tokens & Base Components (Week 2–3)

- [x] Create `src/shared/theme/tokens.ts` with full design token system:
  - [x] Color palette (primary green, semantic colors, surface colors, dark mode surfaces, text colors)
  - [x] Spacing scale (xs through xxl)
  - [x] Border radius scale
  - [x] Typography scale (displayLarge through labelMedium)
  - [x] Elevation/shadow definitions
  - [x] Macro-specific colors (protein: indigo, carbs: amber, fat: red, fiber: green)
- [x] Configure Tailwind / NativeWind `tailwind.config.js` with design tokens
- [x] Create `lightTheme.ts` and `darkTheme.ts`
- [x] Create `ThemeProvider.tsx` with theme context
- [x] Build base shared components:
  - [x] `SkeletonLoader.tsx` — Reanimated 4 shimmer animation
  - [x] `AnimatedTransition.tsx` — reusable enter/exit wrapper
  - [x] `ErrorBoundary.tsx` — error UI with retry
  - [x] `EmptyState.tsx` — empty data placeholder
- [x] Build Bento Grid container component (`BentoGrid.tsx`)
- [x] Create placeholder `DashboardScreen` with empty Bento Grid
- [x] Set up bottom tab navigation (`MainTabNavigator`) with 5 tabs:
  - [x] Dashboard
  - [x] Scanner (placeholder)
  - [x] Diet Plan (placeholder)
  - [x] Chat (placeholder)
  - [x] Progress (placeholder)
- [x] Add tab icons and labels (translated via `t()`)
- [x] Implement tab switch animation (Reanimated 4, 200ms ease-out)

### 0.7 CI/CD Pipeline Setup (Week 2–3)

- [x] Create GitHub Actions workflow: `ci.yml` (PR checks)
  - [x] Lint (ESLint + Prettier)
  - [x] Type check (`tsc --noEmit`)
  - [x] Unit tests (Jest / Vitest)
  - [x] Security scan (`pnpm audit`)
  - [x] Build check (mobile — Android + iOS bundles)
  - [x] Validate migrations (`supabase db lint`)
- [x] Create GitHub Actions workflow: `deploy-staging.yml` (on merge to main)
  - [x] `supabase db push` (apply migrations to staging)
  - [x] `supabase functions deploy --all` (deploy Edge Functions)
- [ ] Set up GitHub branch protection rules (require CI pass) ← manual step in GitHub Settings
- [x] Configure Dependabot for automated dependency updates

### 0.8 Android Alpha Distribution Setup (Week 1–2)

- [ ] Create app listing in Google Play Console:
  - [ ] App name: "Snacky"
  - [ ] Default language: English (United States)
  - [ ] Add translation: Polish (Poland)
  - [ ] App category: Health & Fitness
  - [ ] Complete content rating questionnaire
  - [ ] Create placeholder store listing (icon, screenshots, description)
- [ ] Configure app signing:
  - [ ] Enroll in Google Play App Signing
  - [ ] Generate upload key locally
  - [ ] Store upload key securely in GitHub Secrets
  - [ ] Register upload key fingerprint in Google Play Console
- [ ] Create Closed Testing track (Alpha):
  - [ ] Track name: "Alpha Testers"
  - [ ] Create tester email list
  - [ ] Add initial testers by email
- [ ] Configure EAS Build:
  - [ ] Create `eas.json` with `development`, `alpha`, and `production` profiles
  - [ ] Configure `alpha` profile: release-signed AAB, auto-increment versionCode
- [ ] Create GitHub Actions workflow: `android-alpha.yml`
  - [ ] Trigger: push to main + manual dispatch
  - [ ] Steps: checkout → setup-node → pnpm install → EAS build → submit to Alpha track
  - [ ] Add Slack notification on successful upload
- [ ] **Publish first Alpha APK by end of Week 2** (app shell with splash screen)
- [ ] Verify tester can install from Google Play Alpha track

### 0.9 Infrastructure as Code (Week 3–4)

- [x] Document Supabase project configuration as code (`supabase/config.toml`)
- [x] Create `supabase/migrations/` with versioned SQL files
- [x] Create Edge Function scaffolding in `supabase/functions/`:
  - [x] `_shared/` — CORS config, Supabase client initialization, error handling
  - [x] `meal-scan/` — placeholder
  - [x] `chat/` — placeholder
  - [x] `embed/` — placeholder
  - [x] `generate-plan/` — placeholder
  - [x] `send-notification/` — placeholder
- [x] Configure Supabase secrets for API keys (OpenAI, Google AI, Voyage AI, Anthropic, FCM)
- [x] Set up `supabase/seed.sql` with realistic test data
- [x] Verify full `supabase start` → `supabase db push` → `supabase functions serve` workflow
- [x] Create environment strategy documentation:
  - [x] Local (supabase start)
  - [x] Staging (Supabase cloud project)
  - [x] Production (separate Supabase project)

### 0.10 Phase 0 Validation

- [ ] **Deliverable checkpoint:** User can sign in with Google and see empty dashboard shell
- [ ] Dashboard displays in Polish or English (auto-detected from device)
- [ ] Android Alpha build installable via Google Play for developer and invited testers
- [ ] CI pipeline passes on all checks
- [ ] All UI strings use `t()` — no hardcoded strings

---

## Phase 1: Core Tracking (Weeks 5–10)

### 1.1 Onboarding Questionnaire (Week 5–6)

- [x] Create `OnboardingNavigator` (Stack, modal presentation)
- [x] Implement `OnboardingStepScreen` — dynamic multi-step wizard
- [x] Build animated step transitions (Reanimated 4, spring easing)
- [x] Create step progress indicator
- [x] Implement Step 1 — `BiometricsStep.tsx`:
  - [x] Age picker (date of birth)
  - [x] Biological sex selector
  - [x] Height input (cm)
  - [x] Current weight input (kg)
  - [x] Zod validation schema
- [x] Implement Step 2 — `GoalStep.tsx`:
  - [x] Goal selection cards (lose weight, gain muscle, maintain, improve nutrition quality)
  - [x] Animated card selection
- [x] Implement Step 3 — Target parameters:
  - [x] Goal weight input (kg)
  - [x] Timeline picker (weeks)
- [x] Implement Step 4 — `DietaryRestrictionsStep.tsx`:
  - [x] Multi-select chips (vegetarian, vegan, gluten-free, lactose-free, etc.)
  - [x] Allergy multi-select + free text input
- [x] Implement Step 5 — `LifestyleStep.tsx`:
  - [x] Activity level selector (sedentary → extra active)
  - [x] Cooking frequency
  - [x] Cooking skill level
  - [x] Cuisine preferences multi-select
- [x] Implement Step 6 — `PsychoBehavioralStep.tsx`:
  - [x] Eating triggers multi-select (stress, boredom, social, emotional)
  - [x] Snacking patterns (none / occasional / frequent)
  - [x] CFC scale items (Consideration of Future Consequences)
- [x] Implement Step 7 — `NotificationPrefsStep.tsx`:
  - [x] Enable/disable notifications toggle
  - [x] Meal reminders, nudges, weekly report toggles
  - [ ] Quiet hours time picker — deferred to Phase 2.7 (requires notification infrastructure)
- [x] Implement `OnboardingCompleteScreen` with success animation (Reanimated 4)
- [x] Backend: Implement TDEE calculation (Mifflin-St Jeor equation)
- [x] Backend: Compute macro targets from goal type + TDEE
- [x] Backend: Generate psychological profile + AI persona calibration
- [x] Create Supabase Edge Function or PostgREST call to save onboarding data
- [x] Wire navigation: after login, if `onboarding_completed_at` is null → show onboarding
- [x] Add all onboarding translation keys to `en/onboarding.json` and `pl/onboarding.json`
- [ ] Test: complete onboarding flow end-to-end on both platforms

### 1.2 Meal Scanning Pipeline — Mobile (Week 6–7)

- [x] Install and configure `react-native-vision-camera` v4
- [x] Implement camera permissions request (iOS + Android)
- [x] Create `ScannerScreen` with camera view:
  - [x] `CameraOverlay.tsx` — viewfinder overlay with capture button
  - [x] Auto-focus and flash control
  - [x] Photo capture (min 1080x1080)
  - [x] Gallery picker alternative
- [x] Install and configure `@bam.tech/react-native-image-resizer`
- [x] Implement `useImageCompression.ts` hook:
  - [x] Compress to ≤ 500 KB, JPEG quality 85%
  - [x] Strip EXIF metadata
  - [x] Base64 encode
- [x] Implement `useScanAnalysis.ts` hook:
  - [x] POST to meal-scan Edge Function
  - [x] Handle loading, success, error states
  - [x] Handle clarification flow
- [x] Create `ScanResultScreen`:
  - [x] Skeleton loader animation (Reanimated 4, 1.5s loop)
  - [x] Staggered ingredient reveal animation (300ms per item, 80ms stagger)
  - [x] `ScanResultCard.tsx` — displays each detected ingredient
  - [x] `IngredientEditor.tsx` — manual portion/name override
  - [x] `PortionSlider.tsx` — adjust portion size
  - [x] Add/remove ingredient buttons
- [x] Create `ClarificationDialog.tsx`:
  - [x] Display targeted question when confidence < 0.7
  - [x] Option buttons + custom text input
  - [x] Submit clarification → re-estimation
  - [x] Max 3 clarification questions per scan
- [x] Create `CommentInput.tsx` — text field for user annotations
- [x] Create "Confirm & Log" button → saves meal to Supabase
- [x] Upload meal photo to Supabase Storage (`meal-photos` bucket)
- [x] Add scanner translation keys to `en/scanner.json` and `pl/scanner.json`

### 1.3 Meal Scanning Pipeline — Backend (Week 6–8)

- [x] Implement `meal-scan` Edge Function:
  - [x] Image validation (format, size, corruption check)
  - [x] Build structured vision prompt (ingredient detection, portion estimation, confidence scoring, NOVA classification)
  - [x] Call GPT-5.4 Vision API (primary)
  - [x] Parse response with Zod strict validation
  - [x] Implement multi-model fallback:
    - [x] Timeout (>10s) or error → retry with Gemini 3.1 Pro
    - [x] If both fail → retry with Claude Sonnet 4.6
    - [x] If all fail → return graceful error, offer manual entry
  - [x] Cross-reference ingredients with USDA FoodData Central:
    - [x] Fuzzy match ingredient names to USDA entries
    - [x] Validate caloric estimates within ±30% of USDA values
    - [x] Flag deviations for review
  - [x] Handle clarification flow (accept clarification answers, re-run analysis)
  - [x] Return structured `MealScanResult` response
  - [x] Log model used, processing time, confidence scores
- [x] Create USDA food data seed script (`scripts/seed-usda.ts`):
  - [x] Download SR Legacy + Foundation datasets (~300K entries)
  - [x] Store in PostgreSQL `usda_foods` table with full-text search index
- [x] Create Supabase DB trigger: on `meals` INSERT → call `embed` Edge Function (async)

### 1.4 Meal CRUD & Comments (Week 8–9)

- [x] Implement Meals list screen (`MealTimeline.tsx`):
  - [x] Grouped by day
  - [x] `MealCard.tsx` — thumbnail, meal type, calorie summary, time
  - [x] Pull-to-refresh
  - [x] Cursor-based pagination via TanStack Query
- [x] Implement Meal detail screen (`MealDetail.tsx`):
  - [x] Full-size meal photo (Supabase Storage signed URL)
  - [x] `NutritionBreakdown.tsx` — detailed macro/micro display
  - [x] Ingredient list with confidence indicators
  - [x] User modification diff (AI vs final values)
  - [x] Comments list
- [x] Implement `MealEditScreen`:
  - [x] Edit portions, add/remove ingredients
  - [x] Update nutritional totals
  - [x] Save changes via Supabase PostgREST
- [x] Implement meal delete (with confirmation dialog)
- [x] Implement manual meal entry fallback (no photo):
  - [x] Search USDA foods by name
  - [x] Manual ingredient + portion entry
  - [x] Auto-calculate nutritional values from USDA data
- [x] Implement meal comments:
  - [x] Add comment (`CommentInput.tsx`)
  - [x] List comments per meal
  - [x] Delete own comments
- [x] Add meals translation keys to `en/meals.json` and `pl/meals.json`

### 1.5 Dashboard — Calorie & Macro Tracking (Week 9–10)

- [x] Implement `DashboardScreen` with Bento Grid layout:
  - [x] `CalorieBudgetTile.tsx`:
    - [x] Animated ring chart (Reanimated 4 SVG, 1200ms spring animation)
    - [x] Current / target kcal display
    - [x] Remaining budget
  - [x] `MacroSummaryTile.tsx`:
    - [x] `MacroProgressBars.tsx` — protein, carbs, fat progress bars
    - [x] Animated fill (Reanimated 4, 800ms ease-out)
    - [x] Percentage and gram values
  - [x] `RecentMealsTile.tsx`:
    - [x] Horizontal scrollable meal cards
    - [x] Tap → navigate to meal detail
  - [x] `QuickActionsTile.tsx`:
    - [x] Quick-scan FAB
    - [x] Quick-add weight
  - [x] `AIChatPreviewTile.tsx` (placeholder for Phase 2)
- [x] Implement daily summary data fetching (TanStack Query):
  - [x] Aggregate meals for current day
  - [x] Calculate remaining budget from profile targets
- [x] Implement card press feedback animation (Reanimated 4, 100ms scale 0.97)
- [x] Implement pull-to-refresh on dashboard
- [x] Add dashboard translation keys to `en/dashboard.json` and `pl/dashboard.json`

### 1.6 Meal Photo History (Week 10)

- [x] Implement `MealPhotoGallery.tsx`:
  - [x] Scrollable grid of meal photos with dates
  - [x] Lazy image loading from Supabase Storage
- [x] Implement shared element transition (meal photo → detail):
  - [x] React Navigation Shared Element (350ms, ease-in-out)
- [x] Implement `MealPhotoDetailScreen` with full-resolution photo view

### 1.7 Phase 1 Validation

- [ ] **Deliverable checkpoint:** User can complete onboarding, scan meals, and view daily tracking dashboard
- [ ] Onboarding: all 7 steps with animations, PL + EN
- [ ] Scanning: camera capture → AI analysis → results → confirm & log
- [ ] Clarification flow works for low-confidence ingredients
- [ ] Dashboard updates in real time after meal logging
- [ ] Meal list, detail, edit, delete, comments functional
- [ ] All features continuously deployed to Alpha testers via Google Play
- [ ] Unit tests for TDEE calculation, macro computation, Zod schemas
- [ ] Integration tests for meal-scan Edge Function

---

## Phase 2: Intelligence (Weeks 11–16)

### 2.1 RAG Pipeline — Embedding Generation (Week 11–12)

- [x] Implement `embed` Edge Function:
  - [x] Accept webhook from DB trigger (pg_net HTTP POST)
  - [x] Determine entity type (meal, comment, measurement)
  - [x] Serialize entity to text representation
  - [x] Generate embedding vector via OpenAI text-embedding-3-small (1024 dims)
  - [x] Upsert to `embeddings` table with metadata tags
- [x] Create DB triggers:
  - [x] `meals` INSERT → call `embed` function
  - [x] `meal_comments` INSERT → call `embed` function
  - [x] `measurements` INSERT → call `embed` function
- [x] Create batch embedding seed script (`scripts/generate-embeddings.ts`):
  - [x] Generate embeddings for USDA foods dataset
  - [x] Generate embeddings for nutritional guidelines corpus
  - [ ] Generate embeddings for recipe database
- [x] Implement `match_embeddings` Postgres function:
  - [x] Filter by user_id and namespace
  - [x] Order by cosine distance (HNSW index)
  - [x] Return top-K results with similarity score

### 2.2 AI Chat Assistant — Backend (Week 12–13)

- [x] Implement `chat` Edge Function:
  - [x] Create/retrieve chat session
  - [x] Intent classification (lightweight GPT-4.1-nano classifier):
    - [x] `nutrition_qa`
    - [x] `meal_suggestion`
    - [x] `plan_creation`
    - [x] `data_lookup`
    - [x] `health_insight`
  - [x] Context retrieval strategy (per intent — see doc Section 10.2)
  - [x] Prompt assembly:
    - [x] System prompt with user profile, persona calibration, guardrails
    - [x] Retrieved context documents (via match_embeddings RAG)
    - [x] Conversation history (last 10 messages)
    - [x] Locale instruction (respond in user's language)
  - [x] Call GPT-4.1 (complex queries) or GPT-4.1-nano (simple queries)
  - [x] SSE streaming response (Server-Sent Events)
  - [x] Post-processing:
    - [ ] Validate nutritional claims against USDA data (deferred — requires structured output parsing)
    - [ ] Inject rich content cards (recipe cards, nutrient badges) as JSON in stream (deferred — requires client-side card rendering)
    - [x] Log token usage for cost tracking
  - [x] Store message in `chat_messages` table

### 2.3 AI Chat Assistant — Mobile (Week 13–14)

- [x] Create `ChatScreen`:
  - [x] Persistent, scrollable chat history (FlatList with keyboard handling)
  - [x] `ChatBubble.tsx` — user and assistant message bubbles
  - [x] `ChatInput.tsx` — text input with send/stop button
  - [x] `StreamingMessage.tsx` — real-time token-by-token display with blinking cursor
- [x] Implement `useChatStream.ts` hook:
  - [x] POST message → receive SSE stream via ReadableStream
  - [x] Parse `message_start`, `content_delta`, `error`, `message_end` events
  - [x] Accumulate tokens into displayed message with abort support
- [x] Implement `useChatHistory.ts` hook:
  - [x] Fetch paginated message history
  - [x] TanStack Query with cursor-based pagination
- [x] Implement rich content rendering:
  - [x] `RecipeCard.tsx` — tappable inline recipe cards
  - [x] `NutrientBadge.tsx` — inline nutritional badges
  - [ ] Meal reference links (tap → navigate to meal detail) — deferred, requires structured output from backend
- [x] Implement chat message appear animation (Reanimated 4, spring FadeInDown/FadeInRight)
- [x] Cache last 100 messages locally in MMKV
- [x] Add chat translation keys to `en/chat.json` and `pl/chat.json`

### 2.4 Measurement Tracking (Week 14–15)

- [x] Create `MeasurementInputScreen`:
  - [x] Weight input (required) — numeric keyboard with decimal-pad
  - [x] Waist, chest, hips measurements (optional)
  - [x] Body fat % (optional)
  - [x] Source indicator (manual / HealthKit / Health Connect)
  - [x] Save to `measurements` table via Supabase PostgREST
- [x] Implement quick-add weight from dashboard (`QuickActionsTile`) — navigates with `quickWeight: true`
- [x] Implement measurement list view (sortable by date, newest/oldest toggle)
- [x] Implement measurement delete (with confirmation alert)
- [x] Add progress/measurements translation keys (`en/progress.json`, `pl/progress.json`)

### 2.5 Progress Charts & Analytics (Week 15–16)

- [x] ~~Install Victory Native + @shopify/react-native-skia~~ Used react-native-svg (already installed) for lightweight SVG charts
- [x] Create `TrendsScreen` (ProgressDashboard) with tab views (Overview / Weight / Macros / Calories):
  - [x] `WeightChart.tsx`:
    - [x] Line chart with trend line and goal marker
    - [ ] Tap data point → navigate to day's log
    - [ ] Sparkline variant for dashboard tile
  - [x] `MacroTrendChart.tsx`:
    - [x] Stacked bar chart (protein, carbs, fat over time) with 7-day and 30-day views
  - [x] `CalorieChart.tsx` — caloric intake vs target line chart
  - [x] `DQIScoreCard.tsx` — weekly DQI-I score trend (placeholder, scoring in §2.6)
  - [x] `MealPhotoGallery` link — navigates to existing MealPhotoGalleryScreen (built in §1.6)
- [x] Implement daily summary aggregation (`useDailyAggregates`, `useWeightTrend` hooks)
- [x] Implement weekly report generation:
  - [x] `WeeklyReportCard.tsx`
  - [x] Caloric adherence percentage
  - [x] Macro adherence bars (protein, carbs, fat)
  - [ ] Top nutritional insights (LLM-generated)
  - [ ] Personalized tips based on behavioral patterns

### 2.6 DQI-I Diet Quality Scoring (Week 15)

- [x] Implement DQI-I scoring algorithm (`features/trends/lib/dqi-scoring.ts`):
  - [x] Variety component (food group diversity + protein source diversity, 0–20 pts)
  - [x] Adequacy component (fiber, protein, fruit/veg/grain frequency, 0–40 pts)
  - [x] Moderation component (total fat %, sugar %, sodium, NOVA-4 proportion, 0–30 pts)
  - [x] Overall balance (macronutrient ratio + meal regularity, 0–10 pts)
- [x] Calculate weekly DQI-I score from meal data (`useWeeklyDQI` hook with USDA food category joins)
- [x] Display on dashboard (`DQIDashboardTile`) and progress/trends screen (`DQIScoreCard` with ring chart + component breakdown bars)
- [x] Include in weekly report (`WeeklyReportCard` DQI stat box)

### 2.7 Push Notification / Nudge System (Week 16)

- [x] Install `@react-native-firebase/messaging`
- [x] Configure FCM for Android + APNs for iOS
- [x] Implement `send-notification` Edge Function:
  - [x] Accept notification payload
  - [x] Render template with Handlebars (per locale)
  - [x] Dispatch via FCM
  - [x] Log to `notification_log` table
- [x] Implement notification types:
  - [x] Meal Reminder (time-based, user's typical meal window ± 30min)
  - [x] Budget Alert (mid-day macro budget exceeded)
  - [x] Streak Maintenance (20:00 local time, no meals logged today)
  - [x] Weekly Report (Sunday 09:00 local time)
- [x] Set up pg_cron jobs for scheduled notifications
- [x] Create `NotificationProvider.tsx` for handling incoming notifications
- [x] Implement notification permission request flow
- [x] Add notification translation keys to `en/notifications.json` and `pl/notifications.json`
- [x] Add fully configurable notification preferences to Settings screen

### 2.8 Phase 2 Validation

- [ ] **Deliverable checkpoint:** Full AI assistant operational; progress tracking live; intelligent notifications
- [ ] Chat: streaming responses, rich content cards, conversation history
- [ ] RAG: context-aware responses grounded in user's actual data
- [ ] Weight/measurement tracking with charts
- [ ] Weekly reports generated and displayed
- [ ] Push notifications delivered for all nudge types
- [ ] Integration tests for chat Edge Function with recorded API responses (VCR.py)
- [ ] RAG retrieval quality test: precision@5 ≥ 0.8 for 50 curated queries

---

## Phase 3: Planning & Optimization (Weeks 17–22)

### 3.1 MILP Diet Plan Solver — Backend (Week 17–18)

- [x] Set up Meal Planning Service (Python / FastAPI):
  - [x] Create service in `supabase/functions/generate-plan/` (Deno Edge Function with heuristic MILP-style solver; Python/PuLP migration path available)
  - [x] Heuristic solver with greedy food selection + least-squares portion optimization (PuLP/CBC fallback path documented)
  - [x] Fuzzy logic layer for ad-hoc adjustments — native TypeScript implementation in `fuzzy.ts` (triangular/trapezoidal/sigmoid MFs, centroid defuzzification); scikit-fuzzy not needed
- [x] Implement MILP formulation:
  - [x] Candidate food items from USDA DB (filtered by allergens/restrictions, categorized by food group)
  - [x] Objective: minimize deviation from target macronutrient goals across N days
  - [x] Hard constraints: daily calorie ± 5%, allergens (zero tolerance), prep time
  - [x] Soft constraints: ingredient diversity (min 15 unique/week), cost, variety
  - [x] Each micronutrient ≥ 80% RDA per day (3-day window average) — 20 micronutrients (12 vitamins + 8 minerals) added to usda_foods, RDA lookup by sex/age, solver repair pass with rolling average
  - [x] No ingredient repeated in same meal slot within 3 consecutive days
- [x] Implement solver timeout (30s) with fallback to heuristic generation
- [x] Output: nutrient matrix (Day × MealSlot × {foods, grams})
- [x] Store solver metadata (time, objective value, iterations)

### 3.2 LLM Recipe Generation (Week 18–19)

- [x] Implement recipe generation pipeline — `recipe-generator.ts` with OpenAI GPT-4.1 (direct API, no LangChain):
  - [x] Input: ingredient list + gram amounts from MILP output
  - [x] Inject user context: cuisine preferences, cooking skill, taste profile (RAG via `match_embeddings` on `user_comments` namespace)
  - [x] Call GPT-4.1 with JSON response format, concurrent day batching (max 7 parallel)
  - [x] Output: recipe name, instructions, prep time, presentation suggestions
- [x] Fuzzy logic layer for flexibility margins — native TypeScript `fuzzy.ts` integrated into solver (macro scoring, portion sizing, calorie correction, micronutrient repair urgency)
- [x] Validate generated plans — `validator.ts`:
  - [x] Verify no allergen leakage (synonym expansion for 10 major allergen groups)
  - [x] Re-calculate exact nutrition drift from solver targets
  - [x] Generate aggregated shopping list (categorized: produce, meat, dairy, grains, pantry, oils, frozen)
- [x] Store complete plan in `diet_plans` + `diet_plan_meals` tables — recipe fields populated, `shopping_list` + `validation` JSONB columns added via migration

### 3.3 Diet Plan UI (Week 19–21)

- [ ] Create `PlanConfigWizard.tsx` — plan creation wizard:
  - [ ] Duration picker (1 week / 2 weeks / 1 month / custom)
  - [ ] Meals per day selector (3 / 4 / 5 / custom)
  - [ ] Excluded ingredients (pre-filled from allergies + user additions)
  - [ ] Cuisine preferences
  - [ ] Budget constraint (optional)
  - [ ] Cooking time preference (quick / moderate / elaborate)
  - [ ] "Generate Plan" button with loading state
- [ ] Create `PlanCalendar.tsx`:
  - [ ] Interactive calendar view with daily meal cards
  - [ ] Swipe between days
- [ ] Create `MealSlotCard.tsx`:
  - [ ] Recipe photo, name, prep time, calorie summary
  - [ ] Tap → navigate to recipe detail
  - [ ] Swap button → AI suggests alternatives matching nutrient slot
- [ ] Create `RecipeDetail.tsx`:
  - [ ] Full recipe with ingredients, instructions, nutritional breakdown
  - [ ] Prep time, difficulty level
- [ ] Implement meal swapping:
  - [ ] Request alternative meal for slot → server generates options
  - [ ] User selects replacement → plan updated
- [ ] Create `ShoppingList.tsx`:
  - [ ] Aggregated ingredient list for selected days
  - [ ] Grouped by category (produce, protein, dairy, etc.)
  - [ ] Checkable items
- [ ] Add diet plan translation keys to `en/dietPlan.json` and `pl/dietPlan.json`

### 3.4 Plan Adherence Tracking (Week 21–22)

- [ ] Implement plan reminder notifications:
  - [ ] 30 min before planned meal time
  - [ ] "Next up: [meal name]. Tap for the recipe."
- [ ] When user scans actual meal → auto-compare to planned meal:
  - [ ] Deviation analysis (caloric difference, macro differences)
  - [ ] Visual diff display on meal detail screen
- [ ] Link logged meals to plan meals (`logged_meal_id` on `diet_plan_meals`)
- [ ] Implement plan adherence dashboard:
  - [ ] Daily/weekly adherence percentage
  - [ ] Skipped meals tracking
  - [ ] Deviation trend over plan duration

### 3.5 Ad-Hoc Dietary Adjustment Suggestions (Week 22)

- [ ] Implement mid-day budget recalculation:
  - [ ] After each logged meal, recalculate remaining daily allocation
  - [ ] If user exceeds macro budget, trigger AI suggestion
- [ ] Create proactive chat notification:
  - [ ] "You're 400 kcal over on carbs. A grilled salmon with steamed broccoli tonight would balance your day."
  - [ ] Suggestion rendered as push notification + chat message
- [ ] Implement end-of-day summary notification with DQI-I score

### 3.6 Phase 3 Validation

- [ ] **Deliverable checkpoint:** End-to-end diet plan creation, following, and deviation management
- [ ] Plan generation: MILP solver + LLM recipe output within 30s
- [ ] Calendar view: browse days, view recipes, swap meals
- [ ] Shopping list: aggregated and checkable
- [ ] Plan adherence: scan → compare → deviation analysis
- [ ] Mid-day adjustment suggestions working
- [ ] MILP solver correctness test: all hard constraints satisfied
- [ ] Prompt regression test: golden dataset for recipe generation

---

## Phase 4: Ecosystem & Polish (Weeks 23–28)

### 4.1 Apple HealthKit Integration (Week 23–24)

- [ ] Install `@kingstinct/react-native-healthkit`
- [ ] Implement HealthKit permission request:
  - [ ] Clear user-facing explanation per data type
  - [ ] Read-only permissions: bodyMass, activeEnergyBurned, stepCount, heartRate, sleepAnalysis
- [ ] Implement data sync:
  - [ ] `HKObserverQuery` for weight changes (background delivery)
  - [ ] Periodic anchored queries for activity/sleep data
  - [ ] Normalize units (kg, kcal, UTC timestamps)
  - [ ] Deduplicate by sample UUID
  - [ ] Batch sync to backend every 15 minutes (or on app foreground)
- [ ] Auto-create measurement records from HealthKit weight data
- [ ] TDEE adjustment from HealthKit activity data
- [ ] Log sync events to `health_sync_log` table
- [ ] Test on physical iOS device

### 4.2 Google Health Connect Integration (Week 23–24)

- [ ] Install `react-native-health-connect`
- [ ] Implement Health Connect permission request:
  - [ ] WeightRecord, ActiveCaloriesBurnedRecord, StepsRecord, HeartRateRecord, SleepSessionRecord
- [ ] Implement WorkManager-based background sync:
  - [ ] Every 15 minutes periodic worker
  - [ ] Same normalization pipeline as HealthKit path
- [ ] Auto-create measurement records from Health Connect weight data
- [ ] TDEE adjustment from activity data
- [ ] Test on physical Android device

### 4.3 Offline-First Hardening (Week 24–25)

- [ ] Configure TanStack Query persistence with MMKV:
  - [ ] `@tanstack/query-persist-client` setup
  - [ ] staleTime: 5min, gcTime: 24h
  - [ ] Background refetch on app foreground
- [ ] Implement offline meal logging queue:
  - [ ] Queue meals locally in MMKV when offline
  - [ ] Save photo to device local storage
  - [ ] Background upload on reconnect (exponential backoff)
- [ ] Implement offline chat:
  - [ ] Cache last 100 messages
  - [ ] Queue new messages when offline
  - [ ] Append-only sync (conflict-free)
- [ ] Implement offline measurements:
  - [ ] Save locally immediately
  - [ ] Upsert sync with server timestamp conflict resolution
- [ ] Implement diet plan offline caching:
  - [ ] Full plan cached on device
  - [ ] Pull-based refresh; immutable plan versions
- [ ] Implement network status indicator (`useNetworkStatus.ts`)
- [ ] Test: airplane mode → log meal → reconnect → verify sync

### 4.4 Performance Optimization (Week 25–26)

- [ ] Bundle size optimization:
  - [ ] Analyze bundle with `react-native-bundle-visualizer`
  - [ ] Lazy-load feature modules via React.lazy + Suspense
  - [ ] Tree-shake unused Gluestack-UI components
  - [ ] Target: ≤ 50 MB iOS, ≤ 40 MB Android
- [ ] Animation performance:
  - [ ] Profile all animations with Perf Monitor
  - [ ] Ensure ≥ 58 FPS during scroll and animations
  - [ ] Optimize Reanimated 4 worklet usage
- [ ] Memory profiling:
  - [ ] Profile during meal scan + dashboard rendering
  - [ ] Target: ≤ 250 MB peak
  - [ ] Optimize image memory (proper cleanup of camera frames)
- [ ] Cold start optimization:
  - [ ] Profile TurboModule lazy loading
  - [ ] Target: ≤ 2.0s P95 on mid-range Android device
- [ ] API response optimization:
  - [ ] Verify PostgREST queries use indexes
  - [ ] Verify CRUD operations ≤ 200ms P95

### 4.5 Accessibility Audit (Week 26)

- [ ] Audit all screens for WCAG 2.1 AA equivalent:
  - [ ] Screen reader support (TalkBack / VoiceOver)
  - [ ] Touch target sizes (min 44x44 dp)
  - [ ] Color contrast ratios
  - [ ] Focus management in modals and navigation
  - [ ] Semantic headings and labels
- [ ] Fix identified accessibility issues
- [ ] Test with TalkBack on Android
- [ ] Test with VoiceOver on iOS

### 4.6 Dark Mode (Week 26)

- [ ] Implement theme switching in `ThemeProvider.tsx`
- [ ] Apply `surfaceDark` token values across all screens
- [ ] Verify all charts render correctly in dark mode
- [ ] Verify all Gluestack-UI components adapt to dark theme
- [ ] Respect system theme preference (`useColorScheme()`)
- [ ] Add manual toggle in Settings screen
- [ ] Add settings translation keys to `en/settings.json` and `pl/settings.json`

### 4.7 Full Localization Audit (Week 27)

- [ ] Verify 100% PL/EN coverage — no missing translation keys
- [ ] Review Polish translations for grammatical accuracy:
  - [ ] Plural forms (1 / 2-4 / 5+) using `_one`, `_few`, `_many`
  - [ ] Gender-specific context variants where needed
- [ ] Test string expansion (Polish ~20-30% longer than English):
  - [ ] Verify no text truncation or overflow
  - [ ] All containers are flexible enough
- [ ] Verify date/time formatting: `dd.MM.yyyy`, `HH:mm` (24h) for Polish
- [ ] Verify decimal separator: comma for Polish
- [ ] Test language switching in Settings (no app restart required)
- [ ] Verify AI-generated content respects locale (chat, scan results, notifications)

### 4.8 Security Audit (Week 27)

- [ ] Penetration testing:
  - [ ] API endpoint security (OWASP ZAP)
  - [ ] RLS policy verification (attempt cross-user data access)
  - [ ] Token handling (expiry, refresh, revocation)
- [ ] Dependency vulnerability scan (Snyk report review)
- [ ] Image upload security verification:
  - [ ] File type validation (magic bytes)
  - [ ] Size limits enforced
- [ ] Certificate pinning verification on mobile
- [ ] GDPR compliance check:
  - [ ] Data export endpoint (`GET /api/v1/users/me/export`)
  - [ ] Account deletion cascade (`DELETE /api/v1/users/me` + Storage cleanup)
  - [ ] Consent management flow
- [ ] Verify no secrets in code or environment variables at build time

### 4.9 E2E Test Suite Completion (Week 27–28)

- [ ] Set up Detox for iOS + Android E2E testing
- [ ] Implement critical user journey tests:
  - [ ] Onboarding flow (sign in → complete all steps → dashboard)
  - [ ] Meal scan flow (camera → AI results → clarification → confirm → logged)
  - [ ] Chat flow (send message → streaming response → rich content display)
  - [ ] Measurement flow (add weight → chart update)
  - [ ] Diet plan flow (configure → generate → browse → swap meal)
- [ ] Add E2E tests to CI pipeline (pre-release gate)
- [ ] Set up k6 load testing:
  - [ ] Verify P95/P99 latency under load for core endpoints
  - [ ] Verify meal scan E2E ≤ 5s P95
- [ ] Run prompt regression test suite (100 golden meal images)
- [ ] Run bias testing (meal recognition across 10+ cuisine categories)

### 4.10 Observability Setup (Week 27)

- [ ] Configure structured logging in all Edge Functions (JSON format)
- [ ] Set up Logflare integration for centralized log search
- [ ] Configure OpenTelemetry SDK for metrics collection
- [ ] Set up Grafana Cloud dashboards:
  - [ ] Operations Dashboard (request rates, latencies, error rates)
  - [ ] AI Dashboard (scan accuracy, confidence distributions, model costs, fallback rates)
  - [ ] Product Dashboard (DAU/MAU, meals scanned, chat messages, retention cohorts)
  - [ ] Cost Dashboard (per-service costs, AI API costs, cost per user)
- [ ] Configure alerting rules:
  - [ ] API error rate > 1% for 5 min → Critical (PagerDuty + Slack)
  - [ ] Scan latency P95 > 8s for 10 min → High (Slack)
  - [ ] Vision API failure > 5% for 5 min → Critical (PagerDuty + Slack)
  - [ ] DB connection pool > 80% → High (Slack)
  - [ ] Cost anomaly: daily spend > 150% of 7-day average → Medium (Email + Slack)
- [ ] Set up Grafana Tempo for distributed tracing

### 4.11 Beta & Production Release (Week 28)

- [ ] Promote Alpha → Open Testing (Beta) on Google Play:
  - [ ] Create public opt-in link
  - [ ] Update store listing (screenshots, description, privacy policy)
- [ ] Collect and incorporate Beta feedback
- [ ] Final stabilization and bug fixes
- [ ] Configure EAS Build production profile for iOS
- [ ] Submit to Apple App Store:
  - [ ] Complete App Store listing
  - [ ] App Store Review guidelines compliance check
  - [ ] Privacy nutrition labels
  - [ ] Submit for review
- [ ] Promote Android Beta → Production:
  - [ ] Staged rollout: 10% → 50% → 100%
- [ ] iOS production release:
  - [ ] Phased rollout: 1% → 5% → 20% → 100%

### 4.12 Phase 4 Validation

- [ ] **Deliverable checkpoint:** Production-ready application submitted to app stores
- [ ] HealthKit + Health Connect integrations working on real devices
- [ ] Offline-first: scan/log meals offline, auto-sync on reconnect
- [ ] Dark mode fully functional
- [ ] PL/EN localization 100% complete, no missing keys
- [ ] Security audit passed, no critical findings
- [ ] E2E tests pass for all critical user journeys
- [ ] Performance budgets met (cold start ≤ 2s, scan ≤ 5s P95, ≥ 58 FPS)
- [ ] Observability dashboards and alerting operational
- [ ] Alpha → Beta → Production promotion completed

---

## Phase 5: Post-Launch (Ongoing)

### 5.1 Monitoring & Iteration

- [ ] Monitor production dashboards daily (first 2 weeks)
- [ ] Triage and fix critical bugs from production telemetry
- [ ] User feedback analysis (app store reviews, in-app feedback)
- [ ] Weekly review of AI model accuracy metrics
- [ ] Monthly cost optimization review (AI API spend vs budget)

### 5.2 A/B Testing Framework

- [ ] Set up A/B testing infrastructure for nudge strategies
- [ ] Experiment: notification timing optimization
- [ ] Experiment: AI chat persona tone variations
- [ ] Experiment: dashboard layout alternatives

### 5.3 Barcode Scanning (F22 — Could)

- [ ] Research barcode scanning libraries for React Native
- [ ] Integrate with Open Food Facts / product database
- [ ] Implement barcode scanner UI in ScannerStack
- [ ] Map scanned products to nutritional data
- [ ] Fall back to AI scan if barcode not found

### 5.4 Advanced Analytics

- [ ] Implement correlation analysis (meal patterns → weight trends)
- [ ] Implement predictive insights (projected goal date based on trend)
- [ ] Create advanced reports with LLM narrative generation

### 5.5 Adaptive TDEE Recalculation

- [ ] Implement weekly TDEE recalculation:
  - [ ] Exponential moving average of weight trend
  - [ ] Compare actual vs predicted weight change
  - [ ] Correct for metabolic adaptation
- [ ] Notify user when targets are adjusted

### 5.6 Future Roadmap Items (v2)

- [ ] CGM device integration (F23)
- [ ] Social/community features (F24)
- [ ] Meal plan sharing / export as PDF (F19)
- [ ] Gemini Embedding 2 for multimodal RAG (embed meal photos alongside text)

---

_This implementation plan is a living document. Update checkboxes as tasks are completed. Add new tasks as requirements evolve._

# Snacky — Product & System Design Document

**Version:** 1.0.0  
**Status:** Ready for Development  
**Last Updated:** 2026-03-27  
**Classification:** Internal — Engineering & Product

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategic Goals](#2-product-vision--strategic-goals)
3. [Scientific Foundations](#3-scientific-foundations)
4. [User Personas & Scenarios](#4-user-personas--scenarios)
5. [Feature Specification](#5-feature-specification)
6. [System Architecture — High Level](#6-system-architecture--high-level)
7. [Mobile Application Architecture](#7-mobile-application-architecture)
8. [Backend Architecture](#8-backend-architecture)
9. [Database Design](#9-database-design)
10. [AI/ML Pipeline](#10-aiml-pipeline)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [API Design](#12-api-design)
13. [UI/UX Design System](#13-uiux-design-system)
14. [External Integrations](#14-external-integrations)
15. [Performance & Scalability](#15-performance--scalability)
16. [Security & Data Privacy](#16-security--data-privacy)
17. [Observability & Monitoring](#17-observability--monitoring)
18. [Testing Strategy](#18-testing-strategy)
19. [CI/CD & DevOps](#19-cicd--devops)
20. [Phased Delivery Roadmap](#20-phased-delivery-roadmap)
21. [Risk Register](#21-risk-register)
22. [Appendix A — Data Models](#appendix-a--data-models)
23. [Appendix B — API Contract Examples](#appendix-b--api-contract-examples)
24. [Appendix C — References](#appendix-c--references)

---

## 1. Executive Summary

Snacky is a next-generation AI-powered mobile nutrition application built with React Native for Android and iOS. It enables users to track meals through computer vision, design personalized diets optimized for specific health goals, and interact with a contextually-aware AI nutritional assistant.

The system is grounded in evidence-based nutritional science (Dietary Guidelines 2025–2030, USDA FoodData Central, DRI/RDA standards) and behavioral psychology (Nudge Theory, habit-formation frameworks). It employs a Retrieval-Augmented Generation (RAG) architecture for its AI assistant, hybrid MILP + LLM meal planning, and multimodal vision models (GPT-5.4 Vision / Gemini 3.1 Pro) for meal scanning.

**Key differentiators:**

- Multimodal AI meal analysis with human-in-the-loop uncertainty management
- RAG-powered conversational assistant with full user context access
- Hybrid deterministic (MILP) + generative (LLM) diet planning engine
- Evidence-based nutritional models with real-time scientific data integration
- Behavioral nudge system informed by user psychological profiling
- Native health ecosystem integration (Apple HealthKit, Google Health Connect)

---

## 2. Product Vision & Strategic Goals

### 2.1 Vision Statement

> Empower every individual to make informed, science-backed nutritional decisions through an intelligent, beautiful, and deeply personalized mobile experience — transforming dietary management from a chore into a guided, adaptive journey toward their health goals.

### 2.2 Strategic Goals

| Goal             | Metric                                                | Target (Year 1) |
| ---------------- | ----------------------------------------------------- | --------------- |
| User acquisition | Monthly Active Users (MAU)                            | 100K            |
| Retention        | D30 retention rate                                    | ≥ 35%           |
| Engagement       | Avg. meals logged per active user per week            | ≥ 10            |
| AI accuracy      | Meal scan caloric estimation error (single-component) | ≤ 15% MAE       |
| AI accuracy      | Meal scan caloric estimation error (multi-component)  | ≤ 25% MAE       |
| Diet adherence   | Users following generated diet plans for ≥ 2 weeks    | ≥ 40%           |
| NPS              | Net Promoter Score                                    | ≥ 50            |
| Platform parity  | Feature parity between Android and iOS                | 100%            |

### 2.3 Non-Goals (Explicit Exclusions — v1)

- Clinical-grade medical diagnostics or prescriptions
- Integration with electronic health record (EHR) systems
- Social/community features (feed, followers, sharing)
- E-commerce / meal delivery ordering
- Wearable CGM integration (deferred to v2)

---

## 3. Scientific Foundations

### 3.1 Nutritional Science Basis

The application's nutritional logic is built on peer-reviewed, evidence-based frameworks:

| Foundation                 | Source                                             | Application in System                                          |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Macronutrient targets      | Dietary Guidelines for Americans 2025–2030 (DGAC)  | Default macro split computation; sugar/sodium ceiling alerts   |
| Micronutrient adequacy     | DRI (Dietary Reference Intakes) / RDA standards    | Per-nutrient daily tracking and gap analysis                   |
| Food composition data      | USDA FoodData Central API (SR Legacy + Foundation) | Ground-truth nutritional values for all recognized ingredients |
| Diet quality scoring       | Diet Quality Index-International (DQI-I)           | Weekly diet quality score on user dashboard                    |
| Ultra-processed food flags | NOVA classification system                         | Warning labels and nudges on scanned UPF items                 |
| Seasonal/regional data     | EUFIC sustainable nutrition database               | Seasonal ingredient suggestions in meal plans                  |

### 3.2 Behavioral Psychology Framework

| Mechanism                                           | Implementation                                                                         | Expected Outcome                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Architecture of Choice / Default Effect             | Healthy meals surface first in recommendations; less optimal options require scrolling | Increased healthy selection without perceived restriction   |
| Commitment Devices                                  | User-defined goal stakes (virtual points, streak mechanics)                            | Loss-aversion–driven long-term adherence                    |
| Nudge Theory                                        | Contextual, predictive push notifications based on dietary risk analysis               | Improved plan adherence and user retention                  |
| Habit Formation (Initiation → Learning → Stability) | Progressive onboarding; adaptive reminder cadence; friction reduction                  | Sustainable behavioral change over 66+ day formation period |
| Consideration of Future Consequences (CFC)          | Psychobehavioral profiling during onboarding to calibrate AI tone                      | Personalized communication matching user cognitive style    |

### 3.3 Metabolic Modeling

- **TDEE Calculation:** Mifflin-St Jeor equation (primary) with Harris-Benedict (fallback), adjusted by activity multiplier from HealthKit/Health Connect data
- **Adaptive TDEE:** Recalculated weekly using actual weight trend data (exponential moving average) versus predicted weight change, correcting for metabolic adaptation
- **Macronutrient Distribution Ranges (AMDR):** Protein 10–35%, Carbohydrates 45–65%, Fat 20–35% of total energy, with user-goal–specific overrides (e.g., higher protein for muscle gain)

---

## 4. User Personas & Scenarios

### 4.1 Primary Personas

**Persona A — "Goal-Driven Dieter" (Anna, 28)**

- Wants to lose 8 kg for a wedding in 4 months
- Needs structured diet plan, weekly meal prep suggestions
- Scans meals to verify plan compliance
- Uses AI chat for recipe substitution ideas

**Persona B — "Casual Tracker" (Marek, 35)**

- No specific diet plan, wants to understand if current eating habits are adequate
- Scans most meals, occasionally skips
- Checks weekly reports for macro/micro balance
- Leaves comments like "felt bloated after this" to build preference profile

**Persona C — "Health-Conscious Explorer" (Kasia, 42)**

- Managing pre-diabetes through diet
- Needs precise carb tracking and glycemic load awareness
- Relies heavily on AI chat for nutritional Q&A
- Tracks weight and body measurements consistently

### 4.2 Core User Scenarios

#### S1: Onboarding & Authentication

```
1. User opens app → Splash screen with Snacky branding
2. Tap "Continue with Google" → Google OAuth 2.0 (PKCE) flow
3. On first login → Navigate to onboarding questionnaire
4. Questionnaire collects (multi-step, animated transitions):
   Step 1: Basic biometrics (age, sex, height, current weight)
   Step 2: Goal selection (lose weight, gain muscle, maintain, improve nutrition quality)
   Step 3: Target parameters (goal weight, timeline)
   Step 4: Dietary restrictions & allergies (multi-select + free text)
   Step 5: Lifestyle & activity level
   Step 6: Psychobehavioral profiling:
     - Eating triggers (stress, boredom, social, emotional)
     - Snacking patterns
     - Cooking frequency and skill level
     - Consideration of Future Consequences (CFC) scale items
   Step 7: Notification preferences (frequency, timing)
5. System computes: TDEE, macro targets, psychological profile, AI persona calibration
6. Navigate to main dashboard
```

#### S2: Meal Scanning & Analysis

```
1. User taps "+" FAB → Camera opens (or gallery picker)
2. User photographs meal
3. App shows skeleton loader with pulsing animation
4. Backend pipeline:
   a. Image compressed + base64 encoded on device
   b. Sent to /api/v1/meals/scan endpoint
   c. Vision model (GPT-5.4 / Gemini 3.1 Pro) analyzes with structured prompt
   d. Returns: identified ingredients[], estimated portions[],
      nutritional breakdown{}, confidence_score per ingredient
5. If any ingredient confidence < threshold (0.7):
   a. UI shows targeted clarification question:
      "I see a creamy sauce — is it made with cream, yogurt, or coconut milk?"
   b. User selects or types custom answer
   c. Re-estimation with user input incorporated
6. Results displayed: ingredient cards with nutritional data
7. User can:
   - Adjust portions manually (slider)
   - Add/remove detected ingredients
   - Leave a text comment ("This was too salty", "Homemade, used olive oil")
   - Confirm and log meal
8. Meal saved with: image, timestamp, nutritional data, user modifications,
   comments, original AI analysis, GPS-derived timezone
```

#### S3: Diet Plan Creation & Following

```
1. User navigates to "My Diet" section
2. Selects "Create Diet Plan"
3. System shows plan parameters (pre-filled from profile):
   - Duration (1 week / 2 weeks / 1 month / custom)
   - Meals per day (3 / 4 / 5 / custom)
   - Excluded ingredients (from allergies + user additions)
   - Cuisine preferences
   - Budget constraint (optional)
   - Cooking time per meal (quick <20min / moderate / elaborate)
4. Backend pipeline:
   a. MILP solver generates mathematically optimal nutrient matrix
      (exact calorie/macro/micro targets per meal slot, enforcing
       ingredient diversity constraints)
   b. LLM (via RAG with user preference vectors) translates matrix
      into appetizing recipes with instructions
   c. Fuzzy logic layer applies flexibility margins
5. Plan presented as interactive calendar with daily meal cards
6. Each meal card shows: photo (AI-generated or stock), ingredients,
   prep time, nutritional summary
7. User can: swap individual meals (AI suggests alternatives matching
   nutrient slot), regenerate entire day, print shopping list
8. Daily push notification: "Today's lunch: Grilled chicken with
   quinoa salad. Tap to see recipe."
9. When user scans actual meal → auto-compared to planned meal →
   deviation analysis shown
```

#### S4: Ad-Hoc Tracking (No Diet Plan)

```
1. User scans meals throughout the day (S2 flow)
2. Dashboard dynamically updates:
   - Remaining calorie budget (ring chart)
   - Macro progress bars (protein, carbs, fat)
   - Micro-nutrient coverage heatmap
3. If user exceeds macro budget mid-day:
   a. System recalculates remaining daily allocation
   b. AI chat proactively suggests dinner optimization:
      "You're 400 kcal over on carbs. A grilled salmon with
       steamed broccoli tonight would balance your day."
4. End-of-day summary notification with DQI-I score
```

#### S5: AI Chat Assistant

```
1. User opens chat (persistent, scrollable history)
2. User types: "Based on my last 2 weeks, what should I
   cook today to help with my weight loss goal?"
3. Backend RAG pipeline:
   a. Query vectorized → similarity search in user's data embeddings
   b. Retrieved context: recent meal logs, weight trend, flagged
      comments ("felt bloated after pasta"), macro averages
   c. Context injected into LLM system prompt alongside user's
      psychological profile and persona calibration
   d. LLM generates personalized response with cited data points
4. Response rendered as rich message (formatted text, inline
   nutritional badges, tappable recipe cards)
5. User can:
   - Ask follow-ups ("Can I substitute chicken with tofu?")
   - Request plan generation ("Create me a 3-day meal plan")
   - Ask general nutrition questions ("Is intermittent fasting safe?")
   - Ask about specific logged meals ("Why did Tuesday's dinner
     have so much sodium?")
6. Chat has full access to: meal history, photos, comments,
   weight/measurement logs, onboarding profile, diet plans,
   HealthKit/Health Connect data
```

#### S6: Progress Tracking & Analytics

```
1. User navigates to "Progress" tab
2. Views available:
   a. Weight trend (line chart, with trend line and goal marker)
   b. Body measurements (waist, chest, hips — if entered)
   c. Caloric intake vs. expenditure (dual-axis line chart)
   d. Macro distribution over time (stacked area chart)
   e. DQI-I score trend (weekly)
   f. Meal history gallery (scrollable grid of meal photos with dates)
3. Tapping any data point navigates to that day's detailed log
4. Tapping any meal photo opens full meal detail with:
   - Original photo (full resolution)
   - Nutritional breakdown
   - User comments
   - AI analysis diff (if user modified AI suggestions)
5. Weekly report auto-generated (viewable in-app):
   - Caloric adherence %
   - Nutrient gaps highlighted
   - Top nutritional insights
   - Personalized tips based on behavioral patterns
```

#### S7: Body Measurements Input

```
1. User navigates to "Measurements" (via Progress tab or quick-action)
2. Enters: weight (required), waist/chest/hips/body fat % (optional)
3. Data point timestamped and stored
4. If HealthKit/Health Connect linked: weight auto-synced from smart scale
5. Trend chart updates immediately with smooth animation
6. AI adjusts TDEE recalculation if weight deviates from prediction
```

---

## 5. Feature Specification

### 5.1 Feature Priority Matrix (MoSCoW)

| ID  | Feature                                                 | Priority   | Scenario |
| --- | ------------------------------------------------------- | ---------- | -------- |
| F01 | Google OAuth login                                      | Must       | S1       |
| F02 | Onboarding questionnaire (biometric + psychobehavioral) | Must       | S1       |
| F03 | AI meal scanning (camera + gallery)                     | Must       | S2       |
| F04 | Confidence-based user clarification prompts             | Must       | S2       |
| F05 | Meal logging with nutritional breakdown                 | Must       | S2       |
| F06 | Meal comments & user annotations                        | Must       | S2       |
| F07 | Meal photo storage & history                            | Must       | S2, S6   |
| F08 | AI diet plan generation (MILP + LLM)                    | Must       | S3       |
| F09 | Ad-hoc calorie/macro tracking dashboard                 | Must       | S4       |
| F10 | AI chat assistant (RAG-powered)                         | Must       | S5       |
| F11 | Weight & measurement tracking                           | Must       | S7       |
| F12 | Progress analytics & reports                            | Must       | S6       |
| F13 | Push notifications (nudge system)                       | Must       | S3, S4   |
| F14 | Apple HealthKit integration                             | Should     | S7       |
| F15 | Google Health Connect integration                       | Should     | S7       |
| F16 | Offline meal logging (sync on reconnect)                | Should     | S2       |
| F17 | Shopping list generation from diet plan                 | Should     | S3       |
| F18 | DQI-I diet quality scoring                              | Should     | S4, S6   |
| F19 | Meal plan sharing (export as PDF)                       | Could      | S3       |
| F20 | Dark mode                                               | Could      | —        |
| F21 | Localization (Polish + English from day one)            | Must       | All      |
| F22 | Barcode scanning (packaged foods)                       | Could      | S2       |
| F23 | CGM device integration                                  | Won't (v2) | —        |
| F24 | Social/community features                               | Won't (v2) | —        |

### 5.2 Feature Detail: AI Meal Scanning (F03)

**Functional Requirements:**

| ID     | Requirement                                      | Acceptance Criteria                                            |
| ------ | ------------------------------------------------ | -------------------------------------------------------------- |
| F03.1  | Camera capture with auto-focus and flash control | Photo captured at min 1080x1080, EXIF metadata stripped        |
| F03.2  | Gallery image selection                          | Supports JPEG, PNG, HEIC; max 10 MB pre-compression            |
| F03.3  | On-device image compression                      | Output ≤ 500 KB; quality ≥ 80% SSIM vs original                |
| F03.4  | Vision model analysis                            | Returns structured JSON with ingredients, portions, nutrients  |
| F03.5  | Multi-model fallback                             | If primary model fails/times out (>10s), fallback to secondary |
| F03.6  | Confidence scoring                               | Each ingredient tagged with confidence [0.0–1.0]               |
| F03.7  | Clarification UI                                 | Triggered when any confidence < 0.7; max 3 questions per scan  |
| F03.8  | Manual override                                  | User can edit any AI-detected value before confirming          |
| F03.9  | USDA cross-reference                             | All nutritional values validated against USDA FoodData Central |
| F03.10 | Scan history linkage                             | Each scan creates immutable record linked to meal entry        |

**Non-Functional Requirements:**

| NFR                      | Metric                             | Target      |
| ------------------------ | ---------------------------------- | ----------- |
| Latency (scan → results) | P95 end-to-end                     | ≤ 5 seconds |
| Latency (scan → results) | P99 end-to-end                     | ≤ 8 seconds |
| Availability             | Vision API uptime                  | ≥ 99.5%     |
| Accuracy                 | Single-food calorie estimation MAE | ≤ 15%       |
| Accuracy                 | Multi-food calorie estimation MAE  | ≤ 25%       |
| Throughput               | Concurrent scans supported         | ≥ 1,000/min |

---

## 6. System Architecture — High Level

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              React Native Application (iOS + Android)         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │  │
│  │  │ Auth     │ │ Scanner  │ │ Chat     │ │ Dashboard/      │ │  │
│  │  │ Module   │ │ Module   │ │ Module   │ │ Analytics Module│ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────────┐│  │
│  │  │  @supabase/supabase-js │ TanStack Query │ Zustand       ││  │
│  │  └──────────────────────────────────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS/WSS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                              │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Supabase Auth   │  │  PostgREST       │  │  Edge Functions  │  │
│  │  (Google OAuth)  │  │  (Auto CRUD API) │  │  (Deno/TS)       │  │
│  │                  │  │                  │  │                  │  │
│  │  - Google Sign-In│  │  - User Profiles │  │  - meal-scan     │  │
│  │  - JWT tokens    │  │  - Meals CRUD    │  │  - chat (RAG+SSE)│  │
│  │  - Session mgmt  │  │  - Measurements  │  │  - embed         │  │
│  │                  │  │  - Diet Plans    │  │  - generate-plan │  │
│  │                  │  │  - Chat Sessions │  │  - send-notif    │  │
│  │                  │  │  - RLS enforced  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Supabase        │  │  Realtime        │  │  pg_cron         │  │
│  │  Storage         │  │  (WebSocket)     │  │  (Scheduled Jobs)│  │
│  │  (Meal Photos)   │  │                  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 17 + pgvector (HNSW)                            │   │
│  │  - All application tables (RLS-protected)                    │   │
│  │  - Vector embeddings (HNSW-indexed via pgvector)            │   │
│  │  - Triggers → Edge Functions (async embedding pipeline)     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │ OpenAI API   │ │ Google AI    │ │ USDA Food    │ │ Firebase  │ │
│  │ (GPT-5.4     │ │ (Gemini 3.1  │ │ Data Central │ │ Cloud     │ │
│  │  Vision)     │ │  Pro)        │ │ API          │ │ Messaging │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Anthropic    │ │ Voyage AI    │ │ Google       │               │
│  │ (Claude      │ │ (Embeddings) │ │ Identity     │               │
│  │  Sonnet 4.6) │ │              │ │ Services     │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Architecture Principles

| Principle                  | Implementation                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Backend-as-a-Service**   | Supabase provides Auth, DB, Storage, Edge Functions, Realtime — single platform replacing multiple cloud services   |
| **API-First**              | PostgREST auto-generates REST API from DB schema; Edge Functions for custom logic; `@supabase/supabase-js` as SDK   |
| **Event-Driven**           | Database triggers → Edge Functions for async embedding, notifications; pg_cron for scheduled tasks                  |
| **Offline-First (Mobile)** | TanStack Query persistence + optimistic updates; background sync on reconnect                                       |
| **Security at DB Level**   | Row Level Security (RLS) on every table; Supabase Auth JWT validated by PostgREST; encrypted at rest and in transit |
| **Observability-First**    | Supabase Dashboard metrics + Edge Function logs; structured logging in all functions                                |

### 6.3 Cloud Infrastructure (Supabase)

| Component      | Supabase Service              | Justification                                                    |
| -------------- | ----------------------------- | ---------------------------------------------------------------- |
| Auth           | Supabase Auth                 | Managed Google OAuth, JWT, session management, refresh tokens    |
| Database       | Supabase Postgres (17)        | Managed PostgreSQL with pgvector, pg_cron, pg_net extensions     |
| API            | PostgREST                     | Auto-generated REST API from schema with RLS enforcement         |
| Compute        | Edge Functions (Deno)         | Serverless TypeScript functions for AI, planning, notifications  |
| Vector DB      | pgvector extension            | HNSW-indexed vector search within same Postgres instance         |
| Object Storage | Supabase Storage              | S3-compatible, RLS-protected, with CDN and image transformations |
| Realtime       | Supabase Realtime             | WebSocket subscriptions for live data updates                    |
| Scheduling     | pg_cron                       | Cron-based job scheduling for notifications and maintenance      |
| Secrets        | Supabase Vault / Env vars     | API keys stored as Edge Function secrets                         |
| CI/CD          | GitHub Actions + Supabase CLI | `supabase db push` + `supabase functions deploy`                 |

---

## 7. Mobile Application Architecture

### 7.1 React Native Stack

| Layer                | Technology                                                        | Version | Purpose                                              |
| -------------------- | ----------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| Framework            | React Native (New Architecture)                                           | ≥ 0.84  | Cross-platform mobile framework                      |
| Language             | TypeScript                                                                | ≥ 6.0   | Type-safe development                                |
| Navigation           | React Navigation v7 (Native Stack)                                        | ≥ 7.x   | Screen navigation with native transitions            |
| State Management     | Zustand                                                                   | ≥ 5.x   | Lightweight, scalable global state                   |
| Server State         | TanStack Query (React Query) v5                                           | ≥ 5.x   | API caching, offline persistence, optimistic updates |
| UI Components        | Gluestack-UI v3 (`@gluestack-ui/core` + `@gluestack-ui/utils`)            | ≥ 3.x   | Headless component creators with NativeWind styling  |
| Styling              | NativeWind (Tailwind CSS for RN)                                          | ≥ 4.2   | Utility-first styling with design tokens             |
| Animations           | React Native Reanimated 4                                                 | ≥ 4.x   | 60fps UI-thread animations                           |
| Charts               | Victory Native + @shopify/react-native-skia                               | Latest  | Health data visualization                            |
| Camera               | react-native-vision-camera v4                                             | ≥ 4.x   | High-perf camera with frame processor support        |
| Image Processing     | @bam.tech/react-native-image-resizer                                      | ≥ 3.x   | On-device compression before upload                  |
| Push Notifications   | @react-native-firebase/messaging                                          | Latest  | FCM (Android) + APNs (iOS)                           |
| Secure Storage       | react-native-keychain                                                     | ≥ 10.x  | Biometric-protected token storage                    |
| Health Integration   | @kingstinct/react-native-healthkit (iOS) / react-native-health-connect (Android) | Latest  | HealthKit and Health Connect bridges          |
| Offline Storage      | @tanstack/query-persist-client + react-native-mmkv                        | Latest  | Persistent cache for offline-first                   |
| Forms                | React Hook Form + Zod                                                     | Latest  | Validated form handling (onboarding, measurements)   |
| Internationalization | i18next + react-i18next                                                   | Latest  | Multi-language support                               |

### 7.2 New Architecture Enforcement

**All modules MUST leverage the React Native New Architecture:**

- **Fabric Renderer:** Synchronous layout computation eliminates layout shift on dynamic dashboard tiles
- **TurboModules:** Lazy-loaded native modules (camera, health integrations, secure storage) reduce cold start time by ~40%
- **JSI (JavaScript Interface):** Direct C++ ↔ JS communication removes bridge serialization overhead; critical for camera frame processing pipeline

**Codegen configuration (mandatory):**

```json
{
  "codegenConfig": {
    "name": "SnackySpecs",
    "type": "all",
    "jsSrcsDir": "src/native"
  }
}
```

### 7.3 Project Structure (Feature-Sliced Design)

```
src/
├── app/                          # App entry, providers, navigation root
│   ├── App.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── NotificationProvider.tsx
│   └── navigation/
│       ├── RootNavigator.tsx
│       ├── AuthNavigator.tsx
│       ├── MainTabNavigator.tsx
│       └── types.ts
│
├── features/                     # Feature modules (self-contained)
│   ├── auth/
│   │   ├── api/                  # API calls (TanStack Query hooks)
│   │   ├── components/           # UI components
│   │   ├── hooks/                # Feature-specific hooks
│   │   ├── screens/              # Screen components
│   │   ├── store/                # Zustand slices
│   │   └── types.ts
│   │
│   ├── onboarding/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── BiometricsStep.tsx
│   │   │   ├── GoalStep.tsx
│   │   │   ├── DietaryRestrictionsStep.tsx
│   │   │   ├── LifestyleStep.tsx
│   │   │   ├── PsychoBehavioralStep.tsx
│   │   │   └── NotificationPrefsStep.tsx
│   │   ├── hooks/
│   │   ├── screens/
│   │   └── validation/           # Zod schemas per step
│   │
│   ├── scanner/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── CameraOverlay.tsx
│   │   │   ├── ScanResultCard.tsx
│   │   │   ├── IngredientEditor.tsx
│   │   │   ├── ClarificationDialog.tsx
│   │   │   └── PortionSlider.tsx
│   │   ├── hooks/
│   │   │   ├── useImageCapture.ts
│   │   │   ├── useImageCompression.ts
│   │   │   └── useScanAnalysis.ts
│   │   ├── screens/
│   │   └── utils/
│   │       └── imageProcessing.ts
│   │
│   ├── meals/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── MealCard.tsx
│   │   │   ├── MealDetail.tsx
│   │   │   ├── MealTimeline.tsx
│   │   │   ├── NutritionBreakdown.tsx
│   │   │   ├── CommentInput.tsx
│   │   │   └── MacroProgressBars.tsx
│   │   ├── hooks/
│   │   ├── screens/
│   │   └── types.ts
│   │
│   ├── diet-plan/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── PlanCalendar.tsx
│   │   │   ├── MealSlotCard.tsx
│   │   │   ├── RecipeDetail.tsx
│   │   │   ├── ShoppingList.tsx
│   │   │   └── PlanConfigWizard.tsx
│   │   ├── hooks/
│   │   ├── screens/
│   │   └── types.ts
│   │
│   ├── chat/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── RecipeCard.tsx      # Rich inline recipe cards
│   │   │   ├── NutrientBadge.tsx   # Inline nutritional badges
│   │   │   └── StreamingMessage.tsx
│   │   ├── hooks/
│   │   │   ├── useChatStream.ts    # SSE streaming hook
│   │   │   └── useChatHistory.ts
│   │   ├── screens/
│   │   └── types.ts
│   │
│   ├── progress/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── WeightChart.tsx
│   │   │   ├── MacroTrendChart.tsx
│   │   │   ├── DQIScoreCard.tsx
│   │   │   ├── MealPhotoGallery.tsx
│   │   │   ├── WeeklyReportCard.tsx
│   │   │   └── MeasurementInput.tsx
│   │   ├── hooks/
│   │   ├── screens/
│   │   └── types.ts
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── BentoGrid.tsx
│   │   │   ├── CalorieBudgetTile.tsx
│   │   │   ├── MacroSummaryTile.tsx
│   │   │   ├── HydrationTile.tsx
│   │   │   ├── QuickActionsTile.tsx
│   │   │   ├── RecentMealsTile.tsx
│   │   │   └── AIChatPreviewTile.tsx
│   │   ├── hooks/
│   │   └── screens/
│   │
│   └── notifications/
│       ├── api/
│       ├── hooks/
│       └── handlers/
│
├── shared/                       # Cross-feature shared code
│   ├── api/
│   │   ├── client.ts             # Axios/Ky instance with interceptors
│   │   ├── types.ts              # Shared API response types
│   │   └── errorHandler.ts
│   ├── components/
│   │   ├── SkeletonLoader.tsx
│   │   ├── AnimatedTransition.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── EmptyState.tsx
│   ├── constants/
│   │   ├── nutrition.ts          # RDA values, macro ranges
│   │   └── config.ts
│   ├── hooks/
│   │   ├── useAppState.ts
│   │   ├── useNetworkStatus.ts
│   │   └── useHealthData.ts
│   ├── theme/
│   │   ├── tokens.ts             # Design tokens (colors, spacing, typography)
│   │   ├── lightTheme.ts
│   │   └── darkTheme.ts
│   ├── types/
│   │   ├── nutrition.ts
│   │   ├── user.ts
│   │   └── common.ts
│   └── utils/
│       ├── dateTime.ts
│       ├── unitConversion.ts     # kcal↔kJ, lbs↔kg, etc.
│       └── validation.ts
│
├── i18n/                         # Internationalization (day-one requirement)
│   ├── index.ts                  # i18next initialization + language detector
│   ├── types.ts                  # Typed translation keys (auto-generated)
│   ├── pl/                       # Polish translations
│   │   ├── common.json           # Shared UI: buttons, labels, errors
│   │   ├── auth.json
│   │   ├── onboarding.json
│   │   ├── scanner.json
│   │   ├── meals.json
│   │   ├── dietPlan.json
│   │   ├── chat.json
│   │   ├── progress.json
│   │   ├── dashboard.json
│   │   ├── notifications.json
│   │   └── settings.json
│   └── en/                       # English translations (same structure)
│       ├── common.json
│       ├── auth.json
│       ├── onboarding.json
│       ├── scanner.json
│       ├── meals.json
│       ├── dietPlan.json
│       ├── chat.json
│       ├── progress.json
│       ├── dashboard.json
│       ├── notifications.json
│       └── settings.json
│
├── native/                       # TurboModule specs & native code
│   ├── NativeHealthBridge.ts
│   └── NativeImageProcessor.ts
│
└── assets/
    ├── fonts/
    ├── icons/
    ├── images/
    └── animations/               # Lottie files
```

### 7.4 Navigation Architecture

```
RootNavigator
├── AuthNavigator (Stack)
│   ├── WelcomeScreen
│   └── LoginScreen (Google OAuth WebView/Native)
│
├── OnboardingNavigator (Stack, modal presentation)
│   ├── OnboardingStepScreen (dynamic, 7 steps)
│   └── OnboardingCompleteScreen
│
└── MainTabNavigator (Bottom Tabs)
    ├── DashboardStack
    │   ├── DashboardScreen (Bento Grid home)
    │   └── MealDetailScreen
    │
    ├── ScannerStack
    │   ├── ScannerScreen (Camera)
    │   ├── ScanResultScreen
    │   └── MealEditScreen
    │
    ├── DietPlanStack
    │   ├── DietPlanListScreen
    │   ├── PlanDetailScreen (Calendar view)
    │   ├── PlanConfigScreen
    │   ├── RecipeDetailScreen
    │   └── ShoppingListScreen
    │
    ├── ChatStack
    │   └── ChatScreen
    │
    └── ProgressStack
        ├── ProgressDashboardScreen
        ├── MealHistoryScreen
        ├── MealPhotoDetailScreen (Shared Element Transition)
        ├── MeasurementInputScreen
        └── WeeklyReportScreen
```

### 7.5 Internationalization (i18n) — Day-One Requirement

Localization is **not a polish-phase task** — it is a foundational constraint. Every user-facing string is externalized into translation files from the first commit. The app ships with Polish (`pl`) and English (`en`) from Phase 0 onwards.

**Technology:**

| Library                        | Role                                                               |
| ------------------------------ | ------------------------------------------------------------------ |
| `i18next`                      | Core i18n runtime (pluralization, interpolation, context, nesting) |
| `react-i18next`                | React hooks and components (`useTranslation`, `<Trans>`)           |
| `i18next-resources-to-backend` | Lazy-load translation namespaces per feature                       |
| `expo-localization`            | Detect device locale at startup                                    |
| `intl-pluralrules`             | Polyfill for Intl.PluralRules on Hermes (Android)                  |

**Configuration:**

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  lng: deviceLocale,
  fallbackLng: 'en',
  supportedLngs: ['pl', 'en'],
  ns: [
    'common',
    'auth',
    'onboarding',
    'scanner',
    'meals',
    'dietPlan',
    'chat',
    'progress',
    'dashboard',
    'notifications',
    'settings',
  ],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: true },
});

export default i18n;
```

**Translation file conventions:**

| Convention         | Rule                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Key naming         | Dot-nested, camelCase: `scanner.result.ingredientConfidence`                                     |
| Namespaces         | One JSON file per feature module, matching feature folder names                                  |
| Pluralization      | Use i18next plural suffixes: `_one`, `_few`, `_many`, `_other` (Polish has 3 plural forms)       |
| Interpolation      | Named variables: `"Welcome, {{name}}"` / `"Witaj, {{name}}"`                                     |
| Context            | Gender/variant via context suffix: `goal_male`, `goal_female` (where Polish grammar requires it) |
| Numbers & units    | Formatted via `Intl.NumberFormat` with user locale; never hardcoded separators                   |
| Dates              | Formatted via `date-fns/locale` with `pl` or `en-US`; never hardcoded formats                    |
| Default language   | English (`en`) — all keys must exist in `en/` first; `pl/` mirrors the same keys                 |
| Missing key policy | Development: console warning + renders key path; Production: falls back to `en`                  |

**Polish-specific considerations:**

| Concern                                          | Handling                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Plural forms (1 / 2-4 / 5+)                      | i18next built-in Polish plural rules: `_one`, `_few`, `_many` suffixes          |
| Grammatical gender                               | Context variants where needed (e.g., nutritional descriptions, AI chat persona) |
| Diacritics (ą, ć, ę, ł, ń, ó, ś, ź, ż)           | UTF-8 throughout; font stack verified for full Polish character support         |
| String length expansion (~20-30% longer than EN) | UI designed with flexible containers; tested with Polish strings from day one   |
| Date/time format                                 | `dd.MM.yyyy`, `HH:mm` (24h) per Polish convention via `date-fns/locale/pl`      |
| Decimal separator                                | Comma (`,`) per Polish convention via `Intl.NumberFormat('pl-PL')`              |
| Units                                            | Metric by default (kg, cm, kcal); no conversion needed for Polish users         |

**Enforced development rules:**

1. **No hardcoded user-facing strings.** Every visible text uses `t('namespace.key')`. CI lint rule (`eslint-plugin-i18next`) rejects raw string literals in JSX.
2. **Translation files updated in the same PR** as the feature that adds new keys. PR checklist item: "All new UI strings added to both `en/` and `pl/`."
3. **AI-generated content** (chat responses, scan results, clarification questions) localized at the prompt level — the LLM system prompt includes `locale` and responds in the user's language.
4. **Push notifications** rendered in the user's locale — notification templates stored per language.
5. **User can switch language** in Settings without app restart (i18next `changeLanguage()` triggers React re-render).

**Backend localization:**

| Concern                    | Implementation                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| API error messages         | Error `detail` field returned in user's locale (Accept-Language header)                  |
| AI chat responses          | LLM system prompt includes `locale: {user_locale}` — model responds in Polish or English |
| Push notification content  | Templates stored per locale; rendered server-side before dispatch                        |
| AI clarification questions | Vision model prompt includes language instruction; questions returned in user's locale   |
| Weekly reports             | Report narrative generated in user's locale by LLM                                       |

### 7.6 Offline Strategy

| Data Type                | Offline Behavior                                            | Sync Strategy                                         |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------- |
| Meal logs (pending scan) | Queued locally in MMKV; photo saved to device               | Background upload on reconnect; exponential backoff   |
| Dashboard data           | TanStack Query stale-while-revalidate from persistent cache | Automatic refresh on app foreground                   |
| Chat history             | Last 100 messages cached; new messages queued               | Append-only sync; conflict-free                       |
| Measurements             | Saved locally immediately                                   | Upsert sync with server timestamp conflict resolution |
| Diet plan                | Full plan cached on device                                  | Pull-based refresh; immutable plan versions           |

---

## 8. Backend Architecture

### 8.1 Backend-as-a-Service (Supabase)

The entire backend runs on Supabase, replacing the original microservices architecture with a single managed platform.

#### 8.1.1 CRUD API (PostgREST — auto-generated)

**Responsibilities:** User profiles, meal CRUD, measurement CRUD, diet plan management, chat sessions, health sync, notification log — all standard data operations.

**Technology:**

- PostgREST auto-generates REST endpoints from PostgreSQL tables
- Row Level Security (RLS) enforces authorization at the database level
- `@supabase/supabase-js` SDK used by mobile app (replaces custom API client)
- Supabase Auth handles Google OAuth, JWT issuance, session management, token refresh

**Key design decisions:**

- No custom API server needed for CRUD — PostgREST handles it automatically
- All timestamps stored and transmitted as UTC ISO 8601
- Pagination: cursor-based via Supabase client `.range()` and `.order()`
- Rate limiting: handled by Supabase platform (configurable per project)

#### 8.1.2 AI Edge Functions (Deno / TypeScript)

**Responsibilities:** Vision pipeline (meal scanning), RAG engine, chat completion, embedding generation, confidence scoring.

**Technology:**

- Runtime: Deno (Supabase Edge Functions)
- AI Orchestration: Direct API calls to vision/chat/embedding providers
- Embedding Model: voyage-4-large (documents) / voyage-4-lite (queries) via Voyage AI API
- Vision Models: OpenAI GPT-5.4 Vision (primary), Google Gemini 3.1 Pro (fallback), Claude Sonnet 4.6 (tertiary fallback)
- Validation: Zod (TypeScript, shared schemas with mobile app via monorepo)
- Vector DB: pgvector extension in Supabase Postgres (HNSW indexes)

**AI Model Inventory (as of March 2026):**

| Role                    | Model                     | Provider  | Release  | Key Capabilities                                                                | Rationale                                                                                                                         |
| ----------------------- | ------------------------- | --------- | -------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Vision (primary)        | **GPT-5.4 Vision**        | OpenAI    | Mar 2026 | 1M token context, 33% fewer hallucinations vs GPT-5.2, native structured output | Best-in-class food recognition accuracy (>90% EWR); improved token efficiency reduces cost                                        |
| Vision (fallback)       | **Gemini 3.1 Pro**        | Google    | Feb 2026 | 1M token context, ARC-AGI-2 score 77.1%, advanced multimodal                    | Competitive vision quality; independent infrastructure from OpenAI for redundancy                                                 |
| Vision (tertiary)       | **Claude Sonnet 4.6**     | Anthropic | Feb 2026 | Strong vision understanding, up to 600 images per API request                   | Third provider for maximum availability; strong at nuanced food descriptions                                                      |
| Chat (complex)          | **GPT-5.4**               | OpenAI    | Mar 2026 | Advanced reasoning, 1M context window, reduced hallucination                    | Best reasoning for complex nutritional analysis and plan creation queries                                                         |
| Chat (simple)           | **GPT-5.4 mini**          | OpenAI    | Mar 2026 | Cost-efficient, fast inference                                                  | 80% cost reduction for simple intent-routed queries (greetings, single-fact lookups)                                              |
| Chat (cost-opt alt)     | **Gemini 3.1 Flash-Lite** | Google    | Feb 2026 | Lowest latency, highest throughput, cost-efficient                              | Alternative for high-volume, low-complexity chat; lowest cost per token                                                           |
| Embeddings (primary)    | **voyage-4-large**        | Voyage AI | Jan 2026 | MoE architecture, 32K context, shared embedding space, 2048 dimensions          | SOTA retrieval accuracy with 40% lower cost than dense alternatives; asymmetric retrieval enables using voyage-4-lite for queries |
| Embeddings (query-side) | **voyage-4-lite**         | Voyage AI | Jan 2026 | Compatible embedding space with voyage-4-large, ultra-low latency               | Shared embedding space allows cheap query encoding against voyage-4-large document embeddings                                     |
| Embeddings (multimodal) | **Gemini Embedding 2**    | Google    | Mar 2026 | Natively multimodal (text, image, video, audio), single embedding space         | Future-ready for embedding meal photos directly alongside text for richer RAG retrieval                                           |
| Recipe generation       | **GPT-5.4**               | OpenAI    | Mar 2026 | Creative text generation, instruction following                                 | Translates MILP nutrient matrices into appetizing, culturally-aware recipes                                                       |

**RAG Architecture Detail:**

```
User Query
    │
    ▼
┌──────────────┐
│ Query        │  ← Classify intent (nutrition Q&A, meal suggestion,
│ Router       │     plan creation, data lookup)
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────────────────────────────┐
│ Retrieval    │────▶│ pgvector (Supabase PostgreSQL)        │
│ Engine       │     │                                      │
│              │     │ Embedding categories:                │
│              │     │  ├── user_{id}_meals      (meals +   │
│              │     │  │                         comments) │
│              │     │  ├── user_{id}_measurements          │
│              │     │  ├── user_{id}_profile               │
│              │     │  ├── usda_foods                      │
│              │     │  ├── nutritional_guidelines           │
│              │     │  └── recipes_db                      │
│              │     └──────────────────────────────────────┘
│              │
│              │     ┌──────────────────────────────────────┐
│              │────▶│ PostgreSQL (via SQL query)           │
│              │     │  Recent meals, weight trend, plan    │
│              │     │  adherence metrics                   │
│              │     └──────────────────────────────────────┘
└──────┬───────┘
       │ Retrieved Context Documents
       ▼
┌──────────────┐
│ Prompt       │  ← System prompt with:
│ Assembler    │     - User psychological profile & persona calibration
│              │     - Retrieved context documents
│              │     - Guardrails (medical disclaimer, no diagnoses)
│              │     - Output format instructions
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ LLM          │  ← GPT-5.4 / Gemini 3.1 Pro
│ Generator    │     Streaming response via SSE
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Response     │  ← Pydantic validation of structured sections
│ Post-        │     Citation injection
│ Processor    │     Rich card rendering instructions
└──────────────┘
```

**Embedding Pipeline (Async):**

```
Trigger: New meal logged / comment added / measurement recorded
    │
    ▼
Message Queue (BullMQ job)
    │
    ▼
Embedding Worker:
  1. Serialize entity to text representation
     e.g., "2026-03-27 Lunch: Grilled chicken breast (200g) with
           brown rice (150g) and steamed broccoli. 520 kcal,
           45g protein, 55g carbs, 12g fat.
           User comment: 'Very filling, skipping afternoon snack'"
  2. Generate embedding vector via voyage-4-large (Voyage AI)
  3. Upsert to vector DB with metadata tags:
     {user_id, entity_type, timestamp, meal_type, calorie_range}
```

#### 8.1.3 Meal Planning Service (Python / FastAPI)

**Responsibilities:** MILP-based diet plan optimization, LLM recipe generation, plan adjustment, shopping list compilation.

**Technology:**

- Optimization: PuLP (Python) with CBC/GLPK solvers
- LLM: GPT-5.4 via LangChain for recipe generation
- Fuzzy Logic: scikit-fuzzy for real-time ad-hoc adjustments

**MILP Formulation Overview:**

```
Objective: Minimize deviation from target macronutrient goals across N days

Subject to:
  - Daily calorie target ± 5% tolerance
  - Protein target ± 10g tolerance per day
  - Carbohydrate AMDR range
  - Fat AMDR range
  - Each micronutrient ≥ 80% RDA per day (averaged over 3-day window)
  - No ingredient repeated in same meal slot within 3 consecutive days
  - Excluded allergens/restrictions: hard constraint (zero tolerance)
  - Maximum prep time per meal ≤ user preference
  - Ingredient cost ≤ user budget (if specified)
  - Minimum 15 unique main ingredients per week
```

#### 8.1.4 Notification Service

**Responsibilities:** Push notification dispatch, nudge scheduling, notification preference management.

**Technology:**

- Firebase Cloud Messaging (Android) + Apple Push Notification service (iOS)
- Scheduling: BullMQ delayed jobs
- Template engine: Handlebars for dynamic notification content

**Nudge Types:**

| Nudge Type         | Trigger                                         | Example                                                                 |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Meal Reminder      | Time-based (user's typical meal window ± 30min) | "It's almost lunch time! Ready to scan your meal?"                      |
| Budget Alert       | Mid-day macro budget exceeded                   | "You've used 80% of your carb budget. Consider a protein-rich dinner."  |
| Streak Maintenance | 20:00 local time, no meals logged today         | "Don't break your 7-day logging streak! Log today's meals."             |
| Weekly Report      | Sunday 09:00 local time                         | "Your weekly nutrition report is ready. You improved your DQI-I score!" |
| Plan Reminder      | 30 min before planned meal time                 | "Next up: Mediterranean Quinoa Bowl. Tap for the recipe."               |

### 8.2 Communication Patterns

| Communication                     | Protocol                       | Use Case                               |
| --------------------------------- | ------------------------------ | -------------------------------------- |
| Client → PostgREST                | REST (HTTPS)                   | All CRUD operations (auto-generated)   |
| Client → Supabase Auth            | REST (HTTPS)                   | Authentication, token refresh          |
| Client → Edge Functions           | REST + SSE (HTTPS)             | Meal scan, chat streaming, plan gen    |
| Client → Supabase Storage         | REST (HTTPS)                   | Meal photo upload/download             |
| DB Trigger → Edge Function (embed)| pg_net HTTP POST               | Async embedding generation on insert   |
| pg_cron → Edge Function (notif)   | pg_net HTTP POST               | Scheduled notification dispatch        |
| Edge Functions → External APIs    | REST (HTTPS)                   | OpenAI, Google AI, Voyage AI, FCM      |

---

## 9. Database Design

### 9.1 PostgreSQL Schema (Core)

```sql
-- Users and authentication
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id       VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE TABLE user_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth       DATE,
    biological_sex      VARCHAR(20),   -- 'male', 'female', 'other', 'prefer_not_to_say'
    height_cm           DECIMAL(5,1),
    activity_level      VARCHAR(20),   -- 'sedentary','lightly_active','moderately_active','very_active','extra_active'
    goal_type           VARCHAR(30),   -- 'lose_weight','gain_muscle','maintain','improve_nutrition'
    goal_weight_kg      DECIMAL(5,1),
    goal_timeline_weeks INTEGER,
    dietary_restrictions TEXT[],        -- ['vegetarian','gluten_free','nut_allergy',...]
    allergies           TEXT[],
    cooking_skill       VARCHAR(20),   -- 'beginner','intermediate','advanced'
    cooking_time_pref   VARCHAR(20),   -- 'quick','moderate','elaborate'
    cuisine_preferences TEXT[],
    locale              VARCHAR(5) NOT NULL DEFAULT 'en',  -- 'pl' or 'en'; detected from device, user-overridable

    -- Computed targets (recalculated on profile update or weight change)
    tdee_kcal           INTEGER,
    target_kcal         INTEGER,
    target_protein_g    INTEGER,
    target_carbs_g      INTEGER,
    target_fat_g        INTEGER,

    -- Psychobehavioral profile
    psych_profile       JSONB,         -- CFC score, eating triggers, snacking patterns
    ai_persona_config   JSONB,         -- Persona calibration for AI assistant

    notification_prefs  JSONB,         -- {enabled: bool, meal_reminders: bool, ...}

    onboarding_completed_at TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meals and nutrition tracking
CREATE TABLE meals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type       VARCHAR(20) NOT NULL,  -- 'breakfast','lunch','dinner','snack'
    logged_at       TIMESTAMPTZ NOT NULL,
    timezone_offset INTEGER,               -- Minutes from UTC at logging time

    -- Image
    image_key       VARCHAR(500),          -- Supabase Storage object path
    image_url       TEXT,                  -- Pre-signed URL (computed, not stored)

    -- AI Analysis (immutable record of what AI detected)
    ai_analysis     JSONB NOT NULL,        -- Full AI response with confidence scores

    -- Final values (after user modifications)
    total_calories  DECIMAL(7,1),
    total_protein_g DECIMAL(6,1),
    total_carbs_g   DECIMAL(6,1),
    total_fat_g     DECIMAL(6,1),
    total_fiber_g   DECIMAL(6,1),
    total_sugar_g   DECIMAL(6,1),
    total_sodium_mg DECIMAL(7,1),
    micronutrients  JSONB,                 -- {vitamin_a_ug: 450, iron_mg: 3.2, ...}

    -- User modifications
    user_modified   BOOLEAN DEFAULT FALSE,
    modification_diff JSONB,               -- What user changed from AI suggestion

    -- Metadata
    source          VARCHAR(20) DEFAULT 'scan',  -- 'scan','manual','plan_logged'
    diet_plan_id    UUID REFERENCES diet_plans(id),
    nova_class      INTEGER,               -- NOVA ultra-processed food classification (1-4)

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meals_user_logged ON meals(user_id, logged_at DESC);
CREATE INDEX idx_meals_user_type ON meals(user_id, meal_type, logged_at DESC);

CREATE TABLE meal_ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    usda_fdc_id     INTEGER,               -- USDA FoodData Central ID (if matched)
    portion_g       DECIMAL(6,1),
    calories        DECIMAL(6,1),
    protein_g       DECIMAL(5,1),
    carbs_g         DECIMAL(5,1),
    fat_g           DECIMAL(5,1),
    confidence      DECIMAL(3,2),          -- AI confidence [0.00-1.00]
    user_verified   BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_ingredients_meal ON meal_ingredients(meal_id);

CREATE TABLE meal_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_meal ON meal_comments(meal_id);
CREATE INDEX idx_comments_user ON meal_comments(user_id, created_at DESC);

-- Body measurements
CREATE TABLE measurements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measured_at     TIMESTAMPTZ NOT NULL,
    weight_kg       DECIMAL(5,1),
    waist_cm        DECIMAL(5,1),
    chest_cm        DECIMAL(5,1),
    hips_cm         DECIMAL(5,1),
    body_fat_pct    DECIMAL(4,1),
    source          VARCHAR(20) DEFAULT 'manual',  -- 'manual','healthkit','health_connect'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_measurements_user ON measurements(user_id, measured_at DESC);

-- Diet Plans
CREATE TABLE diet_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active','completed','paused','archived'
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    meals_per_day   INTEGER NOT NULL DEFAULT 3,

    -- Configuration snapshot (immutable at creation time)
    config          JSONB NOT NULL,        -- Full plan parameters at generation time
    target_kcal     INTEGER NOT NULL,
    target_macros   JSONB NOT NULL,        -- {protein_g, carbs_g, fat_g}

    -- MILP solver metadata
    solver_metadata JSONB,                 -- solver time, objective value, iterations

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_user ON diet_plans(user_id, status, start_date DESC);

CREATE TABLE diet_plan_meals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_plan_id    UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
    day_number      INTEGER NOT NULL,      -- 1-indexed day within plan
    meal_slot       VARCHAR(20) NOT NULL,  -- 'breakfast','lunch','dinner','snack_1','snack_2'

    recipe_name     VARCHAR(500) NOT NULL,
    recipe_instructions TEXT,
    prep_time_min   INTEGER,
    ingredients     JSONB NOT NULL,        -- [{name, amount_g, usda_fdc_id, ...}]

    calories        DECIMAL(7,1) NOT NULL,
    protein_g       DECIMAL(6,1) NOT NULL,
    carbs_g         DECIMAL(6,1) NOT NULL,
    fat_g           DECIMAL(6,1) NOT NULL,
    micronutrients  JSONB,

    image_url       TEXT,                  -- AI-generated or stock recipe image

    -- Tracking
    logged_meal_id  UUID REFERENCES meals(id),  -- Link to actual logged meal (if eaten)
    skipped         BOOLEAN DEFAULT FALSE,

    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_plan_meals ON diet_plan_meals(diet_plan_id, day_number, sort_order);

-- Chat
CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,  -- 'user','assistant','system'
    content         TEXT NOT NULL,

    -- RAG metadata
    retrieved_context_ids TEXT[],           -- IDs of retrieved documents used
    model_used      VARCHAR(50),           -- 'gpt-5.4', 'gemini-3.1-pro', 'claude-sonnet-4.6', etc.
    tokens_used     INTEGER,

    -- Rich content attachments
    attachments     JSONB,                 -- [{type:'recipe_card', data:{...}}, ...]

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages ON chat_messages(session_id, created_at);

-- Health integrations sync log
CREATE TABLE health_sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source          VARCHAR(30) NOT NULL,  -- 'apple_healthkit', 'google_health_connect'
    data_type       VARCHAR(50) NOT NULL,  -- 'weight','steps','active_calories','heart_rate','sleep'
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    records_count   INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'success',
    error_details   TEXT
);

-- Push notification tracking
CREATE TABLE notification_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ,
    opened_at       TIMESTAMPTZ
);
```

### 9.2 Vector Embeddings (pgvector — in Supabase Postgres)

All vector embeddings are stored in a single `embeddings` table within the same Postgres instance using the `pgvector` extension with HNSW indexes — no external vector database required.

**Table: `public.embeddings`**

| Column       | Type             | Description                                           |
| ------------ | ---------------- | ----------------------------------------------------- |
| id           | UUID (PK)        | Auto-generated                                        |
| user_id      | UUID (FK → auth) | Owner (NULL for knowledge-base entries)               |
| namespace    | VARCHAR(50)      | Logical grouping (see below)                          |
| source_type  | VARCHAR(30)      | 'meal', 'comment', 'measurement', 'usda_food', etc.  |
| source_id    | UUID             | ID of the source record                               |
| content_text | TEXT             | Serialized text representation of the source          |
| embedding    | VECTOR(2048)     | voyage-4-large embedding vector                       |
| metadata     | JSONB            | Additional filterable metadata                        |
| created_at   | TIMESTAMPTZ      | Insertion timestamp                                   |

**Namespaces:**

| Namespace              | Scope    | Populated by                                      |
| ---------------------- | -------- | ------------------------------------------------- |
| `user_meals`           | Per-user | DB trigger on `meals` INSERT → `embed` Edge Fn    |
| `user_comments`        | Per-user | DB trigger on `meal_comments` INSERT → `embed`    |
| `user_measurements`    | Per-user | DB trigger on `measurements` INSERT → `embed`     |
| `usda_foods`           | Global   | Batch seed script                                 |
| `nutrition_guidelines` | Global   | Batch seed script                                 |
| `recipes`              | Global   | Batch seed script                                 |

**Similarity search** is performed via the `match_embeddings` Postgres function, which filters by user_id and namespace, then orders by cosine distance using the HNSW index.

### 9.3 Caching Strategy (no Redis)

Redis has been eliminated. The previous Redis responsibilities are handled as follows:

| Previous Redis Use               | Replacement                                              |
| -------------------------------- | -------------------------------------------------------- |
| Session tokens                   | Supabase Auth (manages JWT + refresh tokens internally)  |
| Rate limiting                    | Supabase platform rate limits + Edge Function logic      |
| Dashboard cache                  | TanStack Query `staleTime` (5min) on client              |
| Pre-signed image URLs            | Supabase Storage signed URLs (generated on demand)       |
| Async job queue (BullMQ)         | DB triggers → Edge Functions (pg_net HTTP POST)          |
| Streak count                     | Computed from `meals` table query (no materialized cache)|

---

## 10. AI/ML Pipeline

### 10.1 Meal Scanning Pipeline (Vision)

```
┌────────────────────────────────────────────────────────────────┐
│                    MOBILE DEVICE                               │
│                                                                │
│  1. Camera capture → react-native-vision-camera               │
│  2. Compress: ≤500KB, min 1080px, JPEG quality 85%            │
│  3. Base64 encode                                              │
│  4. POST /api/v1/meals/scan { image_base64, metadata }        │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    AI SERVICE                                  │
│                                                                │
│  5. Validate image (format, size, corruption check)            │
│                                                                │
│  6. Primary Vision Model (GPT-5.4 Vision):                     │
│     System Prompt:                                             │
│     ┌──────────────────────────────────────────────────────┐   │
│     │ You are a professional nutritionist analyzing a meal  │   │
│     │ photograph. For each visible food item:               │   │
│     │ - Identify the ingredient name                        │   │
│     │ - Estimate portion size in grams (use plate/utensils  │   │
│     │   as reference: standard dinner plate = 27cm)         │   │
│     │ - Estimate caloric density per 100g                   │   │
│     │ - Calculate total calories for the estimated portion  │   │
│     │ - Provide macronutrient breakdown (protein, carbs,    │   │
│     │   fat, fiber, sugar, sodium)                          │   │
│     │ - Assign confidence score [0.0-1.0] for each item     │   │
│     │ - Flag hidden calories (oils, sauces, dressings)      │   │
│     │ - Classify NOVA level (1-4)                           │   │
│     │                                                       │   │
│     │ Return ONLY valid JSON matching the provided schema.  │   │
│     │ If uncertain about a component, set confidence < 0.7  │   │
│     │ and provide clarification_question field.             │   │
│     └──────────────────────────────────────────────────────┘   │
│                                                                │
│  7. Parse response with Pydantic strict validation:            │
│     class MealAnalysis(BaseModel):                             │
│       ingredients: list[IngredientAnalysis]                    │
│       total_calories: float                                    │
│       total_macros: MacroBreakdown                             │
│       overall_confidence: float                                │
│       nova_classification: int                                 │
│       clarification_needed: bool                               │
│       clarification_questions: list[ClarificationQ] | None     │
│                                                                │
│  8. Cross-reference ingredients with USDA FoodData Central:    │
│     - Fuzzy match ingredient names to USDA entries             │
│     - Validate caloric estimates within ±30% of USDA values   │
│     - If deviation > 30%: flag for review, use USDA as anchor │
│                                                                │
│  9. If overall_confidence < 0.7 OR any clarification needed:   │
│     → Return partial result with clarification questions       │
│     → Client shows interactive clarification UI                │
│     → User responds → re-run step 6 with user context added   │
│                                                                │
│  10. Fallback: If GPT-5.4 fails/timeout (>10s):               │
│      → Retry with Gemini 3.1 Pro (same prompt, adapted format)│
│      → If both fail: retry with Claude Sonnet 4.6             │
│      → If both fail: return graceful error, offer manual entry │
│                                                                │
│  11. Enqueue embedding generation job (async)                  │
└────────────────────────────────────────────────────────────────┘
```

### 10.2 RAG Chat Pipeline

**Query Processing Flow:**

1. **Intent Classification:** Lightweight classifier determines query type:
   - `nutrition_qa` — General nutrition questions
   - `meal_suggestion` — Recipe/meal recommendations
   - `plan_creation` — Diet plan generation request
   - `data_lookup` — Questions about user's own data
   - `health_insight` — Analysis requests about trends/patterns

2. **Context Retrieval Strategy (per intent):**

| Intent            | Retrieved Sources                                                  | Max Chunks | Priority              |
| ----------------- | ------------------------------------------------------------------ | ---------- | --------------------- |
| `nutrition_qa`    | nutrition_guidelines, usda_foods                                   | 5          | Accuracy over speed   |
| `meal_suggestion` | user_meals (recent), user_comments, recipes, user_profile          | 8          | Preference matching   |
| `plan_creation`   | user_profile, user_meals (30d), measurements, nutrition_guidelines | 10         | Comprehensive context |
| `data_lookup`     | user_meals, user_measurements, user_comments                       | 6          | Temporal relevance    |
| `health_insight`  | user_meals (90d), measurements (90d), nutrition_guidelines         | 8          | Trend analysis        |

3. **Prompt Assembly:**

```
[System Prompt]
You are Snacky, a warm, knowledgeable, and empathetic AI nutrition
assistant. You have the personality profile: {ai_persona_config}.

RULES:
- Always ground responses in the user's actual data (provided below)
- Never diagnose medical conditions or prescribe medication
- Cite specific meals/dates when referencing user history
- If asked about topics outside nutrition/health, politely redirect
- Express uncertainty when data is insufficient
- Use the user's preferred language: {locale}

USER PROFILE:
{serialized_profile}

RETRIEVED CONTEXT:
{retrieved_documents}

CONVERSATION HISTORY (last 10 messages):
{chat_history}
```

4. **Response Streaming:** Server-Sent Events (SSE) for real-time token-by-token delivery to client

5. **Post-Processing:**
   - Validate any nutritional claims against USDA data
   - Inject rich content cards (recipe cards, nutrient badges) as JSON in stream
   - Log token usage for cost tracking

### 10.3 Diet Plan Generation Pipeline

```
User Request
    │
    ▼
┌──────────────────┐
│ Parameter         │  ← Profile data + user overrides
│ Assembly         │     Duration, meals/day, restrictions, budget
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ MILP Solver      │  ← PuLP + CBC
│ (Phase 1)        │
│                  │  Inputs:
│                  │  - Candidate food items from USDA + recipes DB
│                  │  - Target kcal/macros/micros per meal slot
│                  │  - Hard constraints (allergies, restrictions)
│                  │  - Soft constraints (variety, cost, prep time)
│                  │
│                  │  Output:
│                  │  - Nutrient matrix: Day × MealSlot × {foods, grams}
│                  │  - Objective value (deviation from targets)
│                  │  - Solver stats (time, iterations)
└────────┬─────────┘
         │ Optimal nutrient matrix
         ▼
┌──────────────────┐
│ LLM Recipe       │  ← GPT-5.4 via RAG
│ Generator        │
│ (Phase 2)        │  For each meal slot:
│                  │  - Input: ingredient list + gram amounts
│                  │  - User's cuisine preferences (from profile)
│                  │  - User's cooking skill level
│                  │  - Taste profile (from comment embeddings)
│                  │
│                  │  Output:
│                  │  - Recipe name, instructions, prep time
│                  │  - Presentation/plating suggestion
└────────┬─────────┘
         │ Complete meal plan
         ▼
┌──────────────────┐
│ Validation &     │  ← Final checks
│ Assembly         │
│                  │  - Verify no allergen leakage
│                  │  - Re-calculate exact nutrition from recipes
│                  │  - Generate shopping list aggregation
│                  │  - Store plan in PostgreSQL
└──────────────────┘
```

### 10.4 Model Cost Management

| Model               | Use Case                               | Estimated Cost / Request | Monthly Budget (100K MAU) |
| ------------------- | -------------------------------------- | ------------------------ | ------------------------- |
| GPT-5.4 Vision      | Meal scan (primary)                    | ~$0.02–0.06              | $15K–30K                  |
| Gemini 3.1 Pro      | Meal scan (fallback)                   | ~$0.01–0.04              | $2K (10% fallback rate)   |
| Claude Sonnet 4.6   | Meal scan (tertiary fallback)          | ~$0.01–0.03              | $500 (2% tertiary rate)   |
| GPT-5.4             | Chat responses (complex)               | ~$0.01–0.04              | $10K–20K                  |
| GPT-5.4 mini        | Chat responses (simple, intent-routed) | ~$0.002–0.01             | $2K                       |
| voyage-4-large      | Embedding generation                   | ~$0.00012/1K tokens      | $600                      |
| **Total estimated** |                                        |                          | **$30K–55K/mo**           |

**Cost optimization strategies:**

- Cache identical/near-identical meal scans (perceptual hash matching)
- Batch embedding generation (process every 5 minutes, not per-event)
- Use smaller models (GPT-5.4 mini / Gemini 3.1 Flash-Lite) for simple chat queries (intent-routed)
- Leverage voyage-4 shared embedding space: embed documents with voyage-4-large, run queries with voyage-4-lite (asymmetric retrieval — same accuracy, ~60% lower query cost)
- Implement user-level monthly scan quotas (free tier: 30 scans/month)
- GPT-5.4's improved token efficiency solves tasks with fewer tokens than previous generations, reducing per-request cost

---

## 11. Authentication & Authorization

### 11.1 Authentication Flow (Supabase Auth)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Mobile   │     │   Google     │     │  Supabase    │     │ Postgres │
│  App      │     │   Identity   │     │  Auth        │     │          │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └────┬─────┘
     │                  │                    │                   │
     │  1. initiate     │                    │                   │
     │  Google Sign-In  │                    │                   │
     │─────────────────▶│                    │                   │
     │                  │                    │                   │
     │  2. OAuth 2.0    │                    │                   │
     │  PKCE flow       │                    │                   │
     │◀────────────────▶│                    │                   │
     │                  │                    │                   │
     │  3. id_token     │                    │                   │
     │◀─────────────────│                    │                   │
     │                  │                    │                   │
     │  4. supabase.auth.signInWithIdToken() │                   │
     │  { provider:'google', token }         │                   │
     │──────────────────────────────────────▶│                   │
     │                  │                    │                   │
     │                  │    5. Verify token  │                   │
     │                  │◀───────────────────│                   │
     │                  │───────────────────▶│                   │
     │                  │                    │                   │
     │                  │                    │  6. Upsert user   │
     │                  │                    │  in auth.users    │
     │                  │                    │──────────────────▶│
     │                  │                    │  7. Trigger:       │
     │                  │                    │  create profile   │
     │                  │                    │◀──────────────────│
     │                  │                    │                   │
     │  8. { session: { access_token,        │                   │
     │       refresh_token, user } }         │                   │
     │◀──────────────────────────────────────│                   │
     │                  │                    │                   │
     │  9. Session auto-│                    │                   │
     │  persisted in    │                    │                   │
     │  AsyncStorage    │                    │                   │
```

Supabase Auth handles all token management internally: JWT issuance, refresh token rotation, session persistence, and token validation for PostgREST/Edge Function requests.

### 11.2 Token Strategy

| Token         | Type          | Expiry     | Storage                                           | Refresh                            |
| ------------- | ------------- | ---------- | ------------------------------------------------- | ---------------------------------- |
| Access Token  | JWT (HS256)   | 1 hour     | @supabase/supabase-js (AsyncStorage, auto-managed) | Auto-refresh by Supabase client    |
| Refresh Token | Opaque        | 30 days    | @supabase/supabase-js (AsyncStorage, auto-managed) | Rotation on use; managed by Supabase|

### 11.3 Authorization Model (Row Level Security)

| Resource      | Owner Access    | Other Users | Enforcement                              |
| ------------- | --------------- | ----------- | ---------------------------------------- |
| User profile  | Full CRUD       | None        | RLS: `auth.uid() = user_id`              |
| Meals         | Full CRUD       | None        | RLS: `auth.uid() = user_id`              |
| Diet plans    | Full CRUD       | None        | RLS: `auth.uid() = user_id`              |
| Measurements  | Full CRUD       | None        | RLS: `auth.uid() = user_id`              |
| Chat history  | Read + Create   | None        | RLS: session owner via join              |
| Meal comments | Full CRUD (own) | None        | RLS: `auth.uid() = user_id`              |
| Meal photos   | Upload + View   | None        | Storage RLS: folder = `auth.uid()`       |
| Embeddings    | Read (own)      | None        | RLS: `auth.uid() = user_id`; service writes |

All authorization enforced at the PostgreSQL level via RLS policies. No application-level middleware required. Edge Functions use the service role key for operations that bypass RLS (embedding insertion, notification dispatch).

---

## 12. API Design

### 12.1 API Conventions

| Convention   | Standard                                             |
| ------------ | ---------------------------------------------------- |
| Protocol     | HTTPS only (HSTS enforced)                           |
| Format       | JSON (Content-Type: application/json)                |
| Versioning   | URI path (/api/v1/...)                               |
| Naming       | snake_case for all JSON fields                       |
| Pagination   | Cursor-based (keyset): `?cursor={id}&limit={n}`      |
| Filtering    | Query parameters: `?meal_type=lunch&from=2026-03-01` |
| Sorting      | `?sort=-logged_at` (prefix `-` for descending)       |
| Error format | RFC 7807 Problem Details                             |
| Date format  | ISO 8601 with timezone (YYYY-MM-DDTHH:mm:ssZ)        |
| Auth header  | `Authorization: Bearer {access_token}`               |

### 12.2 Error Response Format (RFC 7807)

```json
{
  "type": "https://api.snacky.app/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The field 'weight_kg' must be between 20 and 500.",
  "instance": "/api/v1/measurements",
  "errors": [
    {
      "field": "weight_kg",
      "message": "Must be between 20 and 500",
      "code": "out_of_range"
    }
  ]
}
```

### 12.3 Endpoint Catalog

#### Authentication

| Method | Path                   | Description                             | Rate Limit |
| ------ | ---------------------- | --------------------------------------- | ---------- |
| POST   | `/api/v1/auth/google`  | Exchange Google ID token for app tokens | 10/min     |
| POST   | `/api/v1/auth/refresh` | Refresh access token                    | 30/min     |
| POST   | `/api/v1/auth/logout`  | Revoke refresh token                    | 10/min     |

#### User Profile

| Method | Path                          | Description                        | Rate Limit |
| ------ | ----------------------------- | ---------------------------------- | ---------- |
| GET    | `/api/v1/users/me`            | Get current user profile           | 60/min     |
| PATCH  | `/api/v1/users/me/profile`    | Update profile fields              | 30/min     |
| POST   | `/api/v1/users/me/onboarding` | Submit onboarding questionnaire    | 5/min      |
| DELETE | `/api/v1/users/me`            | Delete account and all data (GDPR) | 1/hour     |

#### Meals

| Method | Path                                   | Description                         | Rate Limit |
| ------ | -------------------------------------- | ----------------------------------- | ---------- |
| POST   | `/api/v1/meals/scan`                   | Submit meal photo for AI analysis   | 10/min     |
| POST   | `/api/v1/meals/scan/{scan_id}/clarify` | Submit clarification answers        | 20/min     |
| POST   | `/api/v1/meals`                        | Log a meal (from scan or manual)    | 30/min     |
| GET    | `/api/v1/meals`                        | List meals (paginated, filterable)  | 60/min     |
| GET    | `/api/v1/meals/{id}`                   | Get meal detail                     | 60/min     |
| PATCH  | `/api/v1/meals/{id}`                   | Update meal (portions, ingredients) | 30/min     |
| DELETE | `/api/v1/meals/{id}`                   | Delete a meal                       | 10/min     |
| POST   | `/api/v1/meals/{id}/comments`          | Add comment to meal                 | 30/min     |
| GET    | `/api/v1/meals/{id}/comments`          | Get meal comments                   | 60/min     |
| GET    | `/api/v1/meals/{id}/image`             | Get pre-signed image URL            | 60/min     |

#### Measurements

| Method | Path                        | Description                   | Rate Limit |
| ------ | --------------------------- | ----------------------------- | ---------- |
| POST   | `/api/v1/measurements`      | Log a measurement             | 30/min     |
| GET    | `/api/v1/measurements`      | List measurements (paginated) | 60/min     |
| DELETE | `/api/v1/measurements/{id}` | Delete a measurement          | 10/min     |

#### Diet Plans

| Method | Path                                    | Description                    | Rate Limit |
| ------ | --------------------------------------- | ------------------------------ | ---------- |
| POST   | `/api/v1/diet-plans`                    | Generate new diet plan         | 3/hour     |
| GET    | `/api/v1/diet-plans`                    | List user's diet plans         | 60/min     |
| GET    | `/api/v1/diet-plans/{id}`               | Get plan detail with all meals | 60/min     |
| PATCH  | `/api/v1/diet-plans/{id}`               | Update plan status             | 10/min     |
| POST   | `/api/v1/diet-plans/{id}/swap`          | Swap a meal in the plan        | 10/min     |
| GET    | `/api/v1/diet-plans/{id}/shopping-list` | Get aggregated shopping list   | 30/min     |

#### Chat

| Method | Path                                  | Description                           | Rate Limit |
| ------ | ------------------------------------- | ------------------------------------- | ---------- |
| POST   | `/api/v1/chat/sessions`               | Create new chat session               | 10/min     |
| GET    | `/api/v1/chat/sessions`               | List chat sessions                    | 30/min     |
| GET    | `/api/v1/chat/sessions/{id}/messages` | Get messages (paginated)              | 60/min     |
| POST   | `/api/v1/chat/sessions/{id}/messages` | Send message (SSE streaming response) | 20/min     |

#### Analytics & Reports

| Method | Path                                                 | Description                 | Rate Limit |
| ------ | ---------------------------------------------------- | --------------------------- | ---------- |
| GET    | `/api/v1/analytics/daily-summary?date=YYYY-MM-DD`    | Daily calorie/macro summary | 60/min     |
| GET    | `/api/v1/analytics/weekly-report?week=YYYY-Wnn`      | Weekly nutrition report     | 30/min     |
| GET    | `/api/v1/analytics/trends?metric={metric}&from=&to=` | Trend data for charts       | 30/min     |
| GET    | `/api/v1/analytics/dqi-score?from=&to=`              | DQI-I score history         | 30/min     |

#### Health Integrations

| Method | Path                                 | Description                       | Rate Limit |
| ------ | ------------------------------------ | --------------------------------- | ---------- |
| POST   | `/api/v1/integrations/health/sync`   | Sync health data from device      | 10/min     |
| GET    | `/api/v1/integrations/health/status` | Get integration connection status | 30/min     |

---

## 13. UI/UX Design System

### 13.1 Design Philosophy

- **Bento UI Grid Layout:** Dashboard as isolated, rounded tiles of varying sizes creating clean visual hierarchy
- **Glassmorphism accents:** Frosted-glass effect cards for overlay elements (scan results, quick stats)
- **Bold typography:** Large, confident headings with generous line spacing
- **Purposeful whitespace:** Minimum 16dp between bento tiles; maximum information density without overwhelm
- **Micro-interactions:** Every user action receives immediate, delightful feedback animation

### 13.2 Design Token System

```typescript
const tokens = {
  colors: {
    // Primary
    primary: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#66BB6A',
      500: '#4CAF50', // Primary brand green
      600: '#43A047',
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20',
    },
    // Semantic
    semantic: {
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
      protein: '#5C6BC0', // Indigo for protein indicators
      carbs: '#FFA726', // Amber for carb indicators
      fat: '#EF5350', // Red for fat indicators
      fiber: '#66BB6A', // Green for fiber
    },
    // Surfaces
    surface: {
      background: '#FAFAFA',
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0,0,0,0.5)',
    },
    // Dark mode surfaces
    surfaceDark: {
      background: '#121212',
      card: '#1E1E1E',
      elevated: '#2C2C2C',
      overlay: 'rgba(0,0,0,0.7)',
    },
    // Text
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
      inverse: '#FFFFFF',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    displayLarge: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: 0 },
    displayMedium: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0 },
    headlineLarge: { fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: 0 },
    headlineMedium: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: 0.15 },
    titleLarge: { fontSize: 18, lineHeight: 24, fontWeight: '500', letterSpacing: 0 },
    titleMedium: { fontSize: 16, lineHeight: 22, fontWeight: '500', letterSpacing: 0.15 },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.25 },
    labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  },
  elevation: {
    none: { shadowOpacity: 0 },
    low: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, shadowOpacity: 0.12 },
    medium: { shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, shadowOpacity: 0.16 },
    high: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.2 },
  },
};
```

### 13.3 Key Screen Layouts

#### Dashboard (Bento Grid)

```
┌─────────────────────────────────────────┐
│  Header: "Good morning, Anna" + Avatar  │
├─────────────────────┬───────────────────┤
│                     │   PROTEIN         │
│   CALORIE BUDGET    │   ██████░░ 72%    │
│   ┌──────────┐      │                   │
│   │  1,450   │      ├───────────────────┤
│   │  /2,100  │      │   CARBS           │
│   │  kcal    │      │   ████░░░░ 55%    │
│   │  ○ ring  │      │                   │
│   └──────────┘      ├───────────────────┤
│                     │   FAT             │
│                     │   █████░░░ 68%    │
├─────────────────────┴───────────────────┤
│  RECENT MEALS  [See all →]              │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 🥗     │ │ 🍝     │ │ 🥪     │      │
│  │ Lunch  │ │ Dinner │ │ Snack  │      │
│  │ 520cal │ │ 680cal │ │ 250cal │      │
│  └────────┘ └────────┘ └────────┘      │
├────────────────────┬────────────────────┤
│  💬 AI CHAT        │  📊 DQI SCORE     │
│  "Ask me about     │  ┌──────────┐     │
│   your diet..."    │  │   78/100  │     │
│                    │  │   ↑ +3    │     │
│  [Open chat →]     │  └──────────┘     │
├────────────────────┴────────────────────┤
│  📈 WEIGHT TREND (7d sparkline)        │
│  ──────────╲────────── 82.3 kg         │
└─────────────────────────────────────────┘
```

### 13.4 Animation Specifications

| Animation                              | Library                         | Duration                     | Easing             | Trigger                       |
| -------------------------------------- | ------------------------------- | ---------------------------- | ------------------ | ----------------------------- |
| Skeleton loader (scan in progress)     | Reanimated 4                    | Loop (1.5s cycle)            | ease-in-out        | API call pending              |
| Staggered ingredient reveal            | Reanimated 4                    | 300ms per item, 80ms stagger | spring(damping:15) | Scan results received         |
| Macro progress bar fill                | Reanimated 4                    | 800ms                        | ease-out           | Dashboard mount / data update |
| Calorie ring animation                 | Reanimated 4 (SVG)              | 1200ms                       | spring(damping:12) | Dashboard mount / meal logged |
| Shared element transition (meal photo) | React Navigation Shared Element | 350ms                        | ease-in-out        | Navigate to meal detail       |
| Tab switch                             | Reanimated 4                    | 200ms                        | ease-out           | Tab press                     |
| Chat message appear                    | Reanimated 4                    | 250ms                        | spring             | New message received          |
| Pull-to-refresh                        | Native                          | System default               | System             | Pull gesture                  |
| Goal achievement celebration           | Lottie                          | 2000ms                       | —                  | Daily goal met                |
| Card press feedback                    | Reanimated 4                    | 100ms scale(0.97)            | ease-out           | Touch start                   |

---

## 14. External Integrations

### 14.1 Apple HealthKit (iOS)

**Requested Data Types (Read-Only):**

| HKQuantityType       | Usage                                 | Sync Frequency                                   |
| -------------------- | ------------------------------------- | ------------------------------------------------ |
| `bodyMass`           | Weight tracking, TDEE adjustment      | On app foreground + background (HKObserverQuery) |
| `activeEnergyBurned` | Caloric expenditure calculation       | Every 15 minutes (background)                    |
| `stepCount`          | Activity level assessment             | Every 15 minutes (background)                    |
| `heartRate`          | Resting heart rate for BMR refinement | Daily aggregation                                |
| `sleepAnalysis`      | Sleep quality correlation with diet   | Daily aggregation                                |

**Implementation via `@kingstinct/react-native-healthkit`:**

```typescript
import { HKQuantityTypeIdentifier, HKCategoryTypeIdentifier } from '@kingstinct/react-native-healthkit';

const permissions = {
  read: [
    HKQuantityTypeIdentifier.bodyMass,
    HKQuantityTypeIdentifier.activeEnergyBurned,
    HKQuantityTypeIdentifier.stepCount,
    HKQuantityTypeIdentifier.heartRate,
    HKCategoryTypeIdentifier.sleepAnalysis,
  ],
  write: [], // Read-only — no write permissions requested
};
```

**Data Flow:**

1. Request permissions with clear user-facing explanation per data type
2. Set up `HKObserverQuery` for weight changes (background delivery)
3. Periodic anchored queries for activity/sleep data
4. Normalize units (kg, kcal, UTC timestamps)
5. Deduplicate by sample UUID
6. Batch sync to backend every 15 minutes (or on app foreground)

### 14.2 Google Health Connect (Android)

**Requested Record Types (Read-Only):**

| Record Type                  | Usage                            | Sync Frequency                      |
| ---------------------------- | -------------------------------- | ----------------------------------- |
| `WeightRecord`               | Weight tracking, TDEE adjustment | On app foreground + periodic worker |
| `ActiveCaloriesBurnedRecord` | Caloric expenditure              | Every 15 minutes (WorkManager)      |
| `StepsRecord`                | Activity level                   | Every 15 minutes (WorkManager)      |
| `HeartRateRecord`            | BMR refinement                   | Daily                               |
| `SleepSessionRecord`         | Sleep correlation                | Daily                               |

**Implementation via `react-native-health-connect`:**

- Permission grant via Health Connect app
- WorkManager-based background sync
- Same normalization pipeline as HealthKit path

### 14.3 USDA FoodData Central API

**Integration Pattern:**

- Bulk download of SR Legacy + Foundation datasets (~300K entries) on backend initialization
- Store in PostgreSQL `usda_foods` table with full-text search index
- Generate embeddings for vector search (ingredient name + description + food group)
- Daily delta sync for newly added/modified entries
- Real-time API fallback for cache misses

### 14.4 Push Notification Services

| Platform | Service                                        | Token Management                                                              |
| -------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Android  | Firebase Cloud Messaging (FCM)                 | Token stored per device in `user_devices` table; refreshed on each app launch |
| iOS      | Apple Push Notification service (APNs via FCM) | Same token management; FCM abstracts APNs                                     |

---

## 15. Performance & Scalability

### 15.1 Performance Budgets

| Metric              | Target                           | Measurement                                              |
| ------------------- | -------------------------------- | -------------------------------------------------------- |
| App cold start      | ≤ 2.0s (P95)                     | Time to interactive on mid-range Android device          |
| App warm start      | ≤ 0.5s (P95)                     | Time to interactive from background                      |
| Dashboard render    | ≤ 500ms (P95)                    | First contentful paint after navigation                  |
| Meal scan E2E       | ≤ 5s (P95), ≤ 8s (P99)           | Tap shutter → results displayed                          |
| Chat first token    | ≤ 1.5s (P95)                     | Message sent → first SSE token received                  |
| API response (CRUD) | ≤ 200ms (P95)                    | Server processing time                                   |
| Frame rate          | ≥ 58 FPS                         | During scroll and animations (measured via Perf Monitor) |
| App binary size     | ≤ 50 MB (iOS), ≤ 40 MB (Android) | After initial install                                    |
| Memory usage        | ≤ 250 MB peak                    | During meal scan + dashboard rendering                   |

### 15.2 Scalability Strategy

| Component             | Scaling Strategy               | Trigger                                       |
| --------------------- | ------------------------------ | --------------------------------------------- |
| Edge Functions        | Auto-scaling (Supabase managed) | Request queue depth > 100                      |
| AI Service (FastAPI)  | Horizontal + GPU scaling        | Queue depth > 50 or response latency P95 > 4s |
| Meal Planning Service | Horizontal                      | Queue depth > 10 (MILP is CPU-intensive)       |
| PostgreSQL            | Supabase managed + Read replicas| Read latency P95 > 100ms                       |
| Redis (Upstash)       | Serverless auto-scaling         | Memory > 75% or connections > 80% max          |
| pgvector              | Scales with Postgres instance   | Query latency P95 > 200ms                      |
| Supabase Storage      | Infinite (managed)              | N/A                                            |
| Supabase CDN          | Auto (managed)                  | N/A                                            |

### 15.3 Caching Strategy

| Cache Layer         | Technology            | TTL                               | Invalidation                                |
| ------------------- | --------------------- | --------------------------------- | ------------------------------------------- |
| HTTP response cache | Supabase CDN          | 60s (dynamic), 1y (static assets) | Cache-Control headers; versioned asset URLs |
| API response cache  | Redis (Upstash)       | 5min (dashboard), 1h (analytics)  | Event-driven invalidation on write          |
| Image CDN cache     | Supabase Storage CDN  | 30 days                           | Immutable URLs (content-addressed)          |
| Mobile query cache  | TanStack Query + MMKV | staleTime: 5min, gcTime: 24h      | Background refetch on focus                 |
| Embedding cache     | Vector DB native      | Permanent                         | Re-embedded on source update                |

---

## 16. Security & Data Privacy

### 16.1 Data Classification

| Data Class       | Examples                                        | Storage                              | Encryption                             | Retention                          |
| ---------------- | ----------------------------------------------- | ------------------------------------ | -------------------------------------- | ---------------------------------- |
| PII (Personal)   | Name, email, date of birth                      | PostgreSQL                           | AES-256 at rest, TLS 1.3 in transit    | Until account deletion + 30d grace |
| Health Data      | Weight, measurements, meal logs                 | PostgreSQL                           | AES-256 at rest, TLS 1.3 in transit    | Until account deletion + 30d grace |
| Sensitive Health | Psychobehavioral profile, eating disorder flags | PostgreSQL (JSONB)                   | AES-256 + application-level encryption | Until account deletion             |
| Media            | Meal photos                                     | Supabase Storage (private bucket)    | AES-256 at rest, TLS 1.3 in transit    | Until account deletion             |
| Analytics        | Aggregated, anonymized trends                   | BigQuery / analytics DB              | Standard encryption                    | 2 years                            |
| AI Processing    | Image data sent to vision models                | Transient (not stored by provider\*) | TLS 1.3 in transit                     | Not persisted after processing     |

\*Requires zero-data-retention API agreements with OpenAI/Google.

### 16.2 Security Controls

| Control               | Implementation                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| Authentication        | Google OAuth 2.0 (PKCE) + JWT (RS256, 15min expiry)                          |
| Token storage         | react-native-keychain with biometric protection                              |
| API security          | HTTPS-only, HSTS, certificate pinning on mobile                              |
| Input validation      | Zod schemas on client + Pydantic/Zod on server (double validation)           |
| SQL injection         | Parameterized queries via Drizzle ORM (no raw SQL)                           |
| XSS                   | React Native (no DOM); API returns JSON only                                 |
| Rate limiting         | Redis sliding window per user per endpoint                                   |
| DDoS protection       | CloudFlare WAF                                                               |
| Secrets management    | Supabase Vault + Edge Function secrets; no secrets in code or env vars at build |
| Dependency scanning   | Snyk / Dependabot automated PR reviews                                       |
| SAST                  | SonarQube in CI pipeline                                                     |
| Image upload security | File type validation (magic bytes), size limits, virus scan (ClamAV)         |
| Data export           | GDPR Article 20: `GET /api/v1/users/me/export` returns all user data as JSON |
| Data deletion         | GDPR Article 17: `DELETE /api/v1/users/me` cascading deletion + Storage cleanup |
| Audit logging         | All data mutations logged with actor, timestamp, IP, action                  |

### 16.3 Compliance

| Regulation              | Applicability | Compliance Measures                                                     |
| ----------------------- | ------------- | ----------------------------------------------------------------------- |
| GDPR                    | EU users      | Consent management, data portability, right to erasure, DPO appointment |
| RODO (Polish GDPR)      | Polish users  | Same as GDPR + UODO registration if applicable                          |
| Health data regulations | General       | Not a medical device; disclaimer on all AI outputs; no clinical claims  |

---

## 17. Observability & Monitoring

### 17.1 Three Pillars

#### Logging

- **Format:** Structured JSON (pino for Node.js, structlog for Python)
- **Fields:** `timestamp`, `level`, `service`, `trace_id`, `span_id`, `user_id` (hashed), `message`, `metadata`
- **Destination:** Supabase Dashboard Logs + Logflare (for search/dashboards)
- **Retention:** 30 days hot (Logflare), 1 year cold (Logflare BigQuery backend)
- **PII policy:** User IDs hashed in logs; no raw PII in log messages

#### Metrics

- **Collection:** OpenTelemetry SDK → Prometheus / Grafana Cloud
- **Key metrics:**

| Metric                             | Type      | Labels                             |
| ---------------------------------- | --------- | ---------------------------------- |
| `http_request_duration_seconds`    | Histogram | service, method, path, status_code |
| `meal_scan_duration_seconds`       | Histogram | model, status                      |
| `meal_scan_confidence`             | Histogram | model                              |
| `chat_response_duration_seconds`   | Histogram | intent, model                      |
| `chat_tokens_used`                 | Counter   | model, direction(input/output)     |
| `active_users`                     | Gauge     | platform(ios/android)              |
| `meals_logged`                     | Counter   | source(scan/manual/plan)           |
| `milp_solve_duration_seconds`      | Histogram | plan_duration_days                 |
| `embedding_generation_queue_depth` | Gauge     | —                                  |
| `external_api_errors`              | Counter   | provider, error_type               |

#### Tracing

- **Protocol:** OpenTelemetry (W3C Trace Context)
- **Spans:** Request → Gateway → Service → DB/Cache/External API
- **Sampling:** 100% for errors, 10% for successful requests (adjustable)
- **Backend:** Grafana Tempo

### 17.2 Alerting

| Alert                    | Condition                           | Severity | Channel           |
| ------------------------ | ----------------------------------- | -------- | ----------------- |
| API error rate           | 5xx rate > 1% for 5 min             | Critical | PagerDuty + Slack |
| Scan latency             | P95 > 8s for 10 min                 | High     | Slack             |
| Vision API failure       | Error rate > 5% for 5 min           | Critical | PagerDuty + Slack |
| Database connection pool | Utilization > 80%                   | High     | Slack             |
| Embedding queue backlog  | Depth > 1000 for 15 min             | Medium   | Slack             |
| Disk/memory utilization  | > 85%                               | High     | Slack             |
| Certificate expiry       | < 14 days                           | Medium   | Email + Slack     |
| Cost anomaly             | Daily spend > 150% of 7-day average | Medium   | Email + Slack     |

### 17.3 Dashboards

1. **Operations Dashboard:** Request rates, latencies, error rates, infrastructure health
2. **AI Dashboard:** Scan accuracy metrics, confidence distributions, model costs, fallback rates
3. **Product Dashboard:** DAU/MAU, meals scanned, chat messages, plan generation, retention cohorts
4. **Cost Dashboard:** Per-service cloud costs, AI API costs, cost per user

---

## 18. Testing Strategy

### 18.1 Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests  │  5% — Critical user journeys
                    │  (Detox/     │
                    │   Maestro)   │
                ┌───┴─────────────┴───┐
                │  Integration Tests   │  25% — API contracts, DB queries,
                │  (Supertest, pytest) │        AI pipeline integration
            ┌───┴─────────────────────┴───┐
            │       Unit Tests             │  70% — Business logic, utils,
            │  (Jest, Vitest, pytest)       │        data transformations
            └──────────────────────────────┘
```

### 18.2 Test Categories

| Category           | Tool                                 | Scope                                       | CI Gate        |
| ------------------ | ------------------------------------ | ------------------------------------------- | -------------- |
| Unit (Mobile)      | Jest + React Native Testing Library  | Components, hooks, utils, store logic       | ✅ PR merge    |
| Unit (Core API)    | Vitest                               | Route handlers, middleware, business logic  | ✅ PR merge    |
| Unit (AI Service)  | pytest                               | Prompt templates, parsers, validators       | ✅ PR merge    |
| Integration (API)  | Supertest + Testcontainers           | Full request lifecycle with real DB/Redis   | ✅ PR merge    |
| Integration (AI)   | pytest + VCR.py (recorded cassettes) | Vision pipeline with recorded API responses | ✅ PR merge    |
| Component (Mobile) | Storybook + Chromatic                | Visual regression testing                   | ✅ PR merge    |
| E2E (Mobile)       | Detox (iOS + Android)                | Full user journeys (onboarding, scan, chat) | ✅ Pre-release |
| Performance (API)  | k6                                   | Load testing (P95/P99 latency under load)   | ✅ Pre-release |
| Security           | Snyk + OWASP ZAP                     | Dependency vulnerabilities, API security    | ✅ PR merge    |

### 18.3 AI-Specific Testing

| Test Type               | Approach                                                                                    | Frequency                     |
| ----------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- |
| Prompt regression       | Golden dataset of 100 meal images with expected outputs; assert key fields within tolerance | Every AI service deploy       |
| Hallucination detection | Validate all nutritional claims against USDA reference data; flag deviations > 50%          | Every AI service deploy       |
| RAG retrieval quality   | Validate retrieved document relevance for 50 curated queries (precision@5 ≥ 0.8)            | Weekly automated              |
| MILP solver correctness | Verify generated plans satisfy all hard constraints (allergies, calorie targets)            | Every planning service deploy |
| Bias testing            | Test meal recognition accuracy across diverse cuisines (≥ 10 cuisine categories)            | Monthly                       |

---

## 19. CI/CD & DevOps

### 19.1 Repository Structure (Monorepo)

```
snacky/
├── apps/
│   └── mobile/               # React Native app (@supabase/supabase-js)
├── supabase/
│   ├── config.toml            # Supabase local dev configuration
│   ├── migrations/            # SQL migrations (schema + RLS + triggers)
│   ├── functions/             # Edge Functions (Deno/TypeScript)
│   │   ├── _shared/           # Shared utilities (CORS, Supabase client)
│   │   ├── meal-scan/         # Vision pipeline (GPT-5.4 → Gemini → Claude)
│   │   ├── chat/              # RAG chat with SSE streaming
│   │   ├── embed/             # Embedding generation (webhook-triggered)
│   │   ├── generate-plan/     # MILP solver + recipe generation
│   │   └── send-notification/ # FCM push notification dispatch
│   └── seed.sql               # Development seed data
├── packages/
│   ├── shared-types/          # Shared TypeScript types + Zod schemas
│   ├── api-client/            # Thin wrapper around @supabase/supabase-js
│   └── eslint-config/         # Shared lint rules
├── docs/
│   ├── api/                   # API documentation
│   ├── architecture/          # ADRs (Architecture Decision Records)
│   └── runbooks/              # Operational runbooks
├── scripts/
│   ├── seed-usda.ts           # USDA data seeder
│   └── generate-embeddings.ts # Batch embedding generator
├── .github/
│   └── workflows/             # CI/CD pipeline definitions
├── turbo.json                 # Turborepo configuration
├── package.json
└── pnpm-workspace.yaml
```

### 19.2 CI Pipeline (GitHub Actions)

```
PR opened / updated
    │
    ├── [Parallel]
    │   ├── Lint (ESLint + Prettier)
    │   ├── Type check (tsc --noEmit)
    │   ├── Unit tests (Vitest)
    │   ├── Security scan (Snyk)
    │   └── Build check (mobile)
    │
    ├── [Sequential, after parallel passes]
    │   ├── supabase db push --dry-run (validate migrations)
    │   └── Integration tests (supabase start + test)
    │
    └── ✅ All green → Mergeable

Merge to main
    │
    ├── supabase db push (apply migrations to staging)
    ├── supabase functions deploy --all (deploy Edge Functions)
    ├── Run E2E tests against staging
    │
    └── ✅ All green → Manual approval gate → Deploy to Production
         ├── supabase link --project-ref <prod-ref>
         ├── supabase db push
         └── supabase functions deploy --all
```

### 19.3 Mobile Release Pipeline

The Android release pipeline is designed around **early, continuous device testing** via Google Play Console's Closed Testing (Alpha) track. Alpha distribution starts in Phase 0 — the moment the app shell compiles — so that every meaningful commit can be validated on real hardware by the developer and invited testers.

#### 19.3.1 Google Play Console — Track Strategy

| Track                      | Purpose                                                               | Access                                                                   | When Active                   |
| -------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| **Internal Testing**       | Immediate smoke tests (max 100 testers, no review)                    | Developer only                                                           | From Week 1 (Phase 0)         |
| **Closed Testing — Alpha** | Real-device validation with invited testers; feedback via Google Play | Developer + invited testers (up to 2,000 via email list or Google Group) | From Week 2 (Phase 0) onwards |
| **Open Testing — Beta**    | Wider audience testing before production launch                       | Public opt-in link                                                       | Phase 4 (pre-launch)          |
| **Production**             | Live release                                                          | All users                                                                | Post Phase 4                  |

#### 19.3.2 Alpha Setup (One-Time, Phase 0 Week 1–2)

```
Prerequisites:
  ✅ Google Play Console account (already available)

Setup steps:
  1. Create app listing in Google Play Console
     - App name: "Snacky"
     - Default language: English (United States)
     - Add translation: Polish (Poland)
     - App category: Health & Fitness
     - Content rating questionnaire: complete
     - Placeholder store listing (icon, screenshots, description)
       → Minimal but compliant; required even for Alpha track

  2. Configure app signing
     - Enroll in Google Play App Signing (mandatory)
     - Generate upload key locally → store securely in GitHub Secrets
     - Upload key fingerprint registered in Google Play Console

  3. Create Closed Testing track (Alpha)
     - Navigate: Release → Testing → Closed testing → Create track
     - Track name: "Alpha Testers"
     - Create tester email list (or Google Group)
     - Add initial testers by email address
     - Note: testers must accept invite link to access the track

  4. Configure EAS Build for Android
     - eas.json profile: "alpha" → builds release-signed AAB
     - Build triggers: manual dispatch + automatic on merge to main
     - Artifacts: .aab (Android App Bundle) uploaded to Alpha track

  5. Configure automated upload (CI)
     - GitHub Actions workflow uses google-play publisher action
     - Service account JSON key stored in GitHub Secrets
     - Auto-uploads to Alpha track on every merge to main
```

#### 19.3.3 Continuous Alpha Build Flow (Automated, Every Merge to Main)

```
Merge to main (or manual trigger on any branch)
    │
    ├── [Android Alpha Pipeline]
    │   │
    │   ├── 1. Increment versionCode (auto, monotonic)
    │   ├── 2. EAS Build (Android, profile: alpha)
    │   │      → Produces release-signed .aab
    │   ├── 3. Upload .aab to Google Play Console
    │   │      → Track: Closed Testing (Alpha)
    │   │      → Release notes: auto-generated from commit messages
    │   ├── 4. Google Play processes bundle (usually 1–4 hours for review-free alpha)
    │   └── 5. Testers receive Play Store update notification
    │
    ├── [iOS Pipeline — for later phases]
    │   ├── EAS Build (iOS) → TestFlight
    │   └── TestFlight auto-distributes to invited testers
    │
    └── [Backend deploys to Staging — in parallel]
```

#### 19.3.4 Tester Experience (Alpha Track)

```
Tester onboarding:
  1. Receives email invite with opt-in link
  2. Accepts invitation → joins Alpha program
  3. Snacky appears in Google Play Store (only for accepted testers)
  4. Installs like any normal app
  5. Receives automatic updates as new Alpha builds are published

Feedback channels:
  - In-app: Shake-to-report (integrated bug reporter with screenshot + logs)
  - Google Play Console: built-in Alpha tester feedback form
  - External: shared Slack channel or GitHub Discussions for testers

Tester requirements:
  - Android device running Android 8.0+ (API 26+)
  - Google account added to the Alpha tester list
  - Accepted the Alpha program invitation link
```

#### 19.3.5 Production Release Pipeline (Phase 4+)

```
Tag vX.Y.Z on main
    │
    ├── Build iOS (EAS Build, profile: production) → TestFlight
    │   └── After QA → Submit to App Store Review
    │
    ├── Build Android (EAS Build, profile: production)
    │   └── Promote Alpha build to Open Testing (Beta)
    │       └── After Beta validation → Promote to Production
    │
    ├── QA validation window (48h, on both platforms)
    │
    └── Production release
        ├── iOS: App Store (phased rollout 1% → 5% → 20% → 100%)
        └── Android: Google Play (staged rollout 10% → 50% → 100%)
```

#### 19.3.6 EAS Build Configuration

```json
// eas.json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "alpha": {
      "distribution": "store",
      "channel": "alpha",
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "remote"
      },
      "env": {
        "APP_ENV": "staging",
        "API_BASE_URL": "https://staging.snacky.dev"
      },
      "autoIncrement": "versionCode"
    },
    "production": {
      "distribution": "store",
      "channel": "production",
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "remote"
      },
      "ios": {
        "autoIncrement": "buildNumber"
      },
      "env": {
        "APP_ENV": "production",
        "API_BASE_URL": "https://api.snacky.app"
      },
      "autoIncrement": "versionCode"
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "production",
        "releaseStatus": "draft"
      }
    },
    "alpha": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "alpha",
        "releaseStatus": "completed"
      }
    }
  }
}
```

#### 19.3.7 GitHub Actions — Android Alpha Workflow

```yaml
# .github/workflows/android-alpha.yml
name: Android Alpha Release

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      release_notes:
        description: 'Release notes for alpha testers'
        required: false
        default: 'Bug fixes and improvements'

jobs:
  build-and-deploy-alpha:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - uses: pnpm/action-setup@v4

      - run: pnpm install --frozen-lockfile

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android (Alpha)
        run: eas build --platform android --profile alpha --non-interactive
        working-directory: apps/mobile

      - name: Submit to Google Play (Alpha Track)
        run: eas submit --platform android --profile alpha --non-interactive
        working-directory: apps/mobile
        env:
          GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY }}

      - name: Post build notification
        uses: slackapi/slack-github-action@v2
        with:
          payload: |
            {
              "text": "🤖 New Alpha build uploaded to Google Play!\nCommit: ${{ github.sha }}\nNotes: ${{ github.event.inputs.release_notes || 'Auto-build from main' }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 19.4 Environment Strategy

| Environment | Purpose                                           | Data                         | URL Pattern               | Mobile Distribution                                |
| ----------- | ------------------------------------------------- | ---------------------------- | ------------------------- | -------------------------------------------------- |
| Local       | Development                                       | Seeded test data             | localhost:\*              | Development build (USB / Expo Dev Client)          |
| Preview     | Per-PR preview                                    | Seeded test data             | pr-{n}.preview.snacky.dev | — (backend only)                                   |
| Staging     | Pre-production validation; Alpha/Beta app backend | Anonymized production subset | staging.snacky.dev        | Android: Google Play Alpha track / iOS: TestFlight |
| Production  | Live users                                        | Real data                    | api.snacky.app            | Android: Google Play Production / iOS: App Store   |

---

## 20. Phased Delivery Roadmap

### Phase 0: Foundation (Weeks 1–4)

- Monorepo setup (Turborepo + pnpm)
- React Native project initialization (New Architecture enabled)
- Core API scaffolding (Fastify + Drizzle + PostgreSQL)
- CI/CD pipeline setup
- **Internationalization setup (i18n — Week 1, before any UI work):**
  - Initialize i18next with `pl` and `en` language files
  - Set up namespace-per-feature translation structure
  - Configure `expo-localization` for device locale detection
  - Add `eslint-plugin-i18next` to lint config (reject hardcoded strings in JSX)
  - Verify Polish diacritics render correctly on both platforms
  - All UI strings from this point forward go through `t()` — no exceptions
- **Android Alpha distribution setup (Week 1–2):**
  - Create app listing in Google Play Console (placeholder store listing)
  - Enroll in Google Play App Signing; generate and secure upload key
  - Create Closed Testing (Alpha) track with initial tester email list
  - Configure EAS Build `alpha` profile (release-signed AAB → Alpha track)
  - Set up GitHub Actions `android-alpha.yml` workflow (auto-upload on merge to main)
  - **First Alpha APK published by end of Week 2** (app shell with splash screen)
- Design system: tokens, base components, Bento Grid container
- Authentication (Google OAuth + JWT)
- Infrastructure as Code (Supabase CLI: database migrations, storage buckets, Edge Functions)

**Deliverable:** User can sign in with Google, see empty dashboard shell in Polish or English (auto-detected from device). Android Alpha build installable via Google Play for developer and invited testers.

### Phase 1: Core Tracking (Weeks 5–10)

- Onboarding questionnaire (all 7 steps with animations)
- Meal scanning pipeline (camera → AI → results → log)
- Clarification flow for low-confidence detections
- Meal CRUD (list, detail, edit, delete)
- Meal comments
- Manual meal entry fallback
- Dashboard with calorie ring + macro progress bars
- Basic meal history with photo gallery

**Deliverable:** User can complete onboarding, scan meals, view daily tracking dashboard. All features continuously deployed to Alpha testers via Google Play.

### Phase 2: Intelligence (Weeks 11–16)

- RAG pipeline setup (embedding generation, vector DB)
- AI chat assistant (streaming, contextual)
- Measurement tracking (weight + body measurements)
- Progress charts (weight trend, macro trends)
- Weekly report generation
- DQI-I scoring
- Nudge notification system

**Deliverable:** Full AI assistant operational; progress tracking live; intelligent notifications.

### Phase 3: Planning & Optimization (Weeks 17–22)

- MILP diet plan solver
- LLM recipe generation
- Diet plan UI (calendar, meal cards, recipe detail)
- Meal swapping in plans
- Shopping list generation
- Plan adherence tracking (scan → plan comparison)
- Ad-hoc real-time dietary adjustment suggestions

**Deliverable:** End-to-end diet plan creation, following, and deviation management.

### Phase 4: Ecosystem & Polish (Weeks 23–28)

- Apple HealthKit integration
- Google Health Connect integration
- Offline-first hardening (conflict resolution, queue management)
- Performance optimization (bundle size, animation tuning, memory profiling)
- Accessibility audit (WCAG 2.1 AA equivalent for mobile)
- Dark mode
- Full localization audit (verify 100% PL/EN coverage; no missing keys; string expansion QA)
- Security audit (penetration testing)
- E2E test suite completion
- **Promote Alpha → Open Testing (Beta)** for wider audience validation
- Incorporate Beta feedback; final stabilization
- App Store / Google Play production submission

**Deliverable:** Production-ready application submitted to app stores. Alpha → Beta → Production promotion completed.

### Phase 5: Post-Launch (Ongoing)

- User feedback analysis and iteration
- A/B testing framework for nudge strategies
- Barcode scanning for packaged foods
- CGM device integration (v2)
- Advanced analytics (correlation analysis, predictive insights)

---

## 21. Risk Register

| ID  | Risk                                             | Likelihood | Impact   | Mitigation                                                                                                   |
| --- | ------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| R01 | Vision model API outage                          | Medium     | High     | Multi-provider fallback (GPT-5.4 → Gemini 3.1 Pro → Claude Sonnet 4.6); graceful degradation to manual entry |
| R02 | AI meal estimation inaccuracy for complex dishes | High       | Medium   | Human-in-the-loop clarification; USDA cross-validation; continuous golden dataset expansion                  |
| R03 | High AI API costs at scale                       | High       | High     | Per-user quotas; smaller model routing for simple queries; caching; embedding batch processing               |
| R04 | Low user retention                               | Medium     | High     | Behavioral nudge system; streak mechanics; weekly value-delivery (reports); continuous UX optimization       |
| R05 | GDPR/data privacy violation                      | Low        | Critical | Privacy-by-design; DPO; regular audits; zero-data-retention agreements with AI providers                     |
| R06 | React Native New Architecture breaking changes   | Low        | Medium   | Pin specific RN version; E2E test suite; gradual upgrade strategy                                            |
| R07 | MILP solver timeout for complex plans            | Medium     | Medium   | Solver time limit (30s); fallback to heuristic plan generation; cache common plan templates                  |
| R08 | Vector DB scaling issues                         | Low        | Medium   | pgvector scales with Supabase Postgres instance; partitioned embeddings table prevents noisy neighbors       |
| R09 | App store rejection                              | Low        | Medium   | Follow Apple/Google guidelines; no medical claims; content review pre-submission                             |
| R10 | Competitor feature parity                        | Medium     | Medium   | Focus on AI quality and UX polish as differentiators; rapid iteration cycles                                 |

---

## Appendix A — Data Models

### A.1 Meal Scan Response (Pydantic)

```python
from pydantic import BaseModel, Field
from enum import Enum

class MacroBreakdown(BaseModel):
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    fiber_g: float = Field(ge=0)
    sugar_g: float = Field(ge=0)
    sodium_mg: float = Field(ge=0)

class ClarificationQuestion(BaseModel):
    ingredient_index: int
    question: str
    options: list[str] | None = None  # Pre-defined options if applicable

class IngredientAnalysis(BaseModel):
    name: str
    portion_g: float = Field(ge=0)
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    confidence: float = Field(ge=0.0, le=1.0)
    usda_fdc_id: int | None = None
    clarification_question: ClarificationQuestion | None = None

class NovaClass(int, Enum):
    UNPROCESSED = 1
    PROCESSED_CULINARY = 2
    PROCESSED = 3
    ULTRA_PROCESSED = 4

class MealScanResult(BaseModel):
    ingredients: list[IngredientAnalysis]
    total: MacroBreakdown
    overall_confidence: float = Field(ge=0.0, le=1.0)
    nova_classification: NovaClass
    clarification_needed: bool
    clarification_questions: list[ClarificationQuestion] = []
    model_used: str
    processing_time_ms: int
```

### A.2 User Profile (TypeScript — shared)

```typescript
interface UserProfile {
  userId: string;
  dateOfBirth: string | null; // ISO 8601 date
  biologicalSex: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  heightCm: number | null;
  activityLevel:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extra_active';
  goalType: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_nutrition';
  goalWeightKg: number | null;
  goalTimelineWeeks: number | null;
  dietaryRestrictions: string[];
  allergies: string[];
  cookingSkill: 'beginner' | 'intermediate' | 'advanced';
  cookingTimePref: 'quick' | 'moderate' | 'elaborate';
  cuisinePreferences: string[];
  locale: 'pl' | 'en'; // Detected from device; user-overridable in Settings

  // Computed
  tdeeKcal: number;
  targetKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;

  // Psychobehavioral
  psychProfile: {
    eatingTriggers: string[];
    snackingPattern: 'none' | 'occasional' | 'frequent';
    cfcScore: number; // Consideration of Future Consequences (1-7 scale)
    emotionalEatingScore: number; // 1-5 scale
  };

  notificationPrefs: {
    enabled: boolean;
    mealReminders: boolean;
    nudges: boolean;
    weeklyReport: boolean;
    quietHoursStart: string; // HH:mm
    quietHoursEnd: string; // HH:mm
  };

  onboardingCompletedAt: string | null;
}
```

### A.3 Chat Message with Rich Attachments (TypeScript)

```typescript
type ChatAttachment =
  | { type: 'recipe_card'; data: RecipeCardData }
  | { type: 'nutrient_badge'; data: NutrientBadgeData }
  | { type: 'meal_reference'; data: { mealId: string; thumbnail: string } }
  | { type: 'plan_preview'; data: { planId: string; summary: string } };

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: ChatAttachment[];
  createdAt: string;
}

interface RecipeCardData {
  name: string;
  prepTimeMin: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
  imageUrl?: string;
}

interface NutrientBadgeData {
  label: string;
  value: number;
  unit: string;
  percentDv: number;
  status: 'low' | 'adequate' | 'high' | 'excessive';
}
```

---

## Appendix B — API Contract Examples

### B.1 Meal Scan Request/Response

**Request:**

```http
POST /api/v1/meals/scan
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "image_base64": "/9j/4AAQSkZJRg...",
  "metadata": {
    "capture_timestamp": "2026-03-27T12:30:00Z",
    "timezone_offset": 60,
    "device_model": "iPhone 15 Pro"
  }
}
```

**Response (200 — High Confidence):**

```json
{
  "scan_id": "scan_abc123",
  "result": {
    "ingredients": [
      {
        "name": "Grilled Chicken Breast",
        "portion_g": 180,
        "calories": 297,
        "protein_g": 53.5,
        "carbs_g": 0,
        "fat_g": 6.5,
        "confidence": 0.92,
        "usda_fdc_id": 171077
      },
      {
        "name": "Brown Rice",
        "portion_g": 150,
        "calories": 166.5,
        "protein_g": 3.5,
        "carbs_g": 34.5,
        "fat_g": 1.3,
        "confidence": 0.88,
        "usda_fdc_id": 169704
      },
      {
        "name": "Steamed Broccoli",
        "portion_g": 100,
        "calories": 35,
        "protein_g": 2.4,
        "carbs_g": 7.2,
        "fat_g": 0.4,
        "confidence": 0.95,
        "usda_fdc_id": 170379
      }
    ],
    "total": {
      "calories": 498.5,
      "protein_g": 59.4,
      "carbs_g": 41.7,
      "fat_g": 8.2,
      "fiber_g": 5.1,
      "sugar_g": 1.8,
      "sodium_mg": 380
    },
    "overall_confidence": 0.91,
    "nova_classification": 1,
    "clarification_needed": false,
    "clarification_questions": [],
    "model_used": "gpt-5.4-2026-03-05",
    "processing_time_ms": 2340
  }
}
```

**Response (200 — Low Confidence, Clarification Needed):**

```json
{
  "scan_id": "scan_def456",
  "result": {
    "ingredients": [
      {
        "name": "Pasta (type uncertain)",
        "portion_g": 200,
        "calories": 262,
        "protein_g": 9.4,
        "carbs_g": 50.0,
        "fat_g": 1.6,
        "confidence": 0.55,
        "clarification_question": {
          "ingredient_index": 0,
          "question": "What type of pasta is this?",
          "options": ["Regular wheat pasta", "Whole wheat pasta", "Gluten-free pasta", "Egg pasta"]
        }
      },
      {
        "name": "Creamy sauce (base uncertain)",
        "portion_g": 80,
        "calories": 160,
        "protein_g": 2.0,
        "carbs_g": 4.0,
        "fat_g": 15.0,
        "confidence": 0.42,
        "clarification_question": {
          "ingredient_index": 1,
          "question": "The sauce looks creamy. What is it based on?",
          "options": ["Heavy cream", "Coconut cream", "Cashew cream", "Cheese sauce", "Other"]
        }
      }
    ],
    "total": {
      "calories": 422,
      "protein_g": 11.4,
      "carbs_g": 54.0,
      "fat_g": 16.6,
      "fiber_g": 2.5,
      "sugar_g": 3.0,
      "sodium_mg": 520
    },
    "overall_confidence": 0.48,
    "nova_classification": 3,
    "clarification_needed": true,
    "clarification_questions": [
      {
        "ingredient_index": 0,
        "question": "What type of pasta is this?",
        "options": ["Regular wheat pasta", "Whole wheat pasta", "Gluten-free pasta", "Egg pasta"]
      },
      {
        "ingredient_index": 1,
        "question": "The sauce looks creamy. What is it based on?",
        "options": ["Heavy cream", "Coconut cream", "Cashew cream", "Cheese sauce", "Other"]
      }
    ],
    "model_used": "gpt-5.4-2026-03-05",
    "processing_time_ms": 3120
  }
}
```

### B.2 Chat Message (SSE Streaming)

**Request:**

```http
POST /api/v1/chat/sessions/sess_xyz/messages
Authorization: Bearer eyJ...
Content-Type: application/json
Accept: text/event-stream

{
  "content": "Based on my last week, am I getting enough protein?"
}
```

**Response (SSE Stream):**

```
event: message_start
data: {"message_id": "msg_789", "role": "assistant"}

event: content_delta
data: {"delta": "Looking at your meals from the past 7 days, "}

event: content_delta
data: {"delta": "your average daily protein intake was **68g**, "}

event: content_delta
data: {"delta": "which is about **72% of your target of 95g**.\n\n"}

event: content_delta
data: {"delta": "Here are the days where you fell short:\n"}

event: content_delta
data: {"delta": "- **Monday**: 52g (55% of target)\n"}

event: content_delta
data: {"delta": "- **Wednesday**: 48g (51% of target)\n\n"}

event: content_delta
data: {"delta": "I noticed you tend to have lower protein on days "}

event: content_delta
data: {"delta": "when you skip breakfast. "}

event: attachment
data: {"type": "nutrient_badge", "data": {"label": "Avg. Daily Protein", "value": 68, "unit": "g", "percentDv": 72, "status": "low"}}

event: content_delta
data: {"delta": "\n\nWould you like me to suggest some high-protein breakfast ideas that are quick to prepare?"}

event: message_end
data: {"message_id": "msg_789", "tokens_used": 342, "model_used": "gpt-5.4"}
```

---

## Appendix C — References

1. Dietary Guidelines Advisory Committee. _Scientific Report of the 2025 Dietary Guidelines Advisory Committee._ USDA, 2024.
2. Stanford Medicine. _What the 2025–2030 Dietary Guidelines Get Right._ 2025.
3. USDA FoodData Central. https://fdc.nal.usda.gov/
4. PMC. _Personalized Nutrition in the Era of Digital Health._ 2025. PMC12474561.
5. PMC. _Making health habitual: the psychology of 'habit-formation'._ PMC3505409.
6. React Native. _About the New Architecture._ https://reactnative.dev/architecture/landing-page
7. PMC. _AI-driven personalized nutrition: RAG-based digital health solution._ PMC12054865.
8. PMC. _Improving Personalized Meal Planning with Large Language Models._ PMC12073434.
9. Google Research. _The anatomy of a personal health agent._ 2025.
10. dev.to. _From Pixels to Proteins: Real-Time AI Food Tracking using GPT-4o, Pydantic, and FastAPI._
11. PMC. _Artificial Intelligence in Nutrition and Dietetics: A Comprehensive Review._ PMC12563881.
12. MDPI. _Diet Quality and Caloric Accuracy in AI-Generated Diet Plans._ Nutrients 17(2):206.
13. PMC. _Personalized Flexible Meal Planning for Individuals With Diet-Related Health Concerns._ PMC10436119.
14. arXiv. _NutriGen: Personalized Meal Plan Generator Leveraging LLMs._ 2502.20601v1.
15. Medium. _Integrating Apple Health and Google Health Connect in Health & Fitness Apps._
16. Stan Vision. _Revolutionizing UI/UX with Bento UI grid design trend._ 2024.
17. Helius Work. _Top 10 Best React Native UI Libraries of 2025._
18. Dev.to. _Mastering UI Animations in React Native Using Reanimated._
19. React Native Reanimated Documentation. https://docs.swmansion.com/react-native-reanimated/
20. Redis. _Vector Database Use Cases: RAG, Search & More._

---

_This document is a living artifact. All architectural decisions should be recorded as ADRs (Architecture Decision Records) in `docs/architecture/` as the project evolves._

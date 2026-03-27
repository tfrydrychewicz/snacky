-- ==========================================================
-- Snacky — Development Seed Data
-- Run via: supabase db reset (automatically applies seed)
-- ==========================================================

-- Create test auth users in Supabase Auth
-- supabase db reset auto-creates these in auth.users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
    ('a1b2c3d4-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'jan@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"google","providers":["google"]}', '{"full_name":"Jan Kowalski","avatar_url":"https://i.pravatar.cc/150?u=jan"}', 'authenticated', 'authenticated'),
    ('a1b2c3d4-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'anna@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"google","providers":["google"]}', '{"full_name":"Anna Nowak","avatar_url":"https://i.pravatar.cc/150?u=anna"}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'email', '{"sub":"a1b2c3d4-0000-0000-0000-000000000001","email":"jan@example.com"}', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000002', 'email', '{"sub":"a1b2c3d4-0000-0000-0000-000000000002","email":"anna@example.com"}', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Public users
INSERT INTO users (id, google_id, email, display_name, avatar_url, last_login_at) VALUES
    ('a1b2c3d4-0000-0000-0000-000000000001', 'google-uid-jan-001', 'jan@example.com', 'Jan Kowalski', 'https://i.pravatar.cc/150?u=jan', NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000002', 'google-uid-anna-002', 'anna@example.com', 'Anna Nowak', 'https://i.pravatar.cc/150?u=anna', NOW());

-- User profiles
INSERT INTO user_profiles (
    user_id, date_of_birth, biological_sex, height_cm, activity_level,
    goal_type, goal_weight_kg, goal_timeline_weeks,
    dietary_restrictions, allergies,
    cooking_skill, cooking_time_pref, cuisine_preferences, locale,
    tdee_kcal, target_kcal, target_protein_g, target_carbs_g, target_fat_g,
    notification_prefs, onboarding_completed_at
) VALUES
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        '1990-05-15', 'male', 180.0, 'moderately_active',
        'maintain', 82.0, NULL,
        '{}', '{}',
        'intermediate', 'moderate', '{"polish","italian","asian"}', 'pl',
        2650, 2650, 160, 290, 88,
        '{"enabled": true, "meal_reminders": true, "weekly_report": true, "streak_alerts": true}',
        NOW()
    ),
    (
        'a1b2c3d4-0000-0000-0000-000000000002',
        '1995-08-22', 'female', 165.0, 'lightly_active',
        'lose_weight', 58.0, 12,
        '{"vegetarian"}', '{"nuts"}',
        'beginner', 'quick', '{"mediterranean","polish"}', 'pl',
        1850, 1550, 105, 170, 52,
        '{"enabled": true, "meal_reminders": true, "weekly_report": true, "streak_alerts": false}',
        NOW()
    );

-- Diet plan for Jan
INSERT INTO diet_plans (id, user_id, name, status, start_date, end_date, meals_per_day, config, target_kcal, target_macros) VALUES
    (
        'b1000000-0000-0000-0000-000000000001',
        'a1b2c3d4-0000-0000-0000-000000000001',
        'Balanced Week Plan',
        'active',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days',
        3,
        '{"cuisine_filter": ["polish","italian"], "max_prep_time_min": 45}',
        2650,
        '{"protein_g": 160, "carbs_g": 290, "fat_g": 88}'
    );

-- Some diet plan meals
INSERT INTO diet_plan_meals (diet_plan_id, day_number, meal_slot, recipe_name, prep_time_min, ingredients, calories, protein_g, carbs_g, fat_g, sort_order) VALUES
    ('b1000000-0000-0000-0000-000000000001', 1, 'breakfast', 'Owsianka z bananem i masłem orzechowym', 10,
     '[{"name":"oats","amount_g":80},{"name":"banana","amount_g":120},{"name":"peanut butter","amount_g":30},{"name":"milk","amount_g":200}]',
     520, 18, 72, 16, 0),
    ('b1000000-0000-0000-0000-000000000001', 1, 'lunch', 'Grillowany kurczak z ryżem i warzywami', 35,
     '[{"name":"chicken breast","amount_g":200},{"name":"brown rice","amount_g":100},{"name":"broccoli","amount_g":150},{"name":"olive oil","amount_g":15}]',
     680, 52, 65, 18, 1),
    ('b1000000-0000-0000-0000-000000000001', 1, 'dinner', 'Makaron pełnoziarnisty z sosem pomidorowym', 25,
     '[{"name":"whole wheat pasta","amount_g":120},{"name":"tomato sauce","amount_g":200},{"name":"ground turkey","amount_g":150},{"name":"parmesan","amount_g":20}]',
     620, 42, 68, 16, 2);

-- Meals for Jan (today and yesterday)
INSERT INTO meals (id, user_id, meal_type, logged_at, ai_analysis, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, total_sugar_g, source, nova_class) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'breakfast',
     NOW() - INTERVAL '1 day' + INTERVAL '8 hours',
     '{"ingredients":[{"name":"scrambled eggs","portion_g":200,"confidence":0.92},{"name":"whole wheat toast","portion_g":80,"confidence":0.95},{"name":"avocado","portion_g":60,"confidence":0.88}],"overall_confidence":0.91}',
     520, 28, 35, 32, 8, 2, 'scan', 1),

    ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'lunch',
     NOW() - INTERVAL '1 day' + INTERVAL '13 hours',
     '{"ingredients":[{"name":"chicken breast","portion_g":180,"confidence":0.94},{"name":"brown rice","portion_g":150,"confidence":0.90},{"name":"mixed salad","portion_g":100,"confidence":0.85}],"overall_confidence":0.89}',
     650, 48, 62, 14, 4, 3, 'scan', 1),

    ('c1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'breakfast',
     NOW() + INTERVAL '8 hours',
     '{"ingredients":[{"name":"oatmeal","portion_g":80,"confidence":0.96},{"name":"blueberries","portion_g":50,"confidence":0.92},{"name":"honey","portion_g":15,"confidence":0.88}],"overall_confidence":0.92}',
     380, 12, 65, 6, 5, 18, 'scan', 1);

-- Ingredients for the first meal
INSERT INTO meal_ingredients (meal_id, name, portion_g, calories, protein_g, carbs_g, fat_g, confidence, user_verified, sort_order) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'Scrambled eggs', 200, 296, 20, 3, 22, 0.92, true, 0),
    ('c1000000-0000-0000-0000-000000000001', 'Whole wheat toast', 80, 172, 6, 30, 2, 0.95, false, 1),
    ('c1000000-0000-0000-0000-000000000001', 'Avocado', 60, 96, 1.2, 5, 8.8, 0.88, false, 2);

-- Meal comment
INSERT INTO meal_comments (meal_id, user_id, content) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Added a bit of hot sauce, not tracked');

-- Measurements for Jan (last 4 weeks)
INSERT INTO measurements (user_id, measured_at, weight_kg, body_fat_pct, source) VALUES
    ('a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '28 days', 84.2, 18.5, 'manual'),
    ('a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '21 days', 83.8, 18.2, 'manual'),
    ('a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '14 days', 83.1, 17.8, 'manual'),
    ('a1b2c3d4-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days',  82.5, 17.5, 'manual'),
    ('a1b2c3d4-0000-0000-0000-000000000001', NOW(),                       82.0, 17.2, 'manual');

-- Chat session for Jan
INSERT INTO chat_sessions (id, user_id, last_message_at) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', NOW());

INSERT INTO chat_messages (session_id, role, content, model_used, tokens_used) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'user', 'Jakie jest dobre śniadanie białkowe?', NULL, NULL),
    ('d1000000-0000-0000-0000-000000000001', 'assistant',
     'Świetnym wyborem jest jajecznica z 3 jajek z pomidorami i szpinakiem, podana z pełnoziarnistym tostą. To daje ok. 35g białka i utrzyma Cię sytym do obiadu!',
     'gpt-5.4', 245);

-- Meals for Anna
INSERT INTO meals (user_id, meal_type, logged_at, ai_analysis, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, source, nova_class) VALUES
    ('a1b2c3d4-0000-0000-0000-000000000002', 'breakfast',
     NOW() + INTERVAL '7 hours',
     '{"ingredients":[{"name":"greek yogurt","portion_g":200,"confidence":0.95},{"name":"granola","portion_g":40,"confidence":0.90},{"name":"strawberries","portion_g":80,"confidence":0.93}],"overall_confidence":0.93}',
     320, 22, 42, 8, 3, 'scan', 1);

-- Notification log
INSERT INTO notification_log (user_id, type, title, body, data, delivered_at) VALUES
    ('a1b2c3d4-0000-0000-0000-000000000001', 'meal_reminder', 'Czas na obiad!', 'Nie zapomnij zalogować swojego posiłku.', '{"screen":"scanner"}', NOW()),
    ('a1b2c3d4-0000-0000-0000-000000000001', 'weekly_report', 'Twój tygodniowy raport', 'Świetny tydzień! Poprawiłeś swój wynik DQI-I o 5 punktów.', '{"screen":"progress"}', NOW());

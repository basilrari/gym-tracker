-- Seed muscle groups
INSERT INTO muscle_groups (id, name) VALUES
  (1, 'Chest'),
  (2, 'Back'),
  (3, 'Shoulders'),
  (4, 'Quads'),
  (5, 'Hamstrings'),
  (6, 'Calves'),
  (7, 'Biceps'),
  (8, 'Triceps'),
  (9, 'Abs'),
  (10, 'Forearms')
ON CONFLICT (id) DO NOTHING;

-- Reset sequences if needed
SELECT setval('muscle_groups_id_seq', (SELECT MAX(id) FROM muscle_groups));

-- Seed exercises (id, name, slug, primary_muscle_group_id, equipment)
INSERT INTO exercises (id, name, slug, primary_muscle_group_id, equipment, is_default) VALUES
  -- Chest
  (1, 'Pec Deck Fly', 'pec-deck-fly', 1, 'machine', true),
  (2, 'Flat DB Bench Press', 'flat-db-bench-press', 1, 'dumbbell', true),
  (3, 'Incline DB Press', 'incline-db-press', 1, 'dumbbell', true),
  (4, 'DB Pullover', 'db-pullover', 1, 'dumbbell', true),
  -- Triceps
  (5, 'Cable Pushdown', 'cable-pushdown', 8, 'cable', true),
  (6, 'Overhead Triceps Extension', 'overhead-triceps-extension', 8, 'cable', true),
  (7, 'Skull Crusher', 'skull-crusher', 8, 'barbell', true),
  (8, 'Extra Cable Extension', 'extra-cable-extension', 8, 'cable', true),
  -- Back
  (9, 'Straight-Arm Pulldown', 'straight-arm-pulldown', 2, 'cable', true),
  (10, 'Lat Pulldown', 'lat-pulldown', 2, 'cable', true),
  (11, 'Dependent Machine Row (P812)', 'dependent-machine-row-p812', 2, 'machine', true),
  (12, 'Optional Upper-back Row', 'optional-upper-back-row', 2, 'machine', true),
  -- Biceps
  (13, 'Bar/EZ-Bar Curl', 'bar-ez-bar-curl', 7, 'barbell', true),
  (14, 'Hammer Curl', 'hammer-curl', 7, 'dumbbell', true),
  (15, 'Incline DB Curl', 'incline-db-curl', 7, 'dumbbell', true),
  (16, 'Cable Curl', 'cable-curl', 7, 'cable', true),
  -- Shoulders
  (17, 'Shoulder Press', 'shoulder-press', 3, 'dumbbell', true),
  (18, 'Lateral Raise', 'lateral-raise', 3, 'dumbbell', true),
  (19, 'Rear Delt Fly', 'rear-delt-fly', 3, 'machine', true),
  -- Abs
  (20, 'Ab Crunch Machine', 'ab-crunch-machine', 9, 'machine', true),
  -- Forearms
  (21, 'Wrist Curl', 'wrist-curl', 10, 'barbell', true),
  (22, 'Reverse Wrist Curl', 'reverse-wrist-curl', 10, 'barbell', true),
  (23, 'Reverse Curl', 'reverse-curl', 10, 'barbell', true),
  -- Legs
  (24, 'Leg Extension', 'leg-extension', 4, 'machine', true),
  (25, 'Goblet Squat', 'goblet-squat', 4, 'dumbbell', true),
  (26, 'DB Lunges', 'db-lunges', 4, 'dumbbell', true),
  (27, 'Leg Curl', 'leg-curl', 5, 'machine', true),
  (28, 'Calf Raise', 'calf-raise', 6, 'machine', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('exercises_id_seq', (SELECT MAX(id) FROM exercises));

-- Day 1 – Chest + Triceps
INSERT INTO workout_templates (id, user_id, name, description, is_public) VALUES
  ('a0000001-0001-0001-0001-000000000001', NULL, 'Day 1 – Chest + Triceps', 'Chest and triceps focus', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, is_warmup) VALUES
  ('a0000001-0001-0001-0001-000000000001', 1, 0, 1, 12, 15, true),
  ('a0000001-0001-0001-0001-000000000001', 2, 1, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000001', 3, 2, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000001', 4, 3, 1, 10, 12, false),
  ('a0000001-0001-0001-0001-000000000001', 5, 4, 1, 10, 15, true),
  ('a0000001-0001-0001-0001-000000000001', 6, 5, 1, 10, 12, false),
  ('a0000001-0001-0001-0001-000000000001', 7, 6, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000001', 8, 7, 1, 10, 12, false);

-- Day 2 – Back + Biceps
INSERT INTO workout_templates (id, user_id, name, description, is_public) VALUES
  ('a0000001-0001-0001-0001-000000000002', NULL, 'Day 2 – Back + Biceps', 'Back and biceps focus', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, is_warmup) VALUES
  ('a0000001-0001-0001-0001-000000000002', 9, 0, 1, 12, 15, true),
  ('a0000001-0001-0001-0001-000000000002', 10, 1, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000002', 11, 2, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000002', 12, 3, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000002', 13, 4, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000002', 14, 5, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000002', 15, 6, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000002', 16, 7, 1, 10, 12, false);

-- Day 3 – Shoulders + Abs
INSERT INTO workout_templates (id, user_id, name, description, is_public) VALUES
  ('a0000001-0001-0001-0001-000000000003', NULL, 'Day 3 – Shoulders + Abs', 'Shoulders and abs focus', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, is_warmup) VALUES
  ('a0000001-0001-0001-0001-000000000003', 17, 0, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000003', 18, 1, 1, 10, 15, false),
  ('a0000001-0001-0001-0001-000000000003', 19, 2, 1, 10, 15, false),
  ('a0000001-0001-0001-0001-000000000003', 20, 3, 1, 12, 20, false);

-- Day 4 – Legs + Forearms
INSERT INTO workout_templates (id, user_id, name, description, is_public) VALUES
  ('a0000001-0001-0001-0001-000000000004', NULL, 'Day 4 – Legs + Forearms', 'Legs and forearms focus', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, is_warmup) VALUES
  ('a0000001-0001-0001-0001-000000000004', 24, 0, 1, 12, 15, true),
  ('a0000001-0001-0001-0001-000000000004', 25, 1, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000004', 26, 2, 1, 8, 12, false),
  ('a0000001-0001-0001-0001-000000000004', 27, 3, 1, 10, 12, false),
  ('a0000001-0001-0001-0001-000000000004', 28, 4, 1, 12, 20, false),
  ('a0000001-0001-0001-0001-000000000004', 21, 5, 1, 12, 15, false),
  ('a0000001-0001-0001-0001-000000000004', 22, 6, 1, 12, 15, false),
  ('a0000001-0001-0001-0001-000000000004', 23, 7, 1, 10, 12, false);

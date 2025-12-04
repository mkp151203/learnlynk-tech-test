-- LearnLynk Test Data
-- Run this in Supabase SQL Editor AFTER running schema.sql

-- Create a test tenant ID (use this same UUID throughout)
DO $$
DECLARE
  test_tenant_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  admin_user_id uuid := '11111111-1111-1111-1111-111111111111';
  counselor1_id uuid := '22222222-2222-2222-2222-222222222222';
  counselor2_id uuid := '33333333-3333-3333-3333-333333333333';
  team1_id uuid := '44444444-4444-4444-4444-444444444444';
  team2_id uuid := '55555555-5555-5555-5555-555555555555';
  lead1_id uuid;
  lead2_id uuid;
  lead3_id uuid;
  lead4_id uuid;
  app1_id uuid;
  app2_id uuid;
  app3_id uuid;
  app4_id uuid;
BEGIN

  -- Insert Users
  INSERT INTO users (id, tenant_id, role, email) VALUES
    (admin_user_id, test_tenant_id, 'admin', 'admin@learnlynk.com'),
    (counselor1_id, test_tenant_id, 'counselor', 'counselor1@learnlynk.com'),
    (counselor2_id, test_tenant_id, 'counselor', 'counselor2@learnlynk.com')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Teams
  INSERT INTO teams (id, tenant_id, name) VALUES
    (team1_id, test_tenant_id, 'Admissions Team'),
    (team2_id, test_tenant_id, 'Support Team')
  ON CONFLICT (id) DO NOTHING;

  -- Assign users to teams
  INSERT INTO user_teams (user_id, team_id) VALUES
    (counselor1_id, team1_id),
    (counselor2_id, team2_id),
    (counselor1_id, team2_id)  -- Counselor 1 is on both teams
  ON CONFLICT DO NOTHING;

  -- Insert Leads
  INSERT INTO leads (id, tenant_id, owner_id, email, phone, full_name, stage, source)
  VALUES 
    (gen_random_uuid(), test_tenant_id, counselor1_id, 'john.doe@example.com', '+1234567890', 'John Doe', 'new', 'website')
  RETURNING id INTO lead1_id;

  INSERT INTO leads (id, tenant_id, owner_id, email, phone, full_name, stage, source)
  VALUES 
    (gen_random_uuid(), test_tenant_id, counselor2_id, 'jane.smith@example.com', '+1987654321', 'Jane Smith', 'contacted', 'referral')
  RETURNING id INTO lead2_id;

  INSERT INTO leads (id, tenant_id, owner_id, email, phone, full_name, stage, source)
  VALUES 
    (gen_random_uuid(), test_tenant_id, counselor1_id, 'bob.wilson@example.com', '+1555123456', 'Bob Wilson', 'qualified', 'social_media')
  RETURNING id INTO lead3_id;

  INSERT INTO leads (id, tenant_id, owner_id, email, phone, full_name, stage, source)
  VALUES 
    (gen_random_uuid(), test_tenant_id, counselor2_id, 'alice.johnson@example.com', '+1555987654', 'Alice Johnson', 'new', 'website')
  RETURNING id INTO lead4_id;

  -- Assign some leads to teams
  INSERT INTO lead_teams (lead_id, team_id) VALUES
    (lead1_id, team1_id),
    (lead2_id, team2_id),
    (lead3_id, team1_id),
    (lead3_id, team2_id);  -- Lead 3 assigned to both teams

  -- Insert Applications
  INSERT INTO applications (id, tenant_id, lead_id, stage, status)
  VALUES (gen_random_uuid(), test_tenant_id, lead1_id, 'inquiry', 'open')
  RETURNING id INTO app1_id;

  INSERT INTO applications (id, tenant_id, lead_id, stage, status)
  VALUES (gen_random_uuid(), test_tenant_id, lead2_id, 'document_review', 'open')
  RETURNING id INTO app2_id;

  INSERT INTO applications (id, tenant_id, lead_id, stage, status)
  VALUES (gen_random_uuid(), test_tenant_id, lead3_id, 'interview', 'open')
  RETURNING id INTO app3_id;

  INSERT INTO applications (id, tenant_id, lead_id, stage, status)
  VALUES (gen_random_uuid(), test_tenant_id, lead4_id, 'inquiry', 'open')
  RETURNING id INTO app4_id;

  -- Insert Tasks (some due today, some in future, some completed)
  -- Tasks due TODAY
  INSERT INTO tasks (tenant_id, application_id, title, type, status, due_at) VALUES
    (test_tenant_id, app1_id, 'Initial call with John Doe', 'call', 'open', NOW()),
    (test_tenant_id, app2_id, 'Send document checklist to Jane', 'email', 'open', NOW() + interval '2 hours'),
    (test_tenant_id, app3_id, 'Review Bob application documents', 'review', 'open', NOW() + interval '4 hours');

  -- Tasks due TOMORROW
  INSERT INTO tasks (tenant_id, application_id, title, type, status, due_at) VALUES
    (test_tenant_id, app1_id, 'Follow-up email to John', 'email', 'open', NOW() + interval '1 day'),
    (test_tenant_id, app4_id, 'Call Alice for initial screening', 'call', 'open', NOW() + interval '1 day');

  -- Tasks due NEXT WEEK
  INSERT INTO tasks (tenant_id, application_id, title, type, status, due_at) VALUES
    (test_tenant_id, app2_id, 'Final review of Jane application', 'review', 'open', NOW() + interval '7 days'),
    (test_tenant_id, app3_id, 'Schedule interview with Bob', 'call', 'open', NOW() + interval '5 days');

  -- Completed tasks (set created_at in the past so due_at >= created_at constraint is satisfied)
  INSERT INTO tasks (tenant_id, application_id, title, type, status, due_at, created_at) VALUES
    (test_tenant_id, app1_id, 'Initial inquiry response', 'email', 'completed', NOW() - interval '2 days', NOW() - interval '3 days'),
    (test_tenant_id, app2_id, 'Verification call', 'call', 'completed', NOW() - interval '1 day', NOW() - interval '2 days');

  RAISE NOTICE 'Test data inserted successfully!';
  RAISE NOTICE 'Tenant ID: %', test_tenant_id;
  RAISE NOTICE 'Admin User ID: %', admin_user_id;
  RAISE NOTICE 'Counselor 1 ID: %', counselor1_id;
  RAISE NOTICE 'Counselor 2 ID: %', counselor2_id;

END $$;

-- Verify the data
SELECT 'Users' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'Teams', count(*) FROM teams
UNION ALL
SELECT 'User-Teams', count(*) FROM user_teams
UNION ALL
SELECT 'Leads', count(*) FROM leads
UNION ALL
SELECT 'Lead-Teams', count(*) FROM lead_teams
UNION ALL
SELECT 'Applications', count(*) FROM applications
UNION ALL
SELECT 'Tasks', count(*) FROM tasks;

-- Show tasks due today
SELECT 
  t.id,
  t.title,
  t.type,
  t.status,
  t.due_at,
  t.application_id
FROM tasks t
WHERE t.due_at::date = CURRENT_DATE
  AND t.status != 'completed'
ORDER BY t.due_at;

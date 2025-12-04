-- LearnLynk Tech Test - Task 2: RLS Policies on leads

alter table public.leads enable row level security;

-- Helper function to get JWT claims
-- JWT contains: user_id, role, tenant_id

-- SELECT policy: 
-- - Counselors can see leads they own OR leads assigned to teams they belong to
-- - Admins can see all leads in their tenant
create policy "leads_select_policy"
on public.leads
for select
using (
  -- Must be in same tenant
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
  AND (
    -- Admin: can see all leads in their tenant
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'admin')
    OR
    -- Counselor: can see leads they own
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'counselor'
     AND (
       owner_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
       OR
       -- Counselor: can see leads assigned to teams they belong to
       EXISTS (
         SELECT 1 
         FROM public.lead_teams lt
         INNER JOIN public.user_teams ut ON ut.team_id = lt.team_id
         WHERE lt.lead_id = leads.id
         AND ut.user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
       )
     )
    )
  )
);

-- INSERT policy:
-- - Counselors and admins can insert leads for their own tenant
create policy "leads_insert_policy"
on public.leads
for insert
with check (
  -- User must be admin or counselor
  (current_setting('request.jwt.claims', true)::jsonb->>'role' in ('admin', 'counselor'))
  AND
  -- Lead's tenant_id must match the user's tenant_id
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid
);

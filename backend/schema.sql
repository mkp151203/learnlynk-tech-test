-- LearnLynk Tech Test - Task 1: Schema
-- Fill in the definitions for leads, applications, tasks as per README.

create extension if not exists "pgcrypto";

-- Users table (assumed to exist per README)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  role text not null check (role in ('admin', 'counselor')),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teams table (assumed to exist per README)
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User-Teams junction table (assumed to exist per README)
create table if not exists public.user_teams (
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (user_id, team_id)
);

-- Lead-Teams junction table (for assigning leads to teams)
create table if not exists public.lead_teams (
  lead_id uuid not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (lead_id, team_id)
);

-- Leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  owner_id uuid not null,
  email text,
  phone text,
  full_name text,
  stage text not null default 'new',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for leads
create index if not exists idx_leads_tenant_id on public.leads(tenant_id);
create index if not exists idx_leads_owner_id on public.leads(owner_id);
create index if not exists idx_leads_stage on public.leads(stage);
create index if not exists idx_leads_created_at on public.leads(created_at);

-- Add FK constraint for lead_teams after leads table exists
alter table public.lead_teams 
  drop constraint if exists lead_teams_lead_id_fkey;
alter table public.lead_teams 
  add constraint lead_teams_lead_id_fkey 
  foreign key (lead_id) references public.leads(id) on delete cascade;


-- Applications table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  program_id uuid,
  intake_id uuid,
  stage text not null default 'inquiry',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for applications
create index if not exists idx_applications_tenant_id on public.applications(tenant_id);
create index if not exists idx_applications_lead_id on public.applications(lead_id);
create index if not exists idx_applications_stage on public.applications(stage);


-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  application_id uuid not null references public.applications(id) on delete cascade,
  title text,
  type text not null check (type in ('call', 'email', 'review')),
  status text not null default 'open',
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_due_at_after_created check (due_at >= created_at)
);

-- Indexes for tasks
create index if not exists idx_tasks_tenant_id on public.tasks(tenant_id);
create index if not exists idx_tasks_due_at on public.tasks(due_at);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_tenant_due_status on public.tasks(tenant_id, due_at, status);

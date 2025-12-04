# LearnLynk – Technical Assessment

## Tech Stack

- **Database**: Supabase Postgres
- **Backend**: Supabase Edge Functions (TypeScript/Deno)
- **Frontend**: Next.js + TypeScript

---

## Project Structure

```
backend/
├── schema.sql                    # Database schema (Task 1)
├── rls_policies.sql              # Row-Level Security policies (Task 2)
└── edge-functions/
    └── create-task/
        └── index.ts              # Edge Function API (Task 3)

frontend/
├── pages/
│   ├── index.tsx                 # Redirects to dashboard
│   └── dashboard/
│       └── today.tsx             # Today's tasks page (Task 4)
├── lib/
│   └── supabaseClient.ts         # Supabase client setup
├── package.json
└── .env.local                    # Environment variables (not committed)
```

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **API keys** from Settings → Data API

### 2. Set Up the Database

Run these SQL files in the Supabase SQL Editor (in order):

1. `backend/schema.sql` - Creates all tables with indexes and constraints
2. `backend/rls_policies.sql` - Enables Row-Level Security on leads

### 3. Configure the Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the Application

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## Implementation Summary

### Task 1: Database Schema

**File**: `backend/schema.sql`

Tables created:
- `users` - User accounts with roles (admin/counselor)
- `teams` - Teams within tenants
- `user_teams` - Junction table for user-team membership
- `lead_teams` - Junction table for lead-team assignment
- `leads` - Lead records with owner and stage tracking
- `applications` - Applications linked to leads
- `tasks` - Tasks linked to applications

Key constraints:
- `tasks.type` restricted to: `call`, `email`, `review`
- `tasks.due_at >= tasks.created_at` enforced
- Foreign keys with cascade delete
- Indexes on frequently queried columns

### Task 2: Row-Level Security

**File**: `backend/rls_policies.sql`

Policies implemented:
- **SELECT**: Admins see all tenant leads; Counselors see owned leads + team-assigned leads
- **INSERT**: Admins and counselors can insert leads for their tenant only

### Task 3: Edge Function

**File**: `backend/edge-functions/create-task/index.ts`

POST endpoint that:
- Validates `task_type` (call/email/review)
- Validates `due_at` is a future timestamp
- Fetches `tenant_id` from the application
- Inserts task and returns `{ success: true, task_id: "..." }`
- Returns 400 for validation errors, 500 for server errors

### Task 4: Frontend Dashboard

**File**: `frontend/pages/dashboard/today.tsx`

Features:
- Fetches tasks due today (status ≠ completed)
- Displays type, application_id, due_at, status in a table
- "Mark Complete" button updates task status

---

## Stripe Answer

To implement a Stripe Checkout flow for an application fee:

1. **Insert `payment_requests` row**: When a user initiates payment (e.g., clicks "Pay Application Fee"), insert a row with `application_id`, `amount`, `status: 'pending'`, and `created_at`.

2. **Create Stripe Checkout Session**: Call `stripe.checkout.sessions.create()` with the fee amount, success/cancel URLs, and include `payment_request_id` in the metadata. Store the returned `session_id` in the `payment_requests` row.

3. **Redirect user**: Send the user to `session.url` to complete payment on Stripe's hosted checkout page.

4. **Webhook handling**: Set up a webhook endpoint listening for `checkout.session.completed`. Verify the webhook signature using Stripe's signing secret to ensure authenticity.

5. **Process successful payment**: In the webhook handler, extract `payment_request_id` from session metadata, update `payment_requests.status` to `'completed'`, and store `payment_intent_id` for reference.

6. **Update application**: After confirming payment, update the `applications` table to reflect payment status (e.g., `payment_status: 'paid'`, `paid_at: now()`), potentially triggering the next stage in the application workflow.

7. **Handle failures**: For `checkout.session.expired` or failed payments, update `payment_requests.status` to `'failed'` and notify the user to retry.

# Task Pilot v2

Task Pilot is a React and Node app for turning tasks, real availability, and scheduling preferences into a practical 7-day plan.

## Stack

- React + Vite frontend
- Express API server
- Supabase Auth
- Supabase Postgres with row-level security
- Node test runner for scheduler tests

## Setup

Install dependencies:

```powershell
npm.cmd install
```

Create your local environment file:

```powershell
Copy-Item .env.example .env
```

Fill in these values from Supabase Project Settings > API:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8000
CLIENT_ORIGIN=http://localhost:5173
PORT=8000
```

Do not commit real `.env` files. Only `.env.example` should stay in Git.

In Supabase, run the SQL in `supabase/schema.sql`. It creates:

- `tasks`
- `availability_rules`
- `schedule_preferences`
- `schedule_runs`
- `schedule_blocks`

All tables have row-level security policies so authenticated users can only access their own data.

## Run Locally

Start the API server in one terminal:

```powershell
npm.cmd run server
```

Start the React app in another terminal:

```powershell
npm.cmd run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

## Test

Run scheduler tests:

```powershell
npm.cmd test
```

Build the frontend:

```powershell
npm.cmd run build
```

## Core Manual Flow

1. Sign up or log in.
2. Add sleep, work, unavailable, and preferred work rules.
3. Set schedule preferences: preferred hours, daily cap, buffer, horizon, overflow.
4. Add tasks with priority, duration, optional deadline, ASAP, fixed time, and splittable settings.
5. Generate a schedule.
6. Mark a task complete. Its future blocks are removed while the rest of the schedule stays in place.
7. Use the current task panel to extend an active block and reoptimize future work.

## Scheduler Behavior

The scheduler is intentionally deterministic for this version. It:

- blocks sleep, work, unavailable time, fixed tasks, and locked past work
- fills preferred work windows before overflow time
- avoids pushing no-deadline work to bedtime unless overflow is needed
- respects daily work caps and buffer minutes
- prioritizes deadline tasks, then ASAP tasks, then priority
- supports splittable tasks
- reports why tasks could not fit

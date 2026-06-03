# Task Pilot

Task Pilot is a React and Supabase planner that helps a user turn tasks, deadlines, sleep, and recurring busy time into a weekly schedule. The app supports task management, protected user data, schedule generation, schedule repair, dashboard alerts, and basic duration suggestions.

## Main Features

- Supabase email/password authentication
- Protected dashboard routes
- User-owned tasks with title, description, duration, deadline, priority, status, fixed time, and splittable settings
- Sleep schedule setup for weekday and weekend groups
- Recurring fixed blocks for classes, work, gym, or other busy time
- Weekly schedule generation that avoids sleep and recurring fixed blocks
- Heuristic schedule scoring across multiple strategies
- Splittable task scheduling for larger work sessions
- Automatic repair mode for overdue, incomplete, missed, or unscheduled work
- In-app notifications for overdue tasks, upcoming deadlines, unscheduled work, and the next scheduled block
- Scheduler scenario tests for realistic edge cases
- Local rule-based duration suggestions from task text

## Tech Stack

- React
- Vite
- React Router
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Node test runner

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

3. Add your Supabase values to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

These values come from Supabase Project Settings > API.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase.
3. Run the SQL in `supabase/schema.sql`.
4. Confirm that these tables exist:
   - `tasks`
   - `sleep_rules`
   - `fixed_events`
5. Confirm Row Level Security is enabled for all three tables.
6. In Authentication > Providers, make sure Email is enabled.
7. In Authentication > URL Configuration, add your local and deployed URLs if needed.

The schema uses `auth.users` for ownership and RLS policies so authenticated users can only access their own task, sleep, and fixed-event records.

## Run The App

Start the Vite development server:

```bash
npm run dev
```

Then open the local URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Tests

Run scheduler scenario tests:

```bash
npm test
```

The tests cover sleep blocks, recurring fixed events, deadline ordering, priority handling, splittable tasks, impossible schedules, completed tasks, and repair mode.

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

This is a Vite app, so deployment works on common static hosts such as Vercel, Netlify, or Supabase-connected static hosting. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values in the host's environment variable settings.

## Scheduling Logic

The scheduler builds a 7-day plan starting from the current day. It begins with full-day availability, subtracts sleep blocks, subtracts recurring fixed events, subtracts fixed-time tasks, and then places flexible tasks into the remaining free slots.

It tries multiple strategies, including deadline-first, priority-first, larger-tasks-first, and a balanced scoring approach. Each candidate schedule receives a score based on how much work fits, task priority, deadlines, and whether large splittable tasks are placed in reasonable chunks. The best scoring candidate becomes the displayed schedule.

Repair mode starts from an existing schedule and keeps future blocks that are still valid. It then reschedules overdue, incomplete, missed, or previously unscheduled tasks into the remaining available time. Completed tasks are not scheduled.

## Demo Script

Use this flow for a final presentation:

1. Sign up or log in with an email/password account.
2. Create a few tasks:
   - one high-priority task with a close deadline,
   - one larger splittable project,
   - one smaller normal task,
   - and one task that is difficult or impossible to fit.
3. Click `Suggest duration` on one task to show the local duration helper.
4. Add a sleep schedule so the planner avoids overnight hours.
5. Add recurring fixed blocks such as class or work.
6. Generate the schedule and point out:
   - selected strategy,
   - scheduled blocks,
   - unscheduled tasks,
   - and the dashboard summary.
7. Mark a task as in progress or create an overdue task, then use repair mode.
8. Show how the repaired schedule lists moved, added, removed, and locked blocks.
9. End by showing notifications for overdue tasks, upcoming deadlines, unscheduled work, and the next scheduled block.

## Final Setup Checklist

- `.env.local` has the correct Supabase URL and anon key.
- `supabase/schema.sql` has been run in the Supabase SQL editor.
- Email authentication is enabled in Supabase.
- RLS policies are active on all app tables.
- `npm test` passes.
- `npm run build` passes.
- Deployment host has the same Vite environment variables configured.
